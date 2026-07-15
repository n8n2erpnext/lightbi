import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { QueryCellValue } from '@lightbi/core-types';
import { ExecutionRunCoordinator } from '@lightbi/runtime';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Braces,
  Clock3,
  Code2,
  Columns,
  Copy,
  Database,
  Download,
  EyeOff,
  FileUp,
  FileSearch,
  FileSpreadsheet,
  History,
  Filter,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  StopCircle,
  Table2,
  ListTree,
  Pencil,
  Redo2,
  RotateCcw,
  Undo2,
  Unplug,
  X,
} from 'lucide-react';
import {
  cancelAdvancedRun,
  cancelAdvancedExportJob,
  cancelAdvancedImportJob,
  commitAdvancedMutation,
  closeAdvancedConnection,
  createAdvancedConnection,
  createAdvancedConnectionFromProfile,
  executeAdvancedQuery,
  executeAdvancedDocumentQuery,
  explainAdvancedQuery,
  downloadAdvancedExportJob,
  clearAdvancedHistory,
  deleteAdvancedFavorite,
  loadAdvancedFavorites,
  loadAdvancedHistory,
  loadAdvancedExportJob,
  loadAdvancedImportJob,
  loadAdvancedProviderPlugins,
  loadAdvancedProfiles,
  loadAdvancedSchema,
  loadAdvancedTableCount,
  previewAdvancedMutation,
  previewAdvancedScript,
  saveAdvancedFavorite,
  saveAdvancedHistory,
  saveAdvancedProfile,
  startAdvancedExport,
  startAdvancedCsvImport,
  startAdvancedSqlImport,
  type AdvancedConnection,
  type AdvancedConnectionProfile,
  type AdvancedFilter,
  type AdvancedFilterGroup,
  type AdvancedFilterOperator,
  type AdvancedFavorite,
  type AdvancedMutationPreview,
  type AdvancedMutationRequest,
  type AdvancedQueryResult,
  type AdvancedProviderId,
  type AdvancedProviderPlugin,
  type AdvancedSchema,
  type AdvancedScriptPreview,
  type AdvancedSort,
  type AdvancedTableNode,
} from '../lib/advanced-api';
import {
  ADVANCED_TABS_STORAGE_KEY,
  advancedResultToCsv,
  createAdvancedId,
  createAdvancedTab,
  serializeAdvancedTabs,
  splitAdvancedStatements,
  type AdvancedHistoryEntry,
} from '../lib/advanced-workspace';
import {
  CREATE_NEW_IMPORT_TARGET,
  analyzeSqlForAssistant,
  buildDeleteMutationRows,
  buildInsertMutationRows,
  buildRenamedResultSql,
  buildManualInsertMutationRows,
  compactCount,
  coerceInsertDraftValue,
  copyTextToClipboard,
  createBlankColumnDraft,
  createBlankStructureColumnDraft,
  defaultImportColumnMap,
  generateCreateTableSql,
  generateStructureSql,
  hydrateTab,
  importColumnSqlType,
  loadAdvancedWorkspaceTabs,
  materializeSqlParameters,
  mongoFilterValue,
  qualifiedTableReference,
  quoteIdentifier,
  quoteMysqlIdentifier,
  reconcileSqlParameters,
  resultRowsAsObjects,
  splitReferencedTable,
  sqlLiteral,
  structureDraftFromTable,
  type CreateColumnDraft,
  type CreateTableDraft,
  type FileTableImportDraft,
  type ImportDraft,
  type QuickCommand,
  type SqlAssistantBrief,
  type StructureColumnDraft,
  type StructureTableDraft,
  type WorkspaceTab,
} from '../lib/advanced-workspace-helpers';
import { AdvancedFileSession } from '../lib/advanced-file-session';
import {
  applyAdvancedEdits,
  buildAdvancedMutationRows,
  EMPTY_ADVANCED_EDIT_STATE,
  recordAdvancedCellEdit,
  redoAdvancedCellEdit,
  projectAdvancedColumns,
  undoAdvancedCellEdit,
} from '../lib/advanced-edit-session';
import { useAdvancedSourceStore, type AdvancedWorkspaceSource } from '../stores/advanced-source-store';
import { createInvestigationSession } from '../lib/investigation-session';
import { createAdvancedResultHandoff } from '../lib/advanced-result-handoff';
import { AdvancedConnectionGate } from '../components/advanced/AdvancedConnectionGate';
import { QueryPlanView, ResultChart, ResultJson, ResultStructure } from '../components/advanced/AdvancedResultViews';
import { FavoritesPanel, HistoryPanel, SchemaTree } from '../components/advanced/AdvancedSidePanels';
import { VirtualResultGrid, type GridForeignKeyAction } from '../components/advanced/VirtualResultGrid';

function loadTabs(): WorkspaceTab[] {
  return loadAdvancedWorkspaceTabs(localStorage.getItem(ADVANCED_TABS_STORAGE_KEY));
}

const FALLBACK_PROVIDER_PLUGINS: AdvancedProviderPlugin[] = [
  createFallbackProviderPlugin('postgresql', 'PostgreSQL'),
  createFallbackProviderPlugin('mysql', 'MySQL'),
  createFallbackProviderPlugin('mariadb', 'MariaDB'),
  createFallbackProviderPlugin('sqlite', 'SQLite'),
  createFallbackProviderPlugin('mongodb', 'MongoDB'),
];

function createFallbackProviderPlugin(id: AdvancedProviderId, displayName: string): AdvancedProviderPlugin {
  return {
    manifest: {
      apiVersion: 'lightbi.plugin.v1',
      id,
      displayName,
      version: '0.1.0',
      providerKind: id === 'mongodb' ? 'document' : 'relational',
      description: 'Fallback built-in provider manifest used when the backend plugin registry is unavailable.',
      defaultPort: id === 'postgresql' ? 5432 : id === 'mysql' || id === 'mariadb' ? 3306 : id === 'mongodb' ? 27017 : null,
      urlSchemes: [id],
      connectionFields: [],
      capabilities: {
        connect: true,
        schemaDiscovery: true,
        readOnlyQuery: true,
        cancellableQuery: true,
        streamingQuery: false,
        writeback: id !== 'mongodb',
        ddl: id !== 'mongodb',
        importRows: id !== 'mongodb',
        exportRows: true,
        explain: id !== 'mongodb',
        serverDashboard: false,
        semanticHints: false,
      },
    },
    exposureGate: { canExpose: true, missingCapabilities: [], warnings: ['Using frontend fallback provider manifest.'] },
    source: 'frontend_fallback',
  };
}

function providerDisplayName(providers: AdvancedProviderPlugin[], providerId: AdvancedProviderId): string {
  return providers.find(provider => provider.manifest.id === providerId)?.manifest.displayName
    ?? FALLBACK_PROVIDER_PLUGINS.find(provider => provider.manifest.id === providerId)?.manifest.displayName
    ?? providerId;
}

export const Advanced: React.FC = () => {
  const coordinators = useRef(new Map<string, ExecutionRunCoordinator>());
  const activeRunIds = useRef(new Map<string, string>());
  const fileSession = useRef(new AdvancedFileSession());
  const exportCancelRef = useRef(false);
  const exportJobIdRef = useRef<string | null>(null);
  const importJobIdRef = useRef<string | null>(null);
  const sqlFileInputRef = useRef<HTMLInputElement | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const sources = useAdvancedSourceStore(state => state.sources);
  const preferredSourceId = useAdvancedSourceStore(state => state.activeSourceId);
  const setPreferredSource = useAdvancedSourceStore(state => state.setActiveSource);
  const [connection, setConnection] = useState<AdvancedConnection | null>(null);
  const [fileSource, setFileSource] = useState<AdvancedWorkspaceSource | null>(null);
  const [schema, setSchema] = useState<AdvancedSchema | null>(null);
  const [connectionName, setConnectionName] = useState('Postgres');
  const [connectionUrl, setConnectionUrl] = useState('');
  const [connectionProvider, setConnectionProvider] = useState<AdvancedConnection['provider']>('postgresql');
  const [providerPlugins, setProviderPlugins] = useState<AdvancedProviderPlugin[]>(FALLBACK_PROVIDER_PLUGINS);
  const [databaseName, setDatabaseName] = useState('');
  const [profiles, setProfiles] = useState<AdvancedConnectionProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [saveProfile, setSaveProfile] = useState(false);
  const [tlsMode, setTlsMode] = useState('driver-default');
  const [sshHost, setSshHost] = useState('');
  const [sshUser, setSshUser] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [profileGroupName, setProfileGroupName] = useState('');
  const [profileTagName, setProfileTagName] = useState('');
  const [safeMode, setSafeMode] = useState<AdvancedConnectionProfile['safeMode']>('confirm_writes');
  const [connectionError, setConnectionError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [exactCounts, setExactCounts] = useState<Record<string, { status: 'loading' | 'ready' | 'failed'; count?: number }>>({});
  const [tabs, setTabs] = useState<WorkspaceTab[]>(loadTabs);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const [sideView, setSideView] = useState<'schema' | 'history' | 'favorites'>('schema');
  const [history, setHistory] = useState<AdvancedHistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<AdvancedFavorite[]>([]);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [mutationReview, setMutationReview] = useState<{ request: AdvancedMutationRequest; preview: AdvancedMutationPreview } | null>(null);
  const [scriptReview, setScriptReview] = useState<{ sql: string; preview: AdvancedScriptPreview } | null>(null);
  const [insertDraft, setInsertDraft] = useState<{ open: boolean; values: Record<string, string> }>({ open: false, values: {} });
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);
  const [sqlAssistant, setSqlAssistant] = useState<SqlAssistantBrief | null>(null);
  const [importDraft, setImportDraft] = useState<ImportDraft>({ open: false, sourceId: '', tableName: '', target: '', newSchemaName: 'public', newTableName: '', columnMap: {}, running: false, importedRows: 0, error: '' });
  const [fileImportDraft, setFileImportDraft] = useState<FileTableImportDraft>({ open: false, file: null, fileName: '', headers: [], schema: '', table: '', columnMap: {}, errorMode: 'stop_rollback', running: false, importedRows: 0, skippedRows: 0, error: '' });
  const [createTableDraft, setCreateTableDraft] = useState<CreateTableDraft>({ open: false, schemaName: 'public', tableName: '', columns: [createBlankColumnDraft()] });
  const [structureDraft, setStructureDraft] = useState<StructureTableDraft>({
    open: false, schemaName: 'public', originalTableName: '', tableName: '', columns: [],
    originalTableComment: '', tableComment: '', newIndexName: '', newIndexColumns: '', newIndexUnique: false, dropIndexName: '',
    newForeignKeyName: '', foreignKeyColumns: '', foreignKeyReferenceTable: '', foreignKeyReferenceColumns: '', dropForeignKeyName: '',
    triggerName: '', triggerSql: '',
  });
  const [isCommitting, setIsCommitting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ format: string; rows: number } | null>(null);
  const [importProgress, setImportProgress] = useState<{ executed: number; total: number } | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [renameColumnDraft, setRenameColumnDraft] = useState<{
    tabId: string;
    columnId: string;
    currentName: string;
    nextName: string;
  } | null>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
  const tabHasPendingChanges = (tab: WorkspaceTab): boolean => (
    Object.keys(tab.editState.changes).length > 0
    || tab.insertRowIndexes.length > 0
    || tab.insertRows.length > 0
    || tab.deletedRowIndexes.length > 0
  );
  const workspaceProvider = connection?.provider ?? (fileSource ? 'duckdb' : connectionProvider);
  const orderedSources = useMemo(() => [...sources].sort((left, right) => {
    if (left.id === preferredSourceId) return -1;
    if (right.id === preferredSourceId) return 1;
    return Date.parse(right.registeredAt) - Date.parse(left.registeredAt);
  }), [preferredSourceId, sources]);

  useEffect(() => {
    localStorage.setItem(ADVANCED_TABS_STORAGE_KEY, serializeAdvancedTabs(tabs));
  }, [tabs]);

  useEffect(() => {
    void Promise.all([loadAdvancedHistory(), loadAdvancedFavorites(), loadAdvancedProfiles()]).then(([historyRows, favoriteRows, profileRows]) => {
      setHistory(historyRows.map(row => ({
        id: row.id, sql: row.sql, database: row.database, executedAt: row.createdAt,
        executionMs: row.executionMs, rowCount: row.rowCount, successful: row.status === 'success',
      })));
      setFavorites(favoriteRows);
      setProfiles(profileRows);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAdvancedProviderPlugins(controller.signal)
      .then(providers => {
        if (providers.length > 0) setProviderPlugins(providers);
      })
      .catch(() => setProviderPlugins(FALLBACK_PROVIDER_PLUGINS));
    return () => controller.abort();
  }, []);

  useEffect(() => () => {
    coordinators.current.forEach(coordinator => coordinator.cancel());
    void fileSession.current.close();
  }, []);

  useEffect(() => {
    if (!connection) return;
    const closeSession = () => { void closeAdvancedConnection(connection.connectionId, true); };
    window.addEventListener('pagehide', closeSession);
    return () => window.removeEventListener('pagehide', closeSession);
  }, [connection]);

  useEffect(() => {
    const hasDirtyTab = tabs.some(tabHasPendingChanges);
    if (!hasDirtyTab) return undefined;
    const guardUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guardUnload);
    return () => window.removeEventListener('beforeunload', guardUnload);
  }, [tabs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const patchTab = (id: string, patch: Partial<WorkspaceTab> | ((tab: WorkspaceTab) => Partial<WorkspaceTab>)) => {
    setTabs(current => current.map(tab => tab.id === id ? { ...tab, ...(typeof patch === 'function' ? patch(tab) : patch) } : tab));
  };

  const coordinatorFor = (tabId: string) => {
    let coordinator = coordinators.current.get(tabId);
    if (!coordinator) {
      coordinator = new ExecutionRunCoordinator(`advanced-query:${tabId}`);
      coordinators.current.set(tabId, coordinator);
    }
    return coordinator;
  };

  const statusText = useMemo(() => {
    if (activeTab.isRunning) return 'Running query';
    if (!activeTab.result) return 'Ready';
    const from = activeTab.result.rows.length > 0 ? activeTab.result.page.offset + 1 : 0;
    const to = activeTab.result.page.offset + activeTab.result.rows.length;
    return `${from}-${to} rows · ${activeTab.result.executionMs} ms`;
  }, [activeTab]);
  const activeResult = useMemo(() => activeTab.result ? applyAdvancedEdits(activeTab.result, activeTab.editState) : null, [activeTab.editState, activeTab.result]);
  const activeDeletedRows = useMemo(() => new Set(activeTab.deletedRowIndexes), [activeTab.deletedRowIndexes]);
  const activeChangeCount = Object.keys(activeTab.editState.changes).length;
  const activeInsertCount = activeTab.insertRowIndexes.length + activeTab.insertRows.length;
  const activeDeleteCount = activeTab.deletedRowIndexes.length;
  const hasActivePendingChanges = tabHasPendingChanges(activeTab);
  const visibleResult = useMemo(() => activeResult ? projectAdvancedColumns(activeResult, activeTab.hiddenColumnIds) : null, [activeResult, activeTab.hiddenColumnIds]);
  const displayResult = useMemo(() => {
    if (!visibleResult) return null;
    const orderedIds = activeTab.columnOrder.filter(id => visibleResult.columns.some(column => column.id === id));
    const ids = [...orderedIds, ...visibleResult.columns.map(column => column.id).filter(id => !orderedIds.includes(id))];
    const indexes = ids.map(id => visibleResult.columns.findIndex(column => column.id === id)).filter(index => index >= 0);
    return {
      ...visibleResult,
      columns: indexes.map(index => visibleResult.columns[index]),
      rows: visibleResult.rows.map(row => indexes.map(index => row[index] ?? null)),
    };
  }, [activeTab.columnOrder, visibleResult]);
  const visibleEditedKeys = useMemo(() => {
    if (!activeResult || !displayResult) return new Set<string>();
    const keys = Object.values(activeTab.editState.changes).flatMap(edit => {
      const columnId = activeResult.columns[edit.columnIndex]?.id;
      const visibleIndex = displayResult.columns.findIndex(column => column.id === columnId);
      return visibleIndex >= 0 ? [`${edit.rowIndex}:${visibleIndex}`] : [];
    });
    return new Set(keys);
  }, [activeResult, activeTab.editState.changes, displayResult]);
  const activeTableNode = useMemo(() => activeTab.tableContext
    ? schema?.schemas.find(item => item.name === activeTab.tableContext!.schema)?.tables.find(item => item.name === activeTab.tableContext!.table)
    : undefined, [activeTab.tableContext, schema]);
  const writableTables = useMemo(() => schema?.schemas.flatMap(schemaNode => schemaNode.tables
    .filter(table => table.kind === 'base_table' && table.writable && table.columns.some(column => column.primaryKey))
    .map(table => ({ schemaName: schemaNode.name, table }))) ?? [], [schema]);
  const canCommitActive = Boolean(
    connection
    && ['sqlite', 'postgresql', 'mysql', 'mariadb'].includes(connection.provider)
    && activeTableNode?.writable === true
    && activeTableNode.columns.some(column => column.primaryKey)
  );

  const connect = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConnectionError('');
    setIsConnecting(true);
    try {
      const profile = profiles.find(item => item.id === selectedProfileId);
      const nextConnection = profile
        ? await createAdvancedConnectionFromProfile(connectionName, profile)
        : await createAdvancedConnection(connectionName, connectionUrl, connectionProvider, databaseName, {
          tlsMode,
          sshHost: sshHost || undefined,
          sshPort: sshHost ? sshPort : undefined,
          sshUser: sshUser || undefined,
          safeMode,
        });
      if (!profile && saveProfile) {
        const saved = await saveAdvancedProfile({
          name: connectionName, provider: connectionProvider, database: databaseName, connectionUrl, tlsMode,
          sshHost: sshHost || undefined, sshPort: sshHost ? sshPort : undefined, sshUser: sshUser || undefined,
          groupName: profileGroupName || undefined, tagName: profileTagName || undefined, safeMode,
        });
        setProfiles(current => [saved, ...current]);
      }
      setConnection(nextConnection);
      setConnectionUrl('');
      const nextSchema = await loadAdvancedSchema(nextConnection.connectionId);
      setSchema(nextSchema);
      if (activeTab.title.startsWith('Query ') && !activeTab.result) {
        const defaultSql = nextConnection.provider === 'mongodb'
          ? JSON.stringify({ collection: nextSchema.schemas[0]?.tables[0]?.name || '', filter: {}, projection: {}, sort: {} }, null, 2)
          : nextConnection.provider === 'sqlite'
            ? 'SELECT sqlite_version() AS sqlite_version'
            : nextConnection.provider === 'mysql' || nextConnection.provider === 'mariadb'
              ? 'SELECT DATABASE() AS database_name, CURRENT_USER() AS user_name, NOW() AS server_time'
              : 'SELECT current_database() AS database, current_user AS user_name, now() AS server_time';
        patchTab(activeTab.id, { sql: defaultSql, plan: null, result: null, filters: [], parameters: {} });
      }
    } catch (cause) {
      setConnectionError(cause instanceof Error ? cause.message : 'Could not open database session.');
    } finally {
      setIsConnecting(false);
    }
  };

  const openFileSource = async (source: AdvancedWorkspaceSource) => {
    setConnectionError('');
    setIsConnecting(true);
    try {
      await fileSession.current.open(source);
      setFileSource(source);
      setPreferredSource(source.id);
      setSchema({
        connectionId: source.id, connectionName: source.name, database: 'DuckDB session', cached: false, cacheAgeMs: 0,
        schemas: [{ name: 'workspace', tables: source.tables.map(table => ({
          name: table.name, kind: 'base_table', estimatedRows: table.rowCount,
          writable: false,
          columns: table.columns.map(column => ({ name: column, nativeType: table.profiles[column]?.dataType || 'unknown', nullable: (table.profiles[column]?.nullPercent || 0) > 0 })),
        })) }],
      });
      const firstTable = source.tables[0];
      if (firstTable) patchTab(activeTab.id, { title: firstTable.name, sql: `SELECT *\nFROM ${quoteIdentifier(firstTable.name)}`, result: null, plan: null, filters: [], offset: 0, tableContext: undefined, parameters: {} });
    } catch (cause) {
      setConnectionError(cause instanceof Error ? cause.message : 'Could not open file workspace.');
    } finally {
      setIsConnecting(false);
    }
  };

  const refreshSchema = async () => {
    if (fileSource) return;
    if (!connection) return;
    setConnectionError('');
    try {
      setSchema(await loadAdvancedSchema(connection.connectionId, undefined, true));
      setExactCounts({});
    } catch (cause) {
      setConnectionError(cause instanceof Error ? cause.message : 'Could not refresh schema.');
    }
  };

  const requestExactCount = async (schemaName: string, table: AdvancedTableNode) => {
    if (fileSource) {
      const sourceTable = fileSource.tables.find(item => item.name === table.name);
      if (sourceTable) setExactCounts(current => ({ ...current, [`${schemaName}.${table.name}`]: { status: 'ready', count: sourceTable.rowCount } }));
      return;
    }
    if (!connection || (table.kind !== 'base_table' && table.kind !== 'collection')) return;
    const key = `${schemaName}.${table.name}`;
    if (exactCounts[key]?.status === 'loading' || exactCounts[key]?.status === 'ready') return;
    setExactCounts(current => ({ ...current, [key]: { status: 'loading' } }));
    try {
      const response = await loadAdvancedTableCount(connection.connectionId, schemaName, table.name);
      setExactCounts(current => ({ ...current, [key]: { status: 'ready', count: response.exactRows } }));
    } catch {
      setExactCounts(current => ({ ...current, [key]: { status: 'failed' } }));
    }
  };

  const recordHistory = (entry: Omit<AdvancedHistoryEntry, 'id' | 'executedAt' | 'database'>) => {
    if (!connection && !fileSource) return;
    void saveAdvancedHistory({
      connectionName: connection?.name ?? fileSource!.name, database: connection?.database ?? 'DuckDB session', provider: workspaceProvider,
      sql: entry.sql, status: entry.successful ? 'success' : 'failed', rowCount: entry.rowCount, executionMs: entry.executionMs,
    }).then(saved => setHistory(current => [{
      id: saved.id, sql: saved.sql, database: saved.database, executedAt: saved.createdAt,
      executionMs: saved.executionMs, rowCount: saved.rowCount, successful: saved.status === 'success', error: entry.error,
    }, ...current].slice(0, 200))).catch(() => undefined);
  };

  const addFavorite = () => {
    if ((!connection && !fileSource) || !activeTab.sql.trim()) return;
    const name = activeTab.title.trim() || 'Saved query';
    void saveAdvancedFavorite({ name, sql: activeTab.sql, provider: workspaceProvider, database: connection?.database ?? fileSource!.name })
      .then(saved => { setFavorites(current => [saved, ...current]); setSideView('favorites'); })
      .catch(cause => patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Could not save favorite.' }));
  };

  const runQuery = async (tabId = activeTab.id, options?: { offset?: number; sort?: AdvancedSort; filters?: AdvancedFilter[]; sql?: string }) => {
    if (!connection && !fileSource) return;
    const tab = tabs.find(candidate => candidate.id === tabId);
    const sql = options?.sql ?? tab?.sql ?? '';
    if (!tab || !sql.trim()) return;
    const executableSql = materializeSqlParameters(sql, tab.parameters);
    if (Object.keys(tab.editState.changes).length > 0 || tab.insertRowIndexes.length > 0 || tab.insertRows.length > 0 || tab.deletedRowIndexes.length > 0) {
      patchTab(tabId, { warnings: ['Export or discard pending result edits before rerunning, sorting, filtering, or paging.'] });
      return;
    }
    const offset = options?.offset ?? tab.offset;
    const sort = options && 'sort' in options ? options.sort : tab.sort;
    const filters = options && 'filters' in options ? options.filters ?? [] : tab.filters;
    const filterTree: AdvancedFilterGroup | undefined = filters.length
      ? { combinator: tab.filterCombinator, children: filters }
      : undefined;
    const coordinator = coordinatorFor(tabId);
    const run = coordinator.begin();
    activeRunIds.current.set(tabId, run.id);
    patchTab(tabId, { sql, isRunning: true, error: '', warnings: [], offset, sort, filters, parameters: reconcileSqlParameters(sql, tab.parameters) });
    try {
      const nextResult = fileSource
        ? await fileSession.current.execute({ runId: run.id, sql: executableSql, limit: tab.limit, offset, sort, filters, filterTree, signal: run.signal })
        : connection!.provider === 'mongodb'
          ? await executeAdvancedDocumentQuery(connection!.connectionId, { ...JSON.parse(tab.sql), runId: run.id, limit: tab.limit, offset }, run.signal)
          : await executeAdvancedQuery(connection!.connectionId, { runId: run.id, sql: executableSql, limit: tab.limit, offset, sort, filters, filterTree }, run.signal);
      if (!coordinator.isCurrent(run)) return;
      patchTab(tabId, {
        result: nextResult,
        warnings: nextResult.warnings,
        isRunning: false,
        offset: nextResult.page.offset,
        filterColumn: tab.filterColumn || nextResult.columns[0]?.name || '',
        editMode: false,
        editState: EMPTY_ADVANCED_EDIT_STATE,
        insertRowIndexes: [],
        insertRows: [],
        deletedRowIndexes: [],
        hiddenColumnIds: [],
        columnOrder: [],
      });
      recordHistory({ sql, executionMs: nextResult.executionMs, rowCount: nextResult.rows.length, successful: true });
      coordinator.finish(run);
      activeRunIds.current.delete(tabId);
    } catch (cause) {
      if (run.signal.aborted) return;
      if (coordinator.isCurrent(run)) {
        const message = cause instanceof Error ? cause.message : 'Query failed.';
        patchTab(tabId, { error: message, isRunning: false });
        recordHistory({ sql, executionMs: 0, rowCount: 0, successful: false, error: message });
        coordinator.finish(run);
        activeRunIds.current.delete(tabId);
      }
    }
  };

  const cancelQuery = async (tabId = activeTab.id) => {
    const runId = activeRunIds.current.get(tabId);
    coordinatorFor(tabId).cancel();
    activeRunIds.current.delete(tabId);
    patchTab(tabId, { isRunning: false });
    if (runId) await cancelAdvancedRun(runId).catch(() => undefined);
  };

  const explainQuery = async () => {
    if (!connection || connection.provider !== 'postgresql' || !activeTab.sql.trim()) return;
    patchTab(activeTab.id, { isRunning: true, error: '' });
    try {
      const explained = await explainAdvancedQuery(connection.connectionId, materializeSqlParameters(activeTab.sql, activeTab.parameters));
      patchTab(activeTab.id, { plan: explained.plan, resultView: 'plan', isRunning: false });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Explain failed.', isRunning: false });
    }
  };

  const openSqlAssistant = () => {
    if (!activeTab.sql.trim()) return;
    setSqlAssistant(analyzeSqlForAssistant(activeTab.sql, workspaceProvider));
  };

  const openImportDraft = () => {
    const source = sources.find(item => item.id === preferredSourceId) ?? sources[0];
    const sourceTable = source?.tables[0];
    const target = activeTab.tableContext && canCommitActive
      ? `${activeTab.tableContext.schema}.${activeTab.tableContext.table}`
      : writableTables[0] ? `${writableTables[0].schemaName}.${writableTables[0].table.name}` : CREATE_NEW_IMPORT_TARGET;
    const [schemaName, tableName] = target.split('.');
    const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table;
    setImportDraft({
      open: true,
      sourceId: source?.id ?? '',
      tableName: sourceTable?.name ?? '',
      target,
      newSchemaName: schema?.schemas[0]?.name ?? 'public',
      newTableName: sourceTable?.name ? sourceTable.name.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '').toLocaleLowerCase() || 'imported_table' : 'imported_table',
      columnMap: sourceTable && targetTable ? defaultImportColumnMap(sourceTable.columns, targetTable.columns) : {},
      running: false,
      importedRows: 0,
      error: '',
    });
  };

  const openCreateTableDraft = () => {
    const schemaName = activeTab.tableContext?.schema ?? schema?.schemas[0]?.name ?? 'public';
    setCreateTableDraft({ open: true, schemaName, tableName: '', columns: [createBlankColumnDraft()] });
  };

  const openCreateTableSql = () => {
    const sql = generateCreateTableSql(createTableDraft, workspaceProvider);
    addTab({ title: createTableDraft.tableName || 'Create table', sql, limit: activeTab.limit, parameters: {} });
    setCreateTableDraft(current => ({ ...current, open: false }));
  };

  const openStructureDraft = () => {
    if (!activeTab.tableContext || !activeTableNode) return;
    setStructureDraft(structureDraftFromTable(activeTab.tableContext.schema, activeTableNode));
  };

  const openStructureSql = () => {
    const sql = generateStructureSql(structureDraft, workspaceProvider);
    addTab({ title: `${structureDraft.tableName || structureDraft.originalTableName} structure`, sql, limit: activeTab.limit, parameters: {}, tableContext: { schema: structureDraft.schemaName, table: structureDraft.tableName || structureDraft.originalTableName } });
    setStructureDraft(current => ({ ...current, open: false }));
  };

  const importSourceIntoTable = async () => {
    if (!connection || connection.provider === 'mongodb') return;
    const source = sources.find(item => item.id === importDraft.sourceId);
    const sourceTable = source?.tables.find(table => table.name === importDraft.tableName);
    if (importDraft.target === CREATE_NEW_IMPORT_TARGET) {
      if (!source || !sourceTable || !importDraft.newTableName.trim()) {
        setImportDraft(current => ({ ...current, error: 'Choose a source table and new target table name.' }));
        return;
      }
      setImportDraft(current => ({ ...current, running: true, importedRows: 0, error: '' }));
      try {
        await fileSession.current.open(source);
        const targetRef = qualifiedTableReference(workspaceProvider, importDraft.newSchemaName || 'public', importDraft.newTableName.trim());
        const columns = sourceTable.columns;
        const createSql = `CREATE TABLE ${targetRef} (\n${columns.map(column => `  ${workspaceProvider === 'mysql' || workspaceProvider === 'mariadb' ? quoteMysqlIdentifier(column) : quoteIdentifier(column)} ${importColumnSqlType(sourceTable.profiles[column]?.dataType)}`).join(',\n')}\n);`;
        const insertColumns = columns.map(column => workspaceProvider === 'mysql' || workspaceProvider === 'mariadb' ? quoteMysqlIdentifier(column) : quoteIdentifier(column)).join(', ');
        const statements: string[] = [createSql];
        let offset = 0;
        let importedRows = 0;
        for (let batch = 0; batch < 1000; batch += 1) {
          const page = await fileSession.current.execute({ runId: createAdvancedId(), sql: `SELECT * FROM ${quoteIdentifier(sourceTable.name)}`, limit: 100, offset });
          if (page.rows.length === 0) break;
          const columnIndex = new Map(page.columns.map((column, index) => [column.name, index]));
          statements.push(...page.rows.map(row => `INSERT INTO ${targetRef} (${insertColumns}) VALUES (${columns.map(column => sqlLiteral(row[columnIndex.get(column)!] ?? null)).join(', ')});`));
          importedRows += page.rows.length;
          setImportDraft(current => ({ ...current, importedRows }));
          if (!page.page.hasMore) break;
          offset += page.rows.length;
        }
        addTab({ title: `${importDraft.newTableName.trim()} import`, sql: statements.join('\n'), limit: activeTab.limit, parameters: {} });
        setImportDraft(current => ({ ...current, running: false, open: false, error: '' }));
      } catch (cause) {
        setImportDraft(current => ({ ...current, running: false, error: cause instanceof Error ? cause.message : 'Import script failed.' }));
      }
      return;
    }
    const [schemaName, tableName] = importDraft.target.split('.');
    const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table;
    if (!source || !sourceTable || !targetTable) {
      setImportDraft(current => ({ ...current, error: 'Choose a source table and writable DB target.' }));
      return;
    }
    const mappedColumns = targetTable.columns
      .filter(column => !column.primaryKey)
      .flatMap(column => {
        const sourceColumn = importDraft.columnMap[column.name];
        return sourceColumn && sourceTable.columns.includes(sourceColumn) ? [{ target: column.name, source: sourceColumn }] : [];
      });
    if (mappedColumns.length === 0) {
      setImportDraft(current => ({ ...current, error: 'Map at least one source column to a target column.' }));
      return;
    }
    setImportDraft(current => ({ ...current, running: true, importedRows: 0, error: '' }));
    try {
      await fileSession.current.open(source);
      let offset = 0;
      let importedRows = 0;
      for (let batch = 0; batch < 1000; batch += 1) {
        const page = await fileSession.current.execute({ runId: createAdvancedId(), sql: `SELECT * FROM ${quoteIdentifier(sourceTable.name)}`, limit: 100, offset });
        if (page.rows.length === 0) break;
        const columnIndex = new Map(page.columns.map((column, index) => [column.name, index]));
        await commitAdvancedMutation(connection.connectionId, {
          schema: schemaName,
          table: tableName,
          rows: page.rows.map(row => ({
            action: 'insert',
            key: {},
            expected: {},
            changes: Object.fromEntries(mappedColumns.map(column => [column.target, row[columnIndex.get(column.source)!] ?? null])),
          })),
        });
        importedRows += page.rows.length;
        setImportDraft(current => ({ ...current, importedRows }));
        if (!page.page.hasMore) break;
        offset += page.rows.length;
      }
      setImportDraft(current => ({ ...current, running: false, error: '' }));
      patchTab(activeTab.id, { warnings: [`Imported ${importedRows.toLocaleString('en')} rows into ${schemaName}.${tableName}.`] });
      await refreshSchema();
    } catch (cause) {
      setImportDraft(current => ({ ...current, running: false, error: cause instanceof Error ? cause.message : 'Import failed.' }));
    }
  };

  const runAllStatements = async () => {
    if ((!connection && !fileSource) || connection?.provider === 'mongodb') return;
    const statements = splitAdvancedStatements(materializeSqlParameters(activeTab.sql, activeTab.parameters));
    if (statements.length <= 1) { void runQuery(); return; }
    patchTab(activeTab.id, { isRunning: true, error: '' });
    const completed: WorkspaceTab[] = [];
    for (const [index, sql] of statements.entries()) {
      const tab = hydrateTab(createAdvancedTab(tabs.length + index + 1, { title: `Result ${index + 1}`, sql, limit: activeTab.limit }));
      try {
        tab.result = fileSource
          ? await fileSession.current.execute({ runId: createAdvancedId(), sql, limit: tab.limit })
          : await executeAdvancedQuery(connection!.connectionId, { runId: createAdvancedId(), sql, limit: tab.limit });
        tab.filterColumn = tab.result.columns[0]?.name || '';
        recordHistory({ sql, executionMs: tab.result.executionMs, rowCount: tab.result.rows.length, successful: true });
      } catch (cause) {
        tab.error = cause instanceof Error ? cause.message : 'Query failed.';
        recordHistory({ sql, executionMs: 0, rowCount: 0, successful: false, error: tab.error });
      }
      completed.push(tab);
    }
    patchTab(activeTab.id, { isRunning: false });
    setTabs(current => [...current, ...completed].slice(0, 12));
    if (completed.length) setActiveTabId(completed[completed.length - 1].id);
  };

  const downloadBlob = (name: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const cancelFullExport = () => {
    exportCancelRef.current = true;
    if (exportJobIdRef.current) void cancelAdvancedExportJob(exportJobIdRef.current);
  };

  const cancelSqlImport = () => {
    if (importJobIdRef.current) void cancelAdvancedImportJob(importJobIdRef.current);
  };

  const exportResult = (format: 'csv' | 'xlsx' | 'json' | 'sql' = 'csv') => {
    if (!displayResult) return;
    const baseName = activeTab.title.replace(/[^a-z0-9_-]+/gi, '_') || 'lightbi-result';
    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(resultRowsAsObjects(displayResult));
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Result');
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      downloadBlob(`${baseName}.xlsx`, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      return;
    }
    if (format === 'json') {
      downloadBlob(`${baseName}.json`, new Blob([JSON.stringify(resultRowsAsObjects(displayResult), null, 2)], { type: 'application/json;charset=utf-8' }));
      return;
    }
    if (format === 'sql') {
      const tableName = quoteIdentifier(activeTab.tableContext?.table || baseName);
      const columns = displayResult.columns.map(column => quoteIdentifier(column.name)).join(', ');
      const statements = displayResult.rows.map(row => `INSERT INTO ${tableName} (${columns}) VALUES (${row.map(sqlLiteral).join(', ')});`).join('\n');
      downloadBlob(`${baseName}.sql`, new Blob([statements], { type: 'application/sql;charset=utf-8' }));
      return;
    }
    downloadBlob(`${baseName}.csv`, new Blob([advancedResultToCsv(displayResult.columns, displayResult.rows)], { type: 'text/csv;charset=utf-8' }));
  };

  const analyzeActiveResultInSimple = () => {
    if (!displayResult) return;
    if (displayResult.rows.length === 0) {
      patchTab(activeTab.id, { warnings: ['Run a query with rows before creating a Simple BA brief.'] });
      return;
    }

    const handoff = createAdvancedResultHandoff({
      datasetId: `advanced:${activeTab.title}`,
      title: activeTab.title,
      provider: workspaceProvider,
      sql: materializeSqlParameters(activeTab.sql, activeTab.parameters),
      configuration: {
        resultView: activeTab.resultView,
        visibleColumns: displayResult.columns.map(column => column.name),
        filters: activeTab.filters.map(filter => ({ ...filter })),
        filterCombinator: activeTab.filterCombinator,
        sort: activeTab.sort ? { ...activeTab.sort } : null,
        tableContext: activeTab.tableContext ? { ...activeTab.tableContext } : null,
      },
    }, displayResult);
    createInvestigationSession(
      handoff.datasetId,
      handoff.analysisAction,
      handoff.runtimeIntent,
      handoff.runtimePlanPreview,
      handoff.rows,
      handoff.aiBriefing,
      undefined,
      handoff.rowScope,
      undefined,
      undefined,
      handoff.canonicalHandoff
    );
    window.history.pushState(null, '', '/investigation');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const fetchQueryPage = async (tab: WorkspaceTab, offset: number, limit: number, runId: string): Promise<AdvancedQueryResult> => {
    const filters = tab.filters;
    const filterTree: AdvancedFilterGroup | undefined = filters.length ? { combinator: tab.filterCombinator, children: filters } : undefined;
    const executableSql = materializeSqlParameters(tab.sql, tab.parameters);
    if (fileSource) return fileSession.current.execute({ runId, sql: executableSql, limit, offset, sort: tab.sort, filters, filterTree });
    if (!connection) throw new Error('No active connection.');
    if (connection.provider === 'mongodb') return executeAdvancedDocumentQuery(connection.connectionId, { ...JSON.parse(tab.sql), runId, limit, offset });
    return executeAdvancedQuery(connection.connectionId, { runId, sql: executableSql, limit, offset, sort: tab.sort, filters, filterTree });
  };

  const exportAllResult = async (format: 'csv' | 'xlsx' | 'json' | 'sql' = 'csv') => {
    if ((!connection && !fileSource) || !activeTab.sql.trim()) return;
    if (hasActivePendingChanges) {
      patchTab(activeTab.id, { warnings: ['Discard or commit pending edits before exporting the full result.'] });
      return;
    }
    const baseName = activeTab.title.replace(/[^a-z0-9_-]+/gi, '_') || 'lightbi-result';
    exportCancelRef.current = false;
    exportJobIdRef.current = null;
    setIsExportingAll(true);
    setExportProgress({ format: format.toUpperCase(), rows: 0 });
    try {
      if (connection && connection.provider !== 'mongodb') {
        const filters = activeTab.filters;
        const filterTree: AdvancedFilterGroup | undefined = filters.length ? { combinator: activeTab.filterCombinator, children: filters } : undefined;
        const started = await startAdvancedExport(connection.connectionId, {
          sql: materializeSqlParameters(activeTab.sql, activeTab.parameters),
          format,
          fileName: baseName,
          tableName: activeTab.tableContext?.table || baseName,
          sort: activeTab.sort,
          filters,
          filterTree,
        });
        exportJobIdRef.current = started.jobId;
        for (let attempt = 0; attempt < 600; attempt += 1) {
          if (exportCancelRef.current) {
            await cancelAdvancedExportJob(started.jobId).catch(() => undefined);
            patchTab(activeTab.id, { warnings: [`Cancelled ${format.toUpperCase()} export.`] });
            return;
          }
          const job = await loadAdvancedExportJob(started.jobId);
          setExportProgress({ format: format.toUpperCase(), rows: job.rows });
          if (job.status === 'failed') throw new Error(job.error || 'Backend export failed.');
          if (job.status === 'cancelled') {
            patchTab(activeTab.id, { warnings: [`Cancelled ${format.toUpperCase()} export after ${job.rows.toLocaleString('en')} rows.`] });
            return;
          }
          if (job.status === 'completed') {
            const blob = await downloadAdvancedExportJob(started.jobId);
            downloadBlob(job.fileName, blob);
            patchTab(activeTab.id, { warnings: [`Exported ${job.rows.toLocaleString('en')} rows to ${format.toUpperCase()} with backend worker.`] });
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error('Backend export did not finish in time.');
      }
      const pageSize = Math.max(1000, activeTab.limit);
      const chunks: string[] = [];
      const allRows: QueryCellValue[][] = [];
      let columns = activeTab.result?.columns ?? [];
      let offset = 0;
      let totalRows = 0;
      for (let page = 0; page < 200; page += 1) {
        if (exportCancelRef.current) {
          patchTab(activeTab.id, { warnings: [`Cancelled ${format.toUpperCase()} export after ${totalRows.toLocaleString('en')} rows.`] });
          return;
        }
        const result = await fetchQueryPage(activeTab, offset, pageSize, createAdvancedId());
        if (page === 0) columns = result.columns;
        if (format === 'csv') {
          const csv = advancedResultToCsv(result.columns, result.rows);
          chunks.push(page === 0 ? csv : csv.split(/\r?\n/).slice(1).join('\n'));
        } else {
          allRows.push(...result.rows);
        }
        totalRows += result.rows.length;
        setExportProgress({ format: format.toUpperCase(), rows: totalRows });
        if (!result.page.hasMore || result.rows.length === 0) break;
        offset = result.page.offset + result.rows.length;
      }
      if (exportCancelRef.current) {
        patchTab(activeTab.id, { warnings: [`Cancelled ${format.toUpperCase()} export after ${totalRows.toLocaleString('en')} rows.`] });
        return;
      }
      if (format === 'xlsx') {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(allRows.map(row => Object.fromEntries(columns.map((column, index) => [column.name, row[index] ?? null]))));
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Result');
        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
        downloadBlob(`${baseName}.full.xlsx`, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      } else if (format === 'json') {
        const objects = allRows.map(row => Object.fromEntries(columns.map((column, index) => [column.name, row[index] ?? null])));
        downloadBlob(`${baseName}.full.json`, new Blob([JSON.stringify(objects, null, 2)], { type: 'application/json;charset=utf-8' }));
      } else if (format === 'sql') {
        const tableName = quoteIdentifier(activeTab.tableContext?.table || baseName);
        const names = columns.map(column => quoteIdentifier(column.name)).join(', ');
        const statements = allRows.map(row => `INSERT INTO ${tableName} (${names}) VALUES (${row.map(sqlLiteral).join(', ')});`).join('\n');
        downloadBlob(`${baseName}.full.sql`, new Blob([statements], { type: 'application/sql;charset=utf-8' }));
      } else {
        downloadBlob(`${baseName}.full.csv`, new Blob([chunks.join('\n')], { type: 'text/csv;charset=utf-8' }));
      }
      patchTab(activeTab.id, { warnings: [`Exported ${totalRows.toLocaleString('en')} rows to ${format.toUpperCase()}.`] });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Full export failed.' });
    } finally {
      setIsExportingAll(false);
      setExportProgress(null);
      exportCancelRef.current = false;
      exportJobIdRef.current = null;
    }
  };

  const copyResult = async () => {
    if (!displayResult) return;
    const text = advancedResultToCsv(displayResult.columns, displayResult.rows);
    await copyTextToClipboard(text);
  };

  const editCell = (rowIndex: number, columnIndex: number, oldValue: QueryCellValue, newValue: QueryCellValue) => {
    patchTab(activeTab.id, tab => ({ editState: recordAdvancedCellEdit(tab.editState, { rowIndex, columnIndex, oldValue, newValue }), error: '' }));
  };

  const editVisibleCell = (rowIndex: number, visibleColumnIndex: number, oldValue: QueryCellValue, newValue: QueryCellValue) => {
    if (!activeResult || !displayResult) return;
    const columnId = displayResult.columns[visibleColumnIndex]?.id;
    const sourceColumnIndex = activeResult.columns.findIndex(column => column.id === columnId);
    if (sourceColumnIndex >= 0) editCell(rowIndex, sourceColumnIndex, oldValue, newValue);
  };

  const duplicateRowAsInsert = (rowIndex: number) => {
    patchTab(activeTab.id, tab => ({ insertRowIndexes: [...tab.insertRowIndexes, rowIndex], error: '' }));
  };

  const openInsertDraft = () => {
    const values = Object.fromEntries((activeTableNode?.columns ?? []).filter(column => !column.primaryKey).map(column => [column.name, '']));
    setInsertDraft({ open: true, values });
  };

  const addInsertDraft = () => {
    if (!activeTableNode) return;
    const changes = Object.fromEntries(activeTableNode.columns.flatMap(column => {
      if (column.primaryKey) return [];
      const raw = insertDraft.values[column.name] ?? '';
      const value = coerceInsertDraftValue(column.nativeType, raw);
      return value === null ? [] : [[column.name, value]];
    }));
    if (Object.keys(changes).length === 0) {
      patchTab(activeTab.id, { error: 'Add at least one value for the new row.' });
      return;
    }
    patchTab(activeTab.id, tab => ({ insertRows: [...tab.insertRows, changes], error: '' }));
    setInsertDraft({ open: false, values: {} });
  };

  const markRowDeleted = (rowIndex: number) => {
    patchTab(activeTab.id, tab => ({
      deletedRowIndexes: tab.deletedRowIndexes.includes(rowIndex) ? tab.deletedRowIndexes : [...tab.deletedRowIndexes, rowIndex],
      error: '',
    }));
  };

  const restoreDeletedRow = (rowIndex: number) => {
    patchTab(activeTab.id, tab => ({ deletedRowIndexes: tab.deletedRowIndexes.filter(index => index !== rowIndex), error: '' }));
  };

  const discardEdits = () => patchTab(activeTab.id, { editState: EMPTY_ADVANCED_EDIT_STATE, insertRowIndexes: [], insertRows: [], deletedRowIndexes: [], editMode: false, error: '' });

  const reviewSourceChanges = async () => {
    if (!connection || !['sqlite', 'postgresql', 'mysql', 'mariadb'].includes(connection.provider) || !activeTab.result || !activeTab.tableContext) return;
    const schemaNode = schema?.schemas.find(item => item.name === activeTab.tableContext!.schema);
    const table = schemaNode?.tables.find(item => item.name === activeTab.tableContext!.table);
    const primaryKeys = table?.columns.filter(column => column.primaryKey).map(column => column.name) ?? [];
    try {
      const deletedRows = new Set(activeTab.deletedRowIndexes);
      const editableState = {
        ...activeTab.editState,
        changes: Object.fromEntries(Object.entries(activeTab.editState.changes).filter(([, edit]) => !deletedRows.has(edit.rowIndex))),
      };
      const request: AdvancedMutationRequest = {
        schema: activeTab.tableContext.schema,
        table: activeTab.tableContext.table,
        rows: [
          ...buildManualInsertMutationRows(activeTab.insertRows),
          ...buildInsertMutationRows(activeTab.result, activeTab.insertRowIndexes, primaryKeys),
          ...buildAdvancedMutationRows(activeTab.result, editableState, primaryKeys),
          ...buildDeleteMutationRows(activeTab.result, activeTab.deletedRowIndexes, primaryKeys),
        ],
      };
      if (request.rows.length === 0) return;
      const preview = await previewAdvancedMutation(connection.connectionId, request);
      setMutationReview({ request, preview });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Could not prepare source changes.' });
    }
  };

  const commitSourceChanges = async () => {
    if (!connection || !mutationReview) return;
    setIsCommitting(true);
    try {
      const committed = await commitAdvancedMutation(connection.connectionId, mutationReview.request);
      setMutationReview(null);
      patchTab(activeTab.id, { editState: EMPTY_ADVANCED_EDIT_STATE, insertRowIndexes: [], insertRows: [], deletedRowIndexes: [], editMode: false, result: null, warnings: [`Committed ${committed.updatedRows} row${committed.updatedRows === 1 ? '' : 's'} in one transaction. Run the query to reload source data.`], error: '' });
      await refreshSchema();
    } catch (cause) {
      setMutationReview(null);
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Source commit failed and was rolled back.' });
    } finally {
      setIsCommitting(false);
    }
  };

  const reviewSqlScript = async () => {
    if (!connection || connection.provider === 'mongodb' || !activeTab.sql.trim()) return;
    try {
      const sql = materializeSqlParameters(activeTab.sql, activeTab.parameters);
      const preview = await previewAdvancedScript(connection.connectionId, sql);
      setScriptReview({ sql, preview });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Could not review SQL script.' });
    }
  };

  const importSqlFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !connection || connection.provider === 'mongodb') return;
    const title = file.name.replace(/\.(sql|txt)$/i, '') || 'SQL import';
    const tab = addTab({ title, sql: '', limit: activeTab.limit, parameters: {} });
    try {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('SQL import file is too large for interactive review. Use a smaller script or split the file.');
      }
      const sql = await file.text();
      if (!sql.trim()) throw new Error('SQL import file is empty.');
      patchTab(tab.id, { sql, error: '', warnings: [`Loaded ${file.name} for transaction review.`], parameters: {} });
      const preview = await previewAdvancedScript(connection.connectionId, sql);
      setScriptReview({ sql, preview });
    } catch (cause) {
      patchTab(tab.id, { error: cause instanceof Error ? cause.message : 'Could not import SQL file.' });
    }
  };

  const normalizeImportFile = async (file: File): Promise<{ file: File; headers: string[] }> => {
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error('Excel workbook does not contain any sheets.');
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet], { blankrows: false });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: '', raw: false });
      const headers = rows[0] ? Object.keys(rows[0]) : csv.split(/\r?\n/, 1)[0]?.split(',').map(item => item.trim()).filter(Boolean) ?? [];
      return { file: new File([csv], file.name.replace(/\.(xlsx|xls)$/i, '.csv'), { type: 'text/csv' }), headers };
    }
    const text = await file.text();
    const headerLine = text.split(/\r?\n/, 1)[0] ?? '';
    const headers = headerLine.split(',').map(item => item.trim().replace(/^"|"$/g, '')).filter(Boolean);
    return { file, headers };
  };

  const openFileImportDraft = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !connection || !activeTab.tableContext || connection.provider === 'mongodb') return;
    try {
      const normalized = await normalizeImportFile(file);
      const targetColumns = activeTableNode?.columns.filter(column => !column.primaryKey) ?? [];
      const normalizedHeaders = new Map(normalized.headers.map(header => [header.toLocaleLowerCase(), header]));
      setFileImportDraft({
        open: true,
        file: normalized.file,
        fileName: file.name,
        headers: normalized.headers,
        schema: activeTab.tableContext.schema,
        table: activeTab.tableContext.table,
        columnMap: Object.fromEntries(targetColumns.map(column => [column.name, normalizedHeaders.get(column.name.toLocaleLowerCase()) ?? ''])),
        errorMode: 'stop_rollback',
        running: false,
        importedRows: 0,
        skippedRows: 0,
        error: '',
      });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Could not read import file.' });
    }
  };

  const importFileDraftToCurrentTable = async () => {
    if (!fileImportDraft.file || !connection) return;
    setIsCommitting(true);
    setFileImportDraft(current => ({ ...current, running: true, importedRows: 0, skippedRows: 0, error: '' }));
    setImportProgress({ executed: 0, total: 0 });
    importJobIdRef.current = null;
    try {
      const started = await startAdvancedCsvImport(connection.connectionId, {
        file: fileImportDraft.file,
        schema: fileImportDraft.schema,
        table: fileImportDraft.table,
        mapping: fileImportDraft.columnMap,
        errorMode: fileImportDraft.errorMode,
      });
      importJobIdRef.current = started.jobId;
      let completed = 0;
      let skipped = 0;
      for (let attempt = 0; attempt < 600; attempt += 1) {
        const job = await loadAdvancedImportJob(started.jobId);
        completed = job.executedStatements;
        skipped = job.skippedStatements;
        setFileImportDraft(current => ({ ...current, importedRows: completed, skippedRows: skipped }));
        setImportProgress({ executed: job.executedStatements + job.skippedStatements, total: job.statementCount });
        if (job.status === 'failed') throw new Error(job.error || 'CSV import failed and was rolled back.');
        if (job.status === 'cancelled') throw new Error('CSV import was cancelled.');
        if (job.status === 'completed') break;
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      setFileImportDraft(current => ({ ...current, open: false, running: false }));
      patchTab(activeTab.id, { result: null, warnings: [`Imported ${completed.toLocaleString('en')} row${completed === 1 ? '' : 's'} into ${fileImportDraft.schema}.${fileImportDraft.table}${skipped ? `; skipped ${skipped.toLocaleString('en')}` : ''}.`], error: '' });
      await refreshSchema();
    } catch (cause) {
      setFileImportDraft(current => ({ ...current, running: false, error: cause instanceof Error ? cause.message : 'File import failed.' }));
    } finally {
      setIsCommitting(false);
      setImportProgress(null);
      importJobIdRef.current = null;
    }
  };

  const commitSqlScript = async () => {
    if (!connection || !scriptReview) return;
    setIsCommitting(true);
    setImportProgress({ executed: 0, total: scriptReview.preview.statementCount });
    importJobIdRef.current = null;
    try {
      const started = await startAdvancedSqlImport(connection.connectionId, scriptReview.sql);
      importJobIdRef.current = started.jobId;
      let committed = 0;
      for (let attempt = 0; attempt < 600; attempt += 1) {
        const job = await loadAdvancedImportJob(started.jobId);
        committed = job.executedStatements;
        setImportProgress({ executed: job.executedStatements, total: job.statementCount });
        if (job.status === 'failed') throw new Error(job.error || 'SQL import failed and was rolled back.');
        if (job.status === 'cancelled') throw new Error('SQL import was cancelled and rolled back.');
        if (job.status === 'completed') break;
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      setScriptReview(null);
      patchTab(activeTab.id, { result: null, warnings: [`Executed ${committed} statement${committed === 1 ? '' : 's'} in one import transaction.`], error: '' });
      await refreshSchema();
    } catch (cause) {
      setScriptReview(null);
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'SQL script failed and was rolled back.' });
    } finally {
      setIsCommitting(false);
      setImportProgress(null);
      importJobIdRef.current = null;
    }
  };

  const disconnect = async () => {
    coordinators.current.forEach(coordinator => coordinator.cancel());
    activeRunIds.current.clear();
    if (connection) await closeAdvancedConnection(connection.connectionId).catch(() => undefined);
    await fileSession.current.close();
    setConnection(null);
    setFileSource(null);
    setSchema(null);
    setExactCounts({});
    setConnectionError('');
    setTabs(current => current.map(tab => ({ ...tab, result: null, warnings: [], error: '', isRunning: false, offset: 0, filters: [] })));
  };

  const addTab = (initial?: Partial<WorkspaceTab>) => {
    const tab = { ...hydrateTab(createAdvancedTab(tabs.length + 1, initial)), ...initial } as WorkspaceTab;
    setTabs(current => [...current, tab]);
    setActiveTabId(tab.id);
    return tab;
  };

  const performCloseTab = (tabId: string) => {
    void cancelQuery(tabId);
    coordinators.current.delete(tabId);
    setTabs(current => {
      if (current.length === 1) {
        const replacement = hydrateTab(createAdvancedTab(1));
        setActiveTabId(replacement.id);
        return [replacement];
      }
      const index = current.findIndex(tab => tab.id === tabId);
      const next = current.filter(tab => tab.id !== tabId);
      if (tabId === activeTabId) setActiveTabId(next[Math.max(0, index - 1)].id);
      return next;
    });
  };

  const closeTab = (tabId: string) => {
    const tab = tabs.find(item => item.id === tabId);
    if (tab && tabHasPendingChanges(tab)) {
      setPendingCloseTabId(tabId);
      return;
    }
    performCloseTab(tabId);
  };

  const selectTable = (schemaName: string, table: AdvancedTableNode) => {
    if (hasActivePendingChanges) {
      patchTab(activeTab.id, { warnings: ['Export or discard pending result edits before switching tables.'] });
      return;
    }
    const title = `${schemaName}.${table.name}`;
    const query = fileSource
      ? `SELECT *\nFROM ${quoteIdentifier(table.name)}`
      : connection?.provider === 'mongodb'
      ? JSON.stringify({ collection: table.name, filter: {}, projection: {}, sort: {} }, null, 2)
      : `SELECT *\nFROM ${qualifiedTableReference(workspaceProvider, schemaName, table.name)}`;
    const existing = tabs.find(tab => tab.title === title);
    if (existing) {
      patchTab(existing.id, { sql: query, offset: 0, sort: undefined, filters: [], filterValue: '', tableContext: fileSource ? undefined : { schema: schemaName, table: table.name }, parameters: {} });
      setActiveTabId(existing.id);
    } else {
      addTab({ title, sql: query, limit: activeTab.limit, tableContext: fileSource ? undefined : { schema: schemaName, table: table.name }, parameters: {} });
    }
  };

  const applyHistory = (entry: AdvancedHistoryEntry) => {
    patchTab(activeTab.id, tab => ({ sql: entry.sql, offset: 0, sort: undefined, filters: [], filterValue: '', error: '', parameters: reconcileSqlParameters(entry.sql, tab.parameters) }));
  };

  const applyFavorite = (entry: AdvancedFavorite) => {
    patchTab(activeTab.id, tab => ({ title: entry.name, sql: entry.sql, offset: 0, sort: undefined, filters: [], filterValue: '', error: '', parameters: reconcileSqlParameters(entry.sql, tab.parameters) }));
  };

  const navigateForeignKey = (fk: NonNullable<AdvancedTableNode['foreignKeys']>[number], row: QueryCellValue[], result: AdvancedQueryResult) => {
    if (!activeTab.tableContext || workspaceProvider === 'mongodb') return;
    const referenced = splitReferencedTable(activeTab.tableContext.schema, fk.referencedTable);
    const predicates = fk.columns.flatMap((column, index) => {
      const columnIndex = result.columns.findIndex(candidate => candidate.name === column);
      const referencedColumn = fk.referencedColumns[index] ?? fk.referencedColumns[0];
      return columnIndex >= 0 && referencedColumn
        ? [`${workspaceProvider === 'mysql' || workspaceProvider === 'mariadb' ? quoteMysqlIdentifier(referencedColumn) : quoteIdentifier(referencedColumn)} = ${sqlLiteral(row[columnIndex] ?? null)}`]
        : [];
    });
    if (predicates.length === 0) return;
    const sql = `SELECT *\nFROM ${qualifiedTableReference(workspaceProvider, referenced.schema, referenced.table)}\nWHERE ${predicates.join(' AND ')}`;
    addTab({ title: `${referenced.schema}.${referenced.table}`, sql, limit: activeTab.limit, tableContext: { schema: referenced.schema, table: referenced.table }, parameters: {} });
  };

  const foreignKeyActions: GridForeignKeyAction[] = activeTableNode?.foreignKeys?.map(fk => ({
    id: fk.name,
    columnNames: fk.columns,
    label: `Open ${fk.referencedTable}`,
    onNavigate: (row, result) => navigateForeignKey(fk, row, result),
  })) ?? [];

  const quickCommands: QuickCommand[] = (() => {
    const runAndClose = (run: () => void): (() => void) => () => {
      run();
      setCommandOpen(false);
      setCommandQuery('');
      setSelectedCommandIndex(0);
    };
    return [
      { id: 'action:new-tab', kind: 'action', title: 'New query tab', subtitle: 'Workspace action', keywords: 'new query tab', run: runAndClose(() => addTab()) },
      { id: 'action:run-query', kind: 'action', title: 'Run current query', subtitle: 'Execute active tab', keywords: 'run execute current query', run: runAndClose(() => { void runQuery(); }) },
      { id: 'action:save-favorite', kind: 'action', title: 'Save current query', subtitle: 'Add to favorites', keywords: 'save favorite current query', run: runAndClose(addFavorite) },
      ...(schema?.schemas.flatMap(schemaNode => schemaNode.tables.map(table => ({
        id: `table:${schemaNode.name}.${table.name}`,
        kind: 'table' as const,
        title: table.name,
        subtitle: `${schemaNode.name} · ${table.kind}${table.estimatedRows !== undefined && table.estimatedRows !== null ? ` · ~${compactCount(table.estimatedRows)} rows` : ''}`,
        keywords: `${schemaNode.name} ${table.name} ${table.columns.map(column => column.name).join(' ')}`,
        run: runAndClose(() => selectTable(schemaNode.name, table)),
      }))) ?? []),
      ...tabs.map(tab => ({
        id: `tab:${tab.id}`,
        kind: 'tab' as const,
        title: tab.title,
        subtitle: tab.id === activeTab.id ? 'Current tab' : 'Open tab',
        keywords: `${tab.title} ${tab.sql}`,
        run: runAndClose(() => setActiveTabId(tab.id)),
      })),
      ...favorites.slice(0, 50).map(entry => ({
        id: `favorite:${entry.id}`,
        kind: 'favorite' as const,
        title: entry.name,
        subtitle: 'Favorite query',
        keywords: `${entry.name} ${entry.sql}`,
        run: runAndClose(() => applyFavorite(entry)),
      })),
      ...history.slice(0, 50).map(entry => ({
        id: `history:${entry.id}`,
        kind: 'history' as const,
        title: entry.sql.replace(/\s+/g, ' ').slice(0, 90),
        subtitle: `${entry.successful ? `${entry.rowCount} rows` : 'Failed'} · ${entry.executionMs} ms`,
        keywords: `${entry.sql} ${entry.database}`,
        run: runAndClose(() => applyHistory(entry)),
      })),
      ...orderedSources.map(source => ({
        id: `source:${source.id}`,
        kind: 'source' as const,
        title: source.name,
        subtitle: `${source.sourceKind === 'online_link' ? 'Online link' : 'Local file'} · ${source.tables.length} table${source.tables.length === 1 ? '' : 's'}`,
        keywords: `${source.name} ${source.tables.map(table => `${table.name} ${table.columns.join(' ')}`).join(' ')}`,
        run: runAndClose(() => { void openFileSource(source); }),
      })),
    ];
  })();

  const visibleQuickCommands = (() => {
    const needle = commandQuery.trim().toLocaleLowerCase();
    const commands = needle
      ? quickCommands.filter(command => `${command.title} ${command.subtitle} ${command.keywords}`.toLocaleLowerCase().includes(needle))
      : quickCommands;
    return commands.slice(0, 40);
  })();

  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [commandQuery, commandOpen]);

  useEffect(() => {
    if (selectedCommandIndex >= visibleQuickCommands.length) setSelectedCommandIndex(Math.max(0, visibleQuickCommands.length - 1));
  }, [selectedCommandIndex, visibleQuickCommands.length]);

  const toggleSort = (column: string) => {
    const nextSort: AdvancedSort | undefined = activeTab.sort?.column !== column
      ? { column, direction: 'asc' }
      : activeTab.sort.direction === 'asc'
        ? { column, direction: 'desc' }
        : undefined;
    void runQuery(activeTab.id, { offset: 0, sort: nextSort });
  };

  const applyFilter = () => {
    const value = activeTab.filterValue.trim();
    const valueOptional = ['is_blank', 'is_not_blank'].includes(activeTab.filterOperator);
    if (!activeTab.filterColumn || (!value && !valueOptional)) return;
    const filters = [...activeTab.filters, { column: activeTab.filterColumn, operator: activeTab.filterOperator, value }];
    patchTab(activeTab.id, { filterValue: '', filters });
    void runQuery(activeTab.id, { offset: 0, filters });
  };

  const removeFilter = (index: number) => {
    const filters = activeTab.filters.filter((_, filterIndex) => filterIndex !== index);
    patchTab(activeTab.id, { filters });
    void runQuery(activeTab.id, { offset: 0, filters });
  };

  const applyMongoBuilder = () => {
    if (workspaceProvider !== 'mongodb') return;
    try {
      const current = JSON.parse(activeTab.sql || '{}') as { collection?: string; filter?: Record<string, unknown>; projection?: Record<string, unknown>; sort?: Record<string, unknown> };
      const next = {
        collection: current.collection || activeTab.title,
        filter: { ...(current.filter || {}) },
        projection: { ...(current.projection || {}) },
        sort: { ...(current.sort || {}) },
      };
      if (activeTab.filterColumn) next.filter[activeTab.filterColumn] = mongoFilterValue(activeTab.filterOperator, activeTab.filterValue);
      if (activeTab.sort?.column) next.sort[activeTab.sort.column] = activeTab.sort.direction === 'desc' ? -1 : 1;
      patchTab(activeTab.id, { sql: JSON.stringify(next, null, 2), filterValue: '', error: '' });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Mongo query JSON is invalid.' });
    }
  };

  const applyMongoProjection = (mode: 1 | 0) => {
    if (workspaceProvider !== 'mongodb' || !activeTab.projectionColumn) return;
    try {
      const current = JSON.parse(activeTab.sql || '{}') as { collection?: string; filter?: Record<string, unknown>; projection?: Record<string, unknown>; sort?: Record<string, unknown> };
      const next = {
        collection: current.collection || activeTab.title,
        filter: current.filter || {},
        projection: { ...(current.projection || {}), [activeTab.projectionColumn]: mode },
        sort: current.sort || {},
      };
      patchTab(activeTab.id, { sql: JSON.stringify(next, null, 2), error: '' });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Mongo query JSON is invalid.' });
    }
  };

  const resizeVisibleColumn = (columnId: string, width: number) => {
    patchTab(activeTab.id, tab => ({ columnWidths: { ...tab.columnWidths, [columnId]: width } }));
  };

  const moveVisibleColumn = (columnId: string, direction: -1 | 1) => {
    if (!displayResult) return;
    const currentOrder = [
      ...activeTab.columnOrder.filter(id => displayResult.columns.some(column => column.id === id)),
      ...displayResult.columns.map(column => column.id).filter(id => !activeTab.columnOrder.includes(id)),
    ];
    const from = currentOrder.indexOf(columnId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= currentOrder.length) return;
    const nextOrder = [...currentOrder];
    [nextOrder[from], nextOrder[to]] = [nextOrder[to], nextOrder[from]];
    patchTab(activeTab.id, { columnOrder: nextOrder });
  };

  const renameResultColumnAlias = (columnId: string, currentName: string) => {
    if (!activeTab.result) return;
    setRenameColumnDraft({ tabId: activeTab.id, columnId, currentName, nextName: currentName });
  };

  const confirmRenameResultColumnAlias = () => {
    if (!renameColumnDraft) return;
    const targetTab = tabs.find(tab => tab.id === renameColumnDraft.tabId);
    const nextName = renameColumnDraft.nextName.trim();
    if (!targetTab?.result || !nextName || nextName === renameColumnDraft.currentName) {
      setRenameColumnDraft(null);
      return;
    }
    try {
      const sql = buildRenamedResultSql(targetTab.sql, targetTab.result, renameColumnDraft.columnId, nextName);
      patchTab(targetTab.id, { plan: null, filterValue: '', filterColumn: '', tableContext: undefined });
      setRenameColumnDraft(null);
      void runQuery(targetTab.id, { sql, offset: 0, sort: undefined, filters: [] });
    } catch (cause) {
      patchTab(targetTab.id, { error: cause instanceof Error ? cause.message : 'Could not rename column alias.' });
      setRenameColumnDraft(null);
    }
  };

  const handleProviderChange = (provider: AdvancedConnection['provider']) => {
    setConnectionProvider(provider);
    setConnectionName(providerDisplayName(providerPlugins, provider));
  };

  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    const profile = profiles.find(item => item.id === profileId);
    if (!profile) return;
    setConnectionName(profile.name);
    setConnectionProvider(profile.provider);
    setDatabaseName(profile.database);
    setTlsMode(profile.tlsMode);
    setSshHost(profile.sshHost || '');
    setSshPort(profile.sshPort || 22);
    setSshUser(profile.sshUser || '');
    setProfileGroupName(profile.groupName || '');
    setProfileTagName(profile.tagName || '');
    setSafeMode(profile.safeMode || 'confirm_writes');
  };

  const createTableSqlPreview = generateCreateTableSql(createTableDraft, workspaceProvider);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><h1 className="text-[15px] font-semibold text-gray-900">Advanced Data Workspace</h1><span className="border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-blue-700">{workspaceProvider}</span></div>
          <p className="truncate text-[11px] text-gray-500">{connection ? `${connection.name} · ${connection.database}` : fileSource ? `${fileSource.name} · ${fileSource.tables.length} table${fileSource.tables.length === 1 ? '' : 's'} · inherited Simple understanding` : 'Files, online sheets, and databases in one read-only workspace'}</p>
        </div>
        {(connection || fileSource) && <button className="flex h-8 items-center gap-2 px-2 text-[12px] text-gray-600 hover:bg-gray-100" onClick={disconnect} title="Close source session"><Unplug className="h-4 w-4" /> Disconnect</button>}
      </header>

      {!connection && !fileSource ? (
        <AdvancedConnectionGate
          orderedSources={orderedSources}
          preferredSourceId={preferredSourceId}
          isConnecting={isConnecting}
          profiles={profiles}
          providerPlugins={providerPlugins}
          selectedProfileId={selectedProfileId}
          connectionProvider={connectionProvider}
          connectionName={connectionName}
          connectionUrl={connectionUrl}
          databaseName={databaseName}
          tlsMode={tlsMode}
          safeMode={safeMode}
          profileGroupName={profileGroupName}
          profileTagName={profileTagName}
          sshHost={sshHost}
          sshUser={sshUser}
          sshPort={sshPort}
          saveProfile={saveProfile}
          connectionError={connectionError}
          onOpenFileSource={source => { void openFileSource(source); }}
          onSubmit={connect}
          onProviderChange={handleProviderChange}
          onProfileChange={handleProfileChange}
          onConnectionNameChange={setConnectionName}
          onConnectionUrlChange={setConnectionUrl}
          onDatabaseNameChange={setDatabaseName}
          onTlsModeChange={setTlsMode}
          onSafeModeChange={setSafeMode}
          onProfileGroupNameChange={setProfileGroupName}
          onProfileTagNameChange={setProfileTagName}
          onSshHostChange={setSshHost}
          onSshUserChange={setSshUser}
          onSshPortChange={setSshPort}
          onSaveProfileChange={setSaveProfile}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 lg:flex">
            <div className="flex h-9 items-center border-b border-gray-200 px-1">
              <button onClick={() => setSideView('schema')} className={`flex h-7 items-center gap-1 px-2 text-[10px] font-semibold uppercase ${sideView === 'schema' ? 'bg-gray-200 text-gray-800' : 'text-gray-500'}`}><Database className="h-3 w-3" /> Explorer</button>
              <button onClick={() => setSideView('history')} className={`flex h-7 items-center gap-1 px-2 text-[10px] font-semibold uppercase ${sideView === 'history' ? 'bg-gray-200 text-gray-800' : 'text-gray-500'}`}><History className="h-3 w-3" /> History</button>
              <button onClick={() => setSideView('favorites')} className={`flex h-7 items-center gap-1 px-2 text-[10px] font-semibold uppercase ${sideView === 'favorites' ? 'bg-gray-200 text-gray-800' : 'text-gray-500'}`} title="Favorites"><Star className="h-3 w-3" /></button>
              {sideView === 'schema' && <button className="ml-auto p-1 text-gray-500 hover:bg-gray-200" onClick={refreshSchema} title="Refresh schema"><RefreshCw className="h-3.5 w-3.5" /></button>}
            </div>
            <div className="min-h-0 flex-1 overflow-auto">{sideView === 'schema' ? (schema ? <SchemaTree schema={schema} onSelectTable={selectTable} exactCounts={exactCounts} onRequestCount={requestExactCount} /> : <div className="p-3 text-[12px] text-gray-500">Loading schema...</div>) : sideView === 'history' ? <HistoryPanel entries={history} onSelect={applyHistory} onClear={() => { void clearAdvancedHistory().then(() => setHistory([])); }} /> : <FavoritesPanel entries={favorites} onSelect={applyFavorite} onDelete={entry => { void deleteAdvancedFavorite(entry.id).then(() => setFavorites(current => current.filter(item => item.id !== entry.id))); }} />}</div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-9 shrink-0 items-end overflow-x-auto border-b border-gray-200 bg-gray-100 px-1">
              {tabs.map(tab => {
                const dirty = tabHasPendingChanges(tab);
                return <div key={tab.id} className={`flex h-8 min-w-[120px] max-w-[220px] items-center border-r border-gray-200 px-2 text-[11px] ${tab.id === activeTab.id ? 'bg-white text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}><button className="flex min-w-0 flex-1 items-center gap-1 truncate text-left" onClick={() => setActiveTabId(tab.id)}>{tab.isRunning && <Loader2 className="h-3 w-3 animate-spin" />}{dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved result changes" />}<span className="truncate">{tab.title}</span></button><button className="ml-2 p-0.5 hover:bg-gray-200" onClick={() => closeTab(tab.id)} title={dirty ? 'Close tab with unsaved changes' : 'Close tab'}><X className="h-3 w-3" /></button></div>;
              })}
              <button className="mb-1 ml-1 p-1.5 text-gray-500 hover:bg-gray-200" onClick={() => addTab()} title="New query tab"><Plus className="h-3.5 w-3.5" /></button>
            </div>

            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-50 px-3">
              {schema && <select aria-label="Quick table switcher" defaultValue="" onChange={event => {
                const [schemaName, tableName] = JSON.parse(event.target.value) as [string, string];
                const table = schema.schemas.find(item => item.name === schemaName)?.tables.find(item => item.name === tableName);
                if (table) selectTable(schemaName, table);
                event.target.value = '';
              }} className="h-7 max-w-[120px] border border-gray-300 bg-white px-1 text-[10px] lg:hidden">
                <option value="" disabled>Table...</option>
                {schema.schemas.flatMap(schemaNode => schemaNode.tables.map(table => <option key={`${schemaNode.name}.${table.name}`} value={JSON.stringify([schemaNode.name, table.name])}>{table.name}</option>))}
              </select>}
              <button disabled={activeTab.isRunning} onClick={() => runQuery()} className="flex h-7 items-center gap-1.5 bg-blue-600 px-3 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Play className="h-3.5 w-3.5 fill-current" /> Run</button>
              <button disabled={workspaceProvider === 'mongodb' || activeTab.isRunning || splitAdvancedStatements(activeTab.sql).length < 2} onClick={runAllStatements} className="hidden h-7 border border-gray-300 bg-white px-2 text-[11px] text-gray-600 hover:bg-gray-100 disabled:opacity-35 sm:block" title="Run up to five read-only statements into separate result tabs">Run all</button>
              <button disabled={!activeTab.isRunning} onClick={() => cancelQuery()} className="flex h-7 items-center gap-1.5 border border-gray-300 bg-white px-2 text-[12px] text-gray-600 hover:bg-gray-100 disabled:opacity-40" title="Cancel query"><StopCircle className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cancel</span></button>
              <button disabled={workspaceProvider !== 'postgresql' || activeTab.isRunning} onClick={explainQuery} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Explain PostgreSQL query plan"><FileSearch className="h-3.5 w-3.5" /></button>
              <button disabled={!connection || connection.provider === 'mongodb' || activeTab.isRunning || !activeTab.sql.trim()} onClick={() => void reviewSqlScript()} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Review SQL script transaction"><ShieldCheck className="h-3.5 w-3.5" /></button>
              <input ref={sqlFileInputRef} type="file" accept=".sql,.txt,text/plain,application/sql" className="hidden" aria-label="SQL import file" onChange={event => void importSqlFile(event)} />
              <button disabled={!connection || connection.provider === 'mongodb' || activeTab.isRunning} onClick={() => sqlFileInputRef.current?.click()} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Import SQL file"><FileUp className="h-3.5 w-3.5" /></button>
              <input ref={csvFileInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" aria-label="CSV or Excel import file" onChange={event => void openFileImportDraft(event)} />
              <button disabled={!canCommitActive || activeTab.isRunning || isCommitting} onClick={() => csvFileInputRef.current?.click()} className="hidden p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40 sm:block" title="Import CSV or Excel into current table"><FileSpreadsheet className="h-3.5 w-3.5" /></button>
              <button disabled={!activeTab.sql.trim()} onClick={openSqlAssistant} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="AI explain and optimize SQL"><Sparkles className="h-3.5 w-3.5" /></button>
              <button disabled={!connection || connection.provider === 'mongodb'} onClick={openCreateTableDraft} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Create table SQL"><Table2 className="h-3.5 w-3.5" /></button>
              <button disabled={!connection || connection.provider === 'mongodb' || !activeTab.tableContext || !activeTableNode} onClick={openStructureDraft} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Edit table structure SQL"><ListTree className="h-3.5 w-3.5" /></button>
              <button disabled={!connection || connection.provider === 'mongodb' || sources.length === 0} onClick={openImportDraft} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Import understood file into DB table"><FileSpreadsheet className="h-3.5 w-3.5" /></button>
              <button onClick={addFavorite} className="p-1.5 text-gray-500 hover:bg-gray-200" title="Save query to favorites"><Star className="h-3.5 w-3.5" /></button>
              <button onClick={() => setCommandOpen(true)} className="flex h-7 items-center gap-1 border border-gray-300 bg-white px-2 text-[11px] text-gray-500 hover:bg-gray-100" title="Command switcher"><Search className="h-3.5 w-3.5" /><span className="hidden md:inline">Search</span><span className="hidden font-mono text-[9px] text-gray-400 lg:inline">Ctrl K</span></button>
              <div className="ml-2 hidden h-5 border-l border-gray-300 sm:block" />
              <label className="hidden text-[11px] text-gray-500 sm:block" htmlFor="advanced-limit">Rows</label>
              <select id="advanced-limit" value={activeTab.limit} onChange={event => patchTab(activeTab.id, { limit: Number(event.target.value), offset: 0 })} className="hidden h-7 border border-gray-300 bg-white px-2 text-[11px] outline-none sm:block">{[100, 200, 500, 1000].map(value => <option key={value} value={value}>{value}</option>)}</select>
              <span className="ml-auto hidden text-[11px] text-gray-500 sm:block">{statusText}</span>
            </div>

            <div className="h-[210px] shrink-0 border-b border-gray-200">
              <textarea aria-label={workspaceProvider === 'mongodb' ? 'MongoDB document query' : 'SQL query'} spellCheck={false} value={activeTab.sql} onChange={event => {
                const sql = event.target.value;
                patchTab(activeTab.id, tab => ({ sql, offset: 0, sort: undefined, filters: [], filterValue: '', plan: null, tableContext: undefined, parameters: reconcileSqlParameters(sql, tab.parameters) }));
              }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void runQuery(); } }} className="h-full w-full resize-none bg-[#fbfbfc] p-4 font-mono text-[13px] leading-6 text-gray-800 outline-none" />
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {workspaceProvider !== 'mongodb' && Object.keys(activeTab.parameters).length > 0 && (
                <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-2 py-1">
                  <Code2 className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-[10px] font-semibold uppercase text-gray-500">Parameters</span>
                  {Object.entries(activeTab.parameters).map(([name, value]) => (
                    <label key={name} className="flex h-7 items-center border border-gray-300 bg-gray-50 text-[11px]">
                      <span className="border-r border-gray-200 px-2 font-mono text-blue-700">:{name}</span>
                      <input
                        aria-label={`Parameter ${name}`}
                        value={value}
                        onChange={event => patchTab(activeTab.id, tab => ({ parameters: { ...tab.parameters, [name]: event.target.value } }))}
                        className="h-full w-32 bg-white px-2 font-mono text-gray-800 outline-none focus:bg-blue-50"
                      />
                    </label>
                  ))}
                  <button onClick={() => patchTab(activeTab.id, tab => ({ parameters: Object.fromEntries(Object.keys(tab.parameters).map(name => [name, ''])) }))} className="p-1 text-gray-500 hover:bg-gray-100" title="Clear parameter values"><RotateCcw className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <div className="flex h-9 shrink-0 items-center border-b border-gray-200 px-2">
                <button onClick={() => patchTab(activeTab.id, { resultView: 'grid' })} className={`flex h-7 items-center gap-1.5 px-3 text-[11px] ${activeTab.resultView === 'grid' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><Columns className="h-3.5 w-3.5" /> Grid</button>
                <button onClick={() => patchTab(activeTab.id, { resultView: 'chart' })} className={`flex h-7 items-center gap-1.5 px-3 text-[11px] ${activeTab.resultView === 'chart' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><BarChart3 className="h-3.5 w-3.5" /> Chart</button>
                <button onClick={() => patchTab(activeTab.id, { resultView: 'json' })} className={`hidden h-7 items-center gap-1.5 px-3 text-[11px] sm:flex ${activeTab.resultView === 'json' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><Braces className="h-3.5 w-3.5" /> JSON</button>
                <button onClick={() => patchTab(activeTab.id, { resultView: 'structure' })} className={`hidden h-7 items-center gap-1.5 px-3 text-[11px] md:flex ${activeTab.resultView === 'structure' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><ListTree className="h-3.5 w-3.5" /> Structure</button>
                {activeTab.plan !== null && <button onClick={() => patchTab(activeTab.id, { resultView: 'plan' })} className={`flex h-7 items-center gap-1.5 px-3 text-[11px] ${activeTab.resultView === 'plan' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><FileSearch className="h-3.5 w-3.5" /> Plan</button>}
                {displayResult && <button onClick={analyzeActiveResultInSimple} className="ml-1 flex h-7 items-center gap-1.5 border border-indigo-200 bg-indigo-50 px-3 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100" title="Create a Simple mode BA decision brief from this result"><Sparkles className="h-3.5 w-3.5" /> BA Brief</button>}
                {activeResult && <div className="relative">
                  <button onClick={() => setShowColumnMenu(value => !value)} className="flex h-7 items-center gap-1 px-2 text-[10px] text-gray-500 hover:bg-gray-100" title="Manage visible columns"><EyeOff className="h-3.5 w-3.5" /> {visibleResult?.columns.length}/{activeResult.columns.length}</button>
                  {showColumnMenu && <div className="absolute left-0 top-8 z-30 max-h-64 w-56 overflow-auto border border-gray-200 bg-white py-1 shadow-lg">
                    <div className="flex items-center justify-between border-b border-gray-100 px-2 py-1.5 text-[10px] font-semibold text-gray-600"><span>Visible columns</span><button onClick={() => patchTab(activeTab.id, { hiddenColumnIds: [] })} className="p-1 text-gray-400 hover:bg-gray-100" title="Show all columns"><RotateCcw className="h-3 w-3" /></button></div>
                    {activeResult.columns.map(column => {
                      const visible = !activeTab.hiddenColumnIds.includes(column.id);
                      return <label key={column.id} className="flex h-7 items-center gap-2 px-2 text-[10px] text-gray-700 hover:bg-gray-50"><input type="checkbox" checked={visible} disabled={visible && visibleResult?.columns.length === 1} onChange={() => patchTab(activeTab.id, tab => ({ hiddenColumnIds: visible ? [...tab.hiddenColumnIds, column.id] : tab.hiddenColumnIds.filter(id => id !== column.id) }))} /><span className="truncate">{column.name}</span><span className="ml-auto font-mono text-[8px] text-gray-400">{column.nativeType || column.logicalType}</span></label>;
                    })}
                  </div>}
                </div>}
                {activeResult && activeTab.resultView === 'grid' && <button onClick={() => patchTab(activeTab.id, { editMode: !activeTab.editMode })} className={`ml-1 p-1.5 ${activeTab.editMode ? 'bg-amber-100 text-amber-800' : 'text-gray-500 hover:bg-gray-100'}`} title="Toggle result edit mode"><Pencil className="h-3.5 w-3.5" /></button>}
                {activeResult && activeTab.resultView === 'grid' && activeTab.editMode && canCommitActive && <button onClick={openInsertDraft} className="p-1.5 text-emerald-700 hover:bg-emerald-50" title="Insert new row"><Plus className="h-3.5 w-3.5" /></button>}
                {(hasActivePendingChanges || activeTab.editState.redo.length > 0) && <>
                  {activeChangeCount > 0 && <span className="ml-1 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">{activeChangeCount} changed</span>}
                  {activeInsertCount > 0 && <span className="ml-1 bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">{activeInsertCount} insert</span>}
                  {activeDeleteCount > 0 && <span className="ml-1 bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-800">{activeDeleteCount} delete</span>}
                  <button disabled={activeTab.editState.undo.length === 0} onClick={() => patchTab(activeTab.id, tab => ({ editState: undoAdvancedCellEdit(tab.editState) }))} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Undo edit"><Undo2 className="h-3.5 w-3.5" /></button>
                  <button disabled={activeTab.editState.redo.length === 0} onClick={() => patchTab(activeTab.id, tab => ({ editState: redoAdvancedCellEdit(tab.editState) }))} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Redo edit"><Redo2 className="h-3.5 w-3.5" /></button>
                  <button onClick={discardEdits} className="p-1 text-gray-500 hover:bg-gray-100" title="Discard result edits"><RotateCcw className="h-3.5 w-3.5" /></button>
                  {canCommitActive && hasActivePendingChanges && <button onClick={() => void reviewSourceChanges()} className="flex h-7 items-center gap-1 bg-emerald-700 px-2 text-[10px] font-medium text-white hover:bg-emerald-800" title="Review source transaction"><ShieldCheck className="h-3.5 w-3.5" /> Review</button>}
                </>}
                {activeTab.result && <><div className="ml-3 h-5 border-l border-gray-200" /><button disabled={activeTab.offset === 0 || activeTab.isRunning} onClick={() => runQuery(activeTab.id, { offset: Math.max(0, activeTab.offset - activeTab.limit) })} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Previous page"><ArrowLeft className="h-3.5 w-3.5" /></button><button disabled={!activeTab.result.page.hasMore || activeTab.isRunning} onClick={() => runQuery(activeTab.id, { offset: activeTab.offset + activeTab.limit })} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Next page"><ArrowRight className="h-3.5 w-3.5" /></button><span className="ml-1 text-[10px] text-gray-400">Page {Math.floor(activeTab.offset / activeTab.limit) + 1}</span></>}
                {activeTab.warnings.map(warning => <span key={warning} className="ml-3 truncate text-[10px] text-amber-700">{warning}</span>)}
                {activeTab.result && <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400"><Clock3 className="h-3 w-3" /> {activeTab.result.executionMs} ms</span>}
                {activeResult && <button onClick={() => void copyResult()} className="ml-2 p-1 text-gray-500 hover:bg-gray-100" title="Copy current result as CSV"><Copy className="h-3.5 w-3.5" /></button>}
                {activeResult && <div className="relative ml-2">
                  <button
                    onClick={() => setShowExportMenu(value => !value)}
                    className={`flex h-7 items-center gap-1 px-2 text-[10px] font-medium ${isExportingAll ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="Download result"
                  >
                    {isExportingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  {showExportMenu && <div className="absolute right-0 top-8 z-40 w-52 border border-gray-200 bg-white py-1 text-[11px] text-gray-700 shadow-lg">
                    <div className="border-b border-gray-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Current page</div>
                    {(['csv', 'xlsx', 'json', 'sql'] as const).map(format => (
                      <button key={format} onClick={() => { exportResult(format); setShowExportMenu(false); }} className="flex h-7 w-full items-center justify-between px-2 text-left hover:bg-gray-100">
                        <span>{format.toUpperCase()}</span>
                        <span className="text-[9px] text-gray-400">{hasActivePendingChanges ? 'edited page' : 'page'}</span>
                      </button>
                    ))}
                    <div className="mt-1 border-b border-t border-gray-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Full result</div>
                    {(['csv', 'xlsx', 'json', 'sql'] as const).map(format => (
                      <button key={format} disabled={isExportingAll} onClick={() => { void exportAllResult(format); setShowExportMenu(false); }} className="flex h-7 w-full items-center justify-between px-2 text-left hover:bg-gray-100 disabled:opacity-40">
                        <span>All {format.toUpperCase()}</span>
                        <span className="text-[9px] text-gray-400">paged</span>
                      </button>
                    ))}
                    {(exportProgress || isExportingAll) && <div className="mt-1 border-t border-gray-100 px-2 py-1.5">
                      {exportProgress && <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-blue-700"><Loader2 className="h-3 w-3 animate-spin" /> {exportProgress.format} {exportProgress.rows.toLocaleString('en')} rows</div>}
                      {isExportingAll && <button onClick={() => { cancelFullExport(); setShowExportMenu(false); }} className="h-7 w-full text-left text-[10px] font-semibold text-red-600 hover:bg-red-50">Cancel full export</button>}
                    </div>}
                  </div>}
                </div>}
              </div>
              {activeTab.result && workspaceProvider !== 'mongodb' && (
                <div className="hidden min-h-9 shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-2 py-1 md:flex">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  <select aria-label="Filter group combinator" value={activeTab.filterCombinator} onChange={event => patchTab(activeTab.id, { filterCombinator: event.target.value as 'and' | 'or' })} className="h-7 border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                  <select aria-label="Filter column" value={activeTab.filterColumn} onChange={event => patchTab(activeTab.id, { filterColumn: event.target.value })} className="h-7 max-w-[180px] border border-gray-300 bg-white px-2 text-[11px]">
                    {activeTab.result.columns.map(column => <option key={column.id} value={column.name}>{column.name}</option>)}
                  </select>
                  <select aria-label="Filter operator" value={activeTab.filterOperator} onChange={event => patchTab(activeTab.id, { filterOperator: event.target.value as AdvancedFilterOperator })} className="h-7 border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="contains">contains</option>
                    <option value="not_contains">not contains</option>
                    <option value="equals">equals</option>
                    <option value="not_equals">not equals</option>
                    <option value="starts_with">starts with</option>
                    <option value="ends_with">ends with</option>
                    <option value="greater_than">&gt;</option>
                    <option value="greater_or_equal">&gt;=</option>
                    <option value="less_than">&lt;</option>
                    <option value="less_or_equal">&lt;=</option>
                    <option value="is_blank">is blank</option>
                    <option value="is_not_blank">is not blank</option>
                    <option value="in">in list</option>
                    <option value="not_in">not in list</option>
                  </select>
                  <input aria-label="Filter value" value={activeTab.filterValue} disabled={['is_blank', 'is_not_blank'].includes(activeTab.filterOperator)} onChange={event => patchTab(activeTab.id, { filterValue: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') applyFilter(); }} className="h-7 min-w-0 flex-1 border border-gray-300 bg-white px-2 text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" placeholder={activeTab.filterOperator === 'in' || activeTab.filterOperator === 'not_in' ? 'comma,separated,values' : ''} />
                  <button onClick={applyFilter} disabled={activeTab.isRunning} className="h-7 bg-gray-800 px-3 text-[11px] font-medium text-white disabled:opacity-40">Add</button>
                  <button onClick={() => { patchTab(activeTab.id, { filterValue: '', filters: [] }); void runQuery(activeTab.id, { offset: 0, filters: [] }); }} disabled={activeTab.filters.length === 0 || activeTab.isRunning} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-30" title="Clear filter"><X className="h-3.5 w-3.5" /></button>
                  {activeTab.filters.map((filter, index) => <span key={`${filter.column}:${filter.operator}:${index}`} className="inline-flex h-6 max-w-[260px] items-center gap-1 border border-blue-200 bg-blue-50 px-1.5 text-[10px] text-blue-800"><span className="truncate">{filter.column} {filter.operator.replaceAll('_', ' ')} {filter.value}</span><button onClick={() => removeFilter(index)} className="p-0.5 hover:bg-blue-100" title="Remove filter"><X className="h-3 w-3" /></button></span>)}
                </div>
              )}
              {workspaceProvider === 'mongodb' && schema && (
                <div className="hidden min-h-9 shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-2 py-1 md:flex">
                  <Braces className="h-3.5 w-3.5 text-gray-400" />
                  <select aria-label="Mongo filter field" value={activeTab.filterColumn} onChange={event => patchTab(activeTab.id, { filterColumn: event.target.value })} className="h-7 max-w-[180px] border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="">Field...</option>
                    {activeTableNode?.columns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                  <select aria-label="Mongo filter operator" value={activeTab.filterOperator} onChange={event => patchTab(activeTab.id, { filterOperator: event.target.value as AdvancedFilterOperator })} className="h-7 border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="equals">equals</option><option value="not_equals">not equals</option><option value="contains">contains</option><option value="greater_than">&gt;</option><option value="greater_or_equal">&gt;=</option><option value="less_than">&lt;</option><option value="less_or_equal">&lt;=</option><option value="is_blank">is blank</option><option value="is_not_blank">is not blank</option><option value="in">in list</option><option value="not_in">not in list</option>
                  </select>
                  <input aria-label="Mongo filter value" value={activeTab.filterValue} disabled={['is_blank', 'is_not_blank'].includes(activeTab.filterOperator)} onChange={event => patchTab(activeTab.id, { filterValue: event.target.value })} className="h-7 min-w-0 flex-1 border border-gray-300 bg-white px-2 text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" />
                  <select aria-label="Mongo sort column" value={activeTab.sort?.column || ''} onChange={event => patchTab(activeTab.id, { sort: event.target.value ? { column: event.target.value, direction: activeTab.sort?.direction || 'asc' } : undefined })} className="h-7 max-w-[160px] border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="">Sort...</option>
                    {activeTableNode?.columns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                  <select aria-label="Mongo sort direction" value={activeTab.sort?.direction || 'asc'} onChange={event => activeTab.sort && patchTab(activeTab.id, { sort: { ...activeTab.sort, direction: event.target.value as 'asc' | 'desc' } })} className="h-7 border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="asc">ASC</option><option value="desc">DESC</option>
                  </select>
                  <select aria-label="Mongo projection field" value={activeTab.projectionColumn} onChange={event => patchTab(activeTab.id, { projectionColumn: event.target.value })} className="h-7 max-w-[160px] border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="">Project...</option>
                    {activeTableNode?.columns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                  <button onClick={() => applyMongoProjection(1)} disabled={!activeTab.projectionColumn} className="h-7 border border-gray-300 bg-white px-2 text-[10px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-35">Include</button>
                  <button onClick={() => applyMongoProjection(0)} disabled={!activeTab.projectionColumn} className="h-7 border border-gray-300 bg-white px-2 text-[10px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-35">Exclude</button>
                  <button onClick={applyMongoBuilder} className="h-7 bg-gray-800 px-3 text-[11px] font-medium text-white">Apply</button>
                </div>
              )}
              {activeTab.error ? <div className="m-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 font-mono text-[12px] text-red-700">{activeTab.error}</div> : activeTab.isRunning ? <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Executing read-only query...</div> : activeTab.resultView === 'plan' && activeTab.plan !== null ? <QueryPlanView plan={activeTab.plan} /> : displayResult ? <div className="min-h-0 flex-1">{activeTab.resultView === 'grid' ? <VirtualResultGrid result={displayResult} sort={activeTab.sort} onSort={workspaceProvider === 'mongodb' ? () => undefined : toggleSort} columnWidths={activeTab.columnWidths} onColumnResize={resizeVisibleColumn} onColumnMove={moveVisibleColumn} editable={activeTab.editMode} editedKeys={visibleEditedKeys} deletedRows={activeDeletedRows} onEdit={editVisibleCell} onDuplicateRow={canCommitActive ? duplicateRowAsInsert : undefined} onDeleteRow={canCommitActive ? markRowDeleted : undefined} onRestoreRow={canCommitActive ? restoreDeletedRow : undefined} copyTableName={activeTab.tableContext?.table} foreignKeyActions={foreignKeyActions} onRenameColumn={workspaceProvider === 'mongodb' ? undefined : renameResultColumnAlias} /> : activeTab.resultView === 'chart' ? <ResultChart result={displayResult} /> : activeTab.resultView === 'json' ? <ResultJson result={displayResult} /> : <ResultStructure result={displayResult} />}</div> : <div className="flex flex-1 items-center justify-center text-sm text-gray-400">No result set.</div>}
            </div>
          </section>
        </div>
      )}
      {commandOpen && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 p-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Command switcher">
        <div className="flex max-h-[78vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <label className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 px-3 text-gray-400">
            <Search className="h-4 w-4" />
            <input
              autoFocus
              aria-label="Command search"
              value={commandQuery}
              onChange={event => setCommandQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setCommandOpen(false);
                  return;
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setSelectedCommandIndex(index => Math.min(visibleQuickCommands.length - 1, index + 1));
                  return;
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setSelectedCommandIndex(index => Math.max(0, index - 1));
                  return;
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  visibleQuickCommands[selectedCommandIndex]?.run();
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none"
              placeholder="Search tables, tabs, history, favorites, sources"
            />
            <button onClick={() => setCommandOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100" title="Close"><X className="h-4 w-4" /></button>
          </label>
          <div className="min-h-0 flex-1 overflow-auto py-1">
            {visibleQuickCommands.map((command, index) => (
              <button
                key={command.id}
                onMouseEnter={() => setSelectedCommandIndex(index)}
                onClick={command.run}
                className={`flex min-h-11 w-full items-center gap-3 px-3 text-left ${index === selectedCommandIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${index === selectedCommandIndex ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {command.kind === 'table' ? <Table2 className="h-3.5 w-3.5" /> : command.kind === 'tab' ? <Columns className="h-3.5 w-3.5" /> : command.kind === 'history' ? <History className="h-3.5 w-3.5" /> : command.kind === 'favorite' ? <Star className="h-3.5 w-3.5" /> : command.kind === 'source' ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium">{command.title}</span>
                  <span className="block truncate text-[10px] text-gray-500">{command.subtitle}</span>
                </span>
                <span className="shrink-0 text-[9px] uppercase text-gray-400">{command.kind}</span>
              </button>
            ))}
            {visibleQuickCommands.length === 0 && <div className="px-4 py-8 text-center text-[12px] text-gray-400">No commands found.</div>}
          </div>
        </div>
      </div>}
      {renameColumnDraft && <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-label="Rename column alias"
        onMouseDown={event => {
          if (event.target === event.currentTarget) setRenameColumnDraft(null);
        }}
      >
        <form
          className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          onSubmit={event => {
            event.preventDefault();
            confirmRenameResultColumnAlias();
          }}
        >
          <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Pencil className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-950">Rename column alias</h2>
              <p className="mt-1 text-[12px] leading-5 text-gray-500">This changes the result view alias only. Source data stays untouched.</p>
            </div>
            <button
              type="button"
              onClick={() => setRenameColumnDraft(null)}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Current column</div>
              <div className="mt-1 truncate font-mono text-[12px] text-gray-700">{renameColumnDraft.currentName}</div>
            </div>
            <label className="grid gap-1.5 text-[12px] font-medium text-gray-700">
              New alias
              <input
                autoFocus
                value={renameColumnDraft.nextName}
                onChange={event => setRenameColumnDraft(current => current ? { ...current, nextName: event.target.value } : current)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setRenameColumnDraft(null);
                  }
                }}
                className="h-11 rounded-xl border border-gray-300 bg-white px-3 font-mono text-[13px] text-gray-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Column alias"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 bg-gray-50 px-5 py-4">
            <button
              type="button"
              onClick={() => setRenameColumnDraft(null)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!renameColumnDraft.nextName.trim() || renameColumnDraft.nextName.trim() === renameColumnDraft.currentName}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-gray-950 px-3 text-[12px] font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
          </div>
        </form>
      </div>}
      {createTableDraft.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Create table SQL">
        <div className="flex max-h-[86vh] w-full max-w-5xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><Table2 className="h-4 w-4 text-blue-700" /><div><h2 className="text-sm font-semibold text-gray-900">Create table SQL</h2><p className="text-[11px] text-gray-500">Columns, primary keys, indexes, foreign keys, and reviewable DDL.</p></div></div>
          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <div className="min-h-0 overflow-auto p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Schema</span><input aria-label="Create table schema" value={createTableDraft.schemaName} onChange={event => setCreateTableDraft(current => ({ ...current, schemaName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Table</span><input aria-label="Create table name" value={createTableDraft.tableName} onChange={event => setCreateTableDraft(current => ({ ...current, tableName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] outline-none focus:border-blue-500" placeholder="new_table" /></label>
              </div>
              <div className="overflow-x-auto border border-gray-200">
                <div className="grid min-w-[920px] grid-cols-[160px_130px_70px_60px_70px_170px_130px_40px] border-b border-gray-200 bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase text-gray-500">
                  <span>Name</span><span>Type</span><span>Nullable</span><span>PK</span><span>Index</span><span>References table</span><span>Ref column</span><span />
                </div>
                {createTableDraft.columns.map(column => {
                  const updateColumn = (patch: Partial<CreateColumnDraft>) => setCreateTableDraft(current => ({ ...current, columns: current.columns.map(item => item.id === column.id ? { ...item, ...patch } : item) }));
                  return <div key={column.id} className="grid min-w-[920px] grid-cols-[160px_130px_70px_60px_70px_170px_130px_40px] items-center gap-0 border-b border-gray-100 px-2 py-1.5">
                    <input aria-label="Column name" value={column.name} onChange={event => updateColumn({ name: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500" />
                    <input aria-label="Column type" value={column.nativeType} onChange={event => updateColumn({ nativeType: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500" />
                    <label className="flex justify-center"><input aria-label="Column nullable" type="checkbox" checked={column.nullable} onChange={event => updateColumn({ nullable: event.target.checked })} /></label>
                    <label className="flex justify-center"><input aria-label="Column primary key" type="checkbox" checked={column.primaryKey} onChange={event => updateColumn({ primaryKey: event.target.checked, nullable: event.target.checked ? false : column.nullable })} /></label>
                    <label className="flex justify-center"><input aria-label="Column indexed" type="checkbox" checked={column.indexed} onChange={event => updateColumn({ indexed: event.target.checked })} /></label>
                    <input aria-label="References table" value={column.referencesTable} onChange={event => updateColumn({ referencesTable: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500" placeholder="public.parent" />
                    <input aria-label="References column" value={column.referencesColumn} onChange={event => updateColumn({ referencesColumn: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500" placeholder="id" />
                    <button onClick={() => setCreateTableDraft(current => ({ ...current, columns: current.columns.length === 1 ? current.columns : current.columns.filter(item => item.id !== column.id) }))} disabled={createTableDraft.columns.length === 1} className="p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" title="Remove column"><X className="h-3.5 w-3.5" /></button>
                  </div>;
                })}
              </div>
              <button onClick={() => setCreateTableDraft(current => ({ ...current, columns: [...current.columns, createBlankColumnDraft()] }))} className="mt-3 flex h-8 items-center gap-1.5 border border-gray-300 px-3 text-[11px] text-gray-700 hover:bg-gray-50"><Plus className="h-3.5 w-3.5" /> Add column</button>
            </div>
            <div className="flex min-h-0 flex-col border-t border-gray-200 lg:border-l lg:border-t-0">
              <div className="flex h-9 shrink-0 items-center border-b border-gray-200 bg-gray-50 px-3 text-[10px] font-semibold uppercase text-gray-500">SQL preview</div>
              <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{createTableSqlPreview}</pre>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={() => setCreateTableDraft(current => ({ ...current, open: false }))} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Close</button><button onClick={openCreateTableSql} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800"><Code2 className="h-3.5 w-3.5" /> Open SQL in tab</button></div>
        </div>
      </div>}
      {structureDraft.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Edit table structure SQL">
        <div className="flex max-h-[86vh] w-full max-w-5xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><ListTree className="h-4 w-4 text-blue-700" /><div><h2 className="text-sm font-semibold text-gray-900">Edit table structure SQL</h2><p className="text-[11px] text-gray-500">{structureDraft.schemaName}.{structureDraft.originalTableName} · reviewable ALTER script</p></div></div>
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <div className="min-h-0 overflow-auto p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Schema</span><input aria-label="Structure schema" value={structureDraft.schemaName} onChange={event => setStructureDraft(current => ({ ...current, schemaName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Table</span><input aria-label="Structure table name" value={structureDraft.tableName} onChange={event => setStructureDraft(current => ({ ...current, tableName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
              </div>
              <div className="overflow-x-auto border border-gray-200">
                <div className="grid min-w-[1120px] grid-cols-[170px_140px_80px_70px_160px_220px_80px_40px] border-b border-gray-200 bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase text-gray-500">
                  <span>Name</span><span>Type</span><span>Nullable</span><span>PK</span><span>Default</span><span>Comment</span><span>Drop</span><span />
                </div>
                {structureDraft.columns.map(column => {
                  const updateColumn = (patch: Partial<StructureColumnDraft>) => setStructureDraft(current => ({ ...current, columns: current.columns.map(item => item.id === column.id ? { ...item, ...patch } : item) }));
                  return <div key={column.id} className={`grid min-w-[1120px] grid-cols-[170px_140px_80px_70px_160px_220px_80px_40px] items-center border-b border-gray-100 px-2 py-1.5 ${column.drop ? 'bg-red-50 opacity-80' : column.added ? 'bg-emerald-50' : ''}`}>
                    <input aria-label={column.added ? 'New structure column name' : `Structure column ${column.originalName} name`} value={column.name} disabled={column.drop} onChange={event => updateColumn({ name: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" />
                    <input aria-label={column.added ? 'New structure column type' : `Structure column ${column.originalName} type`} value={column.nativeType} disabled={column.drop} onChange={event => updateColumn({ nativeType: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" />
                    <label className="flex justify-center"><input aria-label={column.added ? 'New structure column nullable' : `Structure column ${column.originalName} nullable`} type="checkbox" checked={column.nullable} disabled={column.drop || column.primaryKey} onChange={event => updateColumn({ nullable: event.target.checked })} /></label>
                    <span className="text-center text-[10px] text-gray-500">{column.primaryKey ? 'PK' : column.added ? '-' : ''}</span>
                    <input aria-label={column.added ? 'New structure column default' : `Structure column ${column.originalName} default`} value={column.defaultValue} disabled={column.drop} onChange={event => updateColumn({ defaultValue: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" placeholder="NULL / now()" />
                    <input aria-label={column.added ? 'New structure column comment' : `Structure column ${column.originalName} comment`} value={column.comment} disabled={column.drop} onChange={event => updateColumn({ comment: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" />
                    <label className="flex justify-center"><input aria-label={column.added ? 'Remove new structure column' : `Drop structure column ${column.originalName}`} type="checkbox" checked={column.drop} onChange={event => column.added ? setStructureDraft(current => ({ ...current, columns: current.columns.filter(item => item.id !== column.id) })) : updateColumn({ drop: event.target.checked })} /></label>
                    <span className="text-[9px] uppercase text-gray-400">{column.added ? 'new' : column.name !== column.originalName || column.nativeType !== column.originalType || column.nullable !== column.originalNullable || column.defaultValue !== column.originalDefault || column.comment !== column.originalComment || column.drop ? 'chg' : ''}</span>
                  </div>;
                })}
              </div>
              <button onClick={() => setStructureDraft(current => ({ ...current, columns: [...current.columns, createBlankStructureColumnDraft()] }))} className="mt-3 flex h-8 items-center gap-1.5 border border-gray-300 px-3 text-[11px] text-gray-700 hover:bg-gray-50"><Plus className="h-3.5 w-3.5" /> Add column</button>
              <div className="mt-4 grid gap-3 border border-gray-200 bg-gray-50 p-3">
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Table comment</span><input value={structureDraft.tableComment} onChange={event => setStructureDraft(current => ({ ...current, tableComment: event.target.value }))} className="h-8 border border-gray-300 px-2 text-[11px] outline-none focus:border-blue-500" /></label>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px]">
                  <input value={structureDraft.newIndexName} onChange={event => setStructureDraft(current => ({ ...current, newIndexName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="new index name" />
                  <input value={structureDraft.newIndexColumns} onChange={event => setStructureDraft(current => ({ ...current, newIndexColumns: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="index columns: a,b" />
                  <label className="flex items-center gap-2 text-[11px] text-gray-600"><input type="checkbox" checked={structureDraft.newIndexUnique} onChange={event => setStructureDraft(current => ({ ...current, newIndexUnique: event.target.checked }))} /> Unique</label>
                </div>
                <input value={structureDraft.dropIndexName} onChange={event => setStructureDraft(current => ({ ...current, dropIndexName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="drop index name" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={structureDraft.newForeignKeyName} onChange={event => setStructureDraft(current => ({ ...current, newForeignKeyName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="new FK name" />
                  <input value={structureDraft.foreignKeyColumns} onChange={event => setStructureDraft(current => ({ ...current, foreignKeyColumns: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="FK columns: customer_id" />
                  <input value={structureDraft.foreignKeyReferenceTable} onChange={event => setStructureDraft(current => ({ ...current, foreignKeyReferenceTable: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="reference table: public.customers" />
                  <input value={structureDraft.foreignKeyReferenceColumns} onChange={event => setStructureDraft(current => ({ ...current, foreignKeyReferenceColumns: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="reference columns: id" />
                </div>
                <input value={structureDraft.dropForeignKeyName} onChange={event => setStructureDraft(current => ({ ...current, dropForeignKeyName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="drop foreign key / constraint name" />
                <div className="grid gap-2">
                  <input value={structureDraft.triggerName} onChange={event => setStructureDraft(current => ({ ...current, triggerName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="trigger name" />
                  <textarea value={structureDraft.triggerSql} onChange={event => setStructureDraft(current => ({ ...current, triggerSql: event.target.value }))} className="min-h-20 border border-gray-300 px-2 py-1 font-mono text-[11px] outline-none focus:border-blue-500" placeholder="CREATE TRIGGER ..." />
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-col border-t border-gray-200 lg:border-l lg:border-t-0">
              <div className="flex h-9 shrink-0 items-center border-b border-gray-200 bg-gray-50 px-3 text-[10px] font-semibold uppercase text-gray-500">SQL preview</div>
              <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{generateStructureSql(structureDraft, workspaceProvider)}</pre>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={() => setStructureDraft(current => ({ ...current, open: false }))} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Close</button><button onClick={openStructureSql} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800"><Code2 className="h-3.5 w-3.5" /> Open SQL in tab</button></div>
        </div>
      </div>}
      {mutationReview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Review source transaction">
        <div className="flex max-h-[80vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><ShieldCheck className="h-4 w-4 text-emerald-700" /><div><h2 className="text-sm font-semibold text-gray-900">Review source transaction</h2><p className="text-[11px] text-gray-500">{mutationReview.preview.rowCount} row{mutationReview.preview.rowCount === 1 ? '' : 's'} · optimistic concurrency · one transaction</p></div></div>
          <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{mutationReview.preview.statements.join('\n\n')}</pre>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button disabled={isCommitting} onClick={() => setMutationReview(null)} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Cancel</button><button disabled={isCommitting || !mutationReview.preview.canCommit} onClick={() => void commitSourceChanges()} className="flex h-8 items-center gap-1.5 bg-emerald-700 px-3 text-[11px] font-medium text-white hover:bg-emerald-800 disabled:opacity-40">{isCommitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Commit transaction</button></div>
        </div>
      </div>}
      {scriptReview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Review SQL script transaction">
        <div className="flex max-h-[80vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><ShieldCheck className="h-4 w-4 text-blue-700" /><div><h2 className="text-sm font-semibold text-gray-900">Review SQL script transaction</h2><p className="text-[11px] text-gray-500">{importProgress ? `${importProgress.executed}/${importProgress.total} statements executed` : `${scriptReview.preview.statementCount} statement${scriptReview.preview.statementCount === 1 ? '' : 's'} · rollback on failure`}</p></div></div>
          <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{scriptReview.preview.statements.join('\n\n')}</pre>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={isCommitting ? cancelSqlImport : () => setScriptReview(null)} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">{isCommitting ? 'Cancel import' : 'Cancel'}</button><button disabled={isCommitting || !scriptReview.preview.canCommit} onClick={() => void commitSqlScript()} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800 disabled:opacity-40">{isCommitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Commit script</button></div>
        </div>
      </div>}
      {fileImportDraft.open && activeTableNode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Import CSV or Excel into current table">
        <div className="flex max-h-[82vh] w-full max-w-3xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><FileSpreadsheet className="h-4 w-4 text-blue-700" /><div><h2 className="text-sm font-semibold text-gray-900">Import CSV or Excel</h2><p className="text-[11px] text-gray-500">{fileImportDraft.fileName} to {fileImportDraft.schema}.{fileImportDraft.table}</p></div></div>
          <div className="min-h-0 flex-1 overflow-auto p-4 text-[11px]">
            <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="truncate rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600">Detected columns: {fileImportDraft.headers.join(', ') || 'none'}</div>
              <label className="grid gap-1 text-gray-600"><span className="font-semibold uppercase">Error mode</span><select value={fileImportDraft.errorMode} disabled={fileImportDraft.running} onChange={event => setFileImportDraft(current => ({ ...current, errorMode: event.target.value as FileTableImportDraft['errorMode'] }))} className="h-8 border border-gray-300 bg-white px-2"><option value="stop_rollback">Stop + rollback</option><option value="stop_commit">Stop + commit inserted</option><option value="skip_continue">Skip + continue</option></select></label>
            </div>
            <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500"><span>Column mapping</span><span>{Object.values(fileImportDraft.columnMap).filter(Boolean).length}/{activeTableNode.columns.filter(column => !column.primaryKey).length} mapped</span></div>
              <div className="grid gap-2">
                {activeTableNode.columns.filter(column => !column.primaryKey).map(column => <label key={column.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                  <span className="truncate font-mono text-gray-700">{column.name}</span>
                  <select value={fileImportDraft.columnMap[column.name] ?? ''} disabled={fileImportDraft.running} onChange={event => setFileImportDraft(current => ({ ...current, columnMap: { ...current.columnMap, [column.name]: event.target.value } }))} className="h-7 border border-gray-300 bg-white px-2 font-mono text-[10px]"><option value="">Skip</option>{fileImportDraft.headers.map(header => <option key={header} value={header}>{header}</option>)}</select>
                </label>)}
              </div>
            </div>
            {fileImportDraft.running && <div className="mt-3 flex items-center gap-2 text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Imported {fileImportDraft.importedRows.toLocaleString('en')} / skipped {fileImportDraft.skippedRows.toLocaleString('en')}</div>}
            {fileImportDraft.error && <div className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-red-700">{fileImportDraft.error}</div>}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button disabled={fileImportDraft.running} onClick={() => setFileImportDraft(current => ({ ...current, open: false }))} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Close</button><button disabled={fileImportDraft.running || !fileImportDraft.file || Object.values(fileImportDraft.columnMap).every(value => !value)} onClick={() => void importFileDraftToCurrentTable()} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800 disabled:opacity-40">{fileImportDraft.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Import rows</button></div>
        </div>
      </div>}
      {insertDraft.open && activeTableNode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Insert new row">
        <div className="flex max-h-[82vh] w-full max-w-xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><Plus className="h-4 w-4 text-emerald-700" /><div><h2 className="text-sm font-semibold text-gray-900">Insert new row</h2><p className="text-[11px] text-gray-500">{activeTab.tableContext?.schema}.{activeTab.tableContext?.table} · primary keys use database defaults</p></div></div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div className="grid gap-3">
              {activeTableNode.columns.filter(column => !column.primaryKey).map(column => (
                <label key={column.name} className="grid gap-1 text-[11px] text-gray-600">
                  <span className="flex items-center gap-2"><span className="font-medium text-gray-800">{column.name}</span><span className="font-mono text-[9px] text-gray-400">{column.nativeType}</span>{column.nullable && <span className="text-[9px] text-gray-400">nullable</span>}</span>
                  <input value={insertDraft.values[column.name] ?? ''} onChange={event => setInsertDraft(current => ({ ...current, values: { ...current.values, [column.name]: event.target.value } }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] text-gray-800 outline-none focus:border-emerald-600" />
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={() => setInsertDraft({ open: false, values: {} })} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Cancel</button><button onClick={addInsertDraft} className="flex h-8 items-center gap-1.5 bg-emerald-700 px-3 text-[11px] font-medium text-white hover:bg-emerald-800"><Plus className="h-3.5 w-3.5" /> Add pending row</button></div>
        </div>
      </div>}
      {pendingCloseTabId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Unsaved tab changes">
        <div className="w-full max-w-sm border border-gray-300 bg-white shadow-xl">
          <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-semibold text-gray-900">Unsaved changes</h2><p className="mt-1 text-[12px] text-gray-500">Closing this tab will discard pending result edits, inserts, or deletes.</p></div>
          <div className="flex items-center justify-end gap-2 px-4 py-3"><button onClick={() => setPendingCloseTabId(null)} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Cancel</button><button onClick={() => { const tabId = pendingCloseTabId; setPendingCloseTabId(null); performCloseTab(tabId); }} className="h-8 bg-red-600 px-3 text-[11px] font-medium text-white hover:bg-red-700">Discard and close</button></div>
        </div>
      </div>}
      {sqlAssistant && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="SQL assistant">
        <div className="flex max-h-[82vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><Sparkles className="h-4 w-4 text-blue-600" /><div><h2 className="text-sm font-semibold text-gray-900">SQL assistant</h2><p className="text-[11px] text-gray-500">{sqlAssistant.intent} · {sqlAssistant.risk} risk · static inspection</p></div></div>
          <div className="min-h-0 flex-1 overflow-auto p-4 text-[12px]">
            <div className="mb-4 grid gap-2 rounded-sm border border-gray-200 bg-gray-50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Observations</div>
              {sqlAssistant.observations.map(item => <div key={item} className="text-gray-700">{item}</div>)}
            </div>
            <div className="mb-4 grid gap-2 rounded-sm border border-blue-200 bg-blue-50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Optimize / safety hints</div>
              {sqlAssistant.recommendations.map(item => <div key={item} className="text-blue-900">{item}</div>)}
            </div>
            {sqlAssistant.optimizedSketch && <div className="rounded-sm border border-gray-200"><div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sketch</div><pre className="overflow-auto bg-gray-950 p-3 font-mono text-[11px] leading-5 text-emerald-200">{sqlAssistant.optimizedSketch}</pre></div>}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={() => setSqlAssistant(null)} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Close</button></div>
        </div>
      </div>}
      {importDraft.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Import source into database">
        <div className="flex max-h-[82vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><FileSpreadsheet className="h-4 w-4 text-blue-600" /><div><h2 className="text-sm font-semibold text-gray-900">Import source into database</h2><p className="text-[11px] text-gray-500">Batched inserts from a Simple-understood source into a writable DB table.</p></div></div>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4 text-[12px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-gray-600"><span className="text-[10px] font-semibold uppercase">Source</span><select value={importDraft.sourceId} disabled={importDraft.running} onChange={event => { const source = sources.find(item => item.id === event.target.value); const sourceTable = source?.tables[0]; const [schemaName, tableName] = importDraft.target.split('.'); const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table; setImportDraft(current => ({ ...current, sourceId: event.target.value, tableName: sourceTable?.name ?? '', newTableName: sourceTable?.name ? sourceTable.name.replace(/[^a-zA-Z0-9_]+/g, '_').toLocaleLowerCase() : current.newTableName, columnMap: sourceTable && targetTable ? defaultImportColumnMap(sourceTable.columns, targetTable.columns) : {} })); }} className="h-8 border border-gray-300 bg-white px-2 text-[11px]">{sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
              <label className="grid gap-1 text-gray-600"><span className="text-[10px] font-semibold uppercase">Source table</span><select value={importDraft.tableName} disabled={importDraft.running} onChange={event => { const source = sources.find(item => item.id === importDraft.sourceId); const sourceTable = source?.tables.find(table => table.name === event.target.value); const [schemaName, tableName] = importDraft.target.split('.'); const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table; setImportDraft(current => ({ ...current, tableName: event.target.value, newTableName: sourceTable?.name ? sourceTable.name.replace(/[^a-zA-Z0-9_]+/g, '_').toLocaleLowerCase() : current.newTableName, columnMap: sourceTable && targetTable ? defaultImportColumnMap(sourceTable.columns, targetTable.columns) : {} })); }} className="h-8 border border-gray-300 bg-white px-2 text-[11px]">{sources.find(source => source.id === importDraft.sourceId)?.tables.map(table => <option key={table.name} value={table.name}>{table.name}</option>)}</select></label>
              <label className="grid gap-1 text-gray-600"><span className="text-[10px] font-semibold uppercase">Target table</span><select value={importDraft.target} disabled={importDraft.running} onChange={event => { const sourceTable = sources.find(source => source.id === importDraft.sourceId)?.tables.find(table => table.name === importDraft.tableName); const [schemaName, tableName] = event.target.value.split('.'); const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table; setImportDraft(current => ({ ...current, target: event.target.value, columnMap: sourceTable && targetTable ? defaultImportColumnMap(sourceTable.columns, targetTable.columns) : {} })); }} className="h-8 border border-gray-300 bg-white px-2 text-[11px]"><option value={CREATE_NEW_IMPORT_TARGET}>Create new table script</option>{writableTables.map(item => <option key={`${item.schemaName}.${item.table.name}`} value={`${item.schemaName}.${item.table.name}`}>{item.schemaName}.{item.table.name}</option>)}</select></label>
            </div>
            {importDraft.target === CREATE_NEW_IMPORT_TARGET && <div className="grid gap-3 rounded-sm border border-blue-100 bg-blue-50 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <label className="grid gap-1 text-[11px] text-blue-900"><span className="font-semibold uppercase">New schema</span><input aria-label="Import new schema" value={importDraft.newSchemaName} disabled={importDraft.running} onChange={event => setImportDraft(current => ({ ...current, newSchemaName: event.target.value }))} className="h-8 border border-blue-200 bg-white px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
              <label className="grid gap-1 text-[11px] text-blue-900"><span className="font-semibold uppercase">New table</span><input aria-label="Import new table" value={importDraft.newTableName} disabled={importDraft.running} onChange={event => setImportDraft(current => ({ ...current, newTableName: event.target.value }))} className="h-8 border border-blue-200 bg-white px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
            </div>}
            {(() => {
              const sourceTable = sources.find(source => source.id === importDraft.sourceId)?.tables.find(table => table.name === importDraft.tableName);
              const [schemaName, tableName] = importDraft.target.split('.');
              const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table;
              const targets = targetTable?.columns.filter(column => !column.primaryKey) ?? [];
              const mappedCount = targets.filter(column => importDraft.columnMap[column.name]).length;
              if (importDraft.target === CREATE_NEW_IMPORT_TARGET) {
                return <div className="rounded-sm border border-gray-200 bg-gray-50 p-3"><div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500"><span>Generated columns</span><span>{sourceTable?.columns.length ?? 0}</span></div>{sourceTable ? <div className="grid gap-1">{sourceTable.columns.map(column => <div key={column} className="grid grid-cols-[minmax(0,1fr)_120px] gap-2 text-[11px]"><span className="truncate font-mono text-gray-700">{column}</span><span className="font-mono text-gray-500">{importColumnSqlType(sourceTable.profiles[column]?.dataType)}</span></div>)}</div> : <div className="text-red-700">Choose a source table.</div>}</div>;
              }
              return <div className="rounded-sm border border-gray-200 bg-gray-50 p-3"><div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500"><span>Column mapping</span><span>{mappedCount}/{targets.length} mapped</span></div>{sourceTable && targetTable && targets.length ? <div className="grid gap-2">{targets.map(column => <label key={column.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-[11px]"><span className="truncate font-mono text-gray-700">{column.name}</span><select value={importDraft.columnMap[column.name] ?? ''} disabled={importDraft.running} onChange={event => setImportDraft(current => ({ ...current, columnMap: { ...current.columnMap, [column.name]: event.target.value } }))} className="h-7 border border-gray-300 bg-white px-2 font-mono text-[10px]"><option value="">Skip</option>{sourceTable.columns.map(sourceColumn => <option key={sourceColumn} value={sourceColumn}>{sourceColumn}</option>)}</select></label>)}</div> : <div className="text-red-700">Choose a source and target table.</div>}</div>;
            })()}
            {importDraft.running && <div className="flex items-center gap-2 text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Imported {importDraft.importedRows.toLocaleString('en')} rows...</div>}
            {importDraft.error && <div className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-red-700">{importDraft.error}</div>}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button disabled={importDraft.running} onClick={() => setImportDraft(current => ({ ...current, open: false }))} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Close</button><button disabled={importDraft.running || !importDraft.sourceId || !importDraft.tableName || !importDraft.target || (importDraft.target === CREATE_NEW_IMPORT_TARGET && !importDraft.newTableName.trim())} onClick={() => void importSourceIntoTable()} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800 disabled:opacity-40">{importDraft.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} {importDraft.target === CREATE_NEW_IMPORT_TARGET ? 'Generate SQL' : 'Import'}</button></div>
        </div>
      </div>}
    </div>
  );
};
