import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { QueryCellValue } from '@lightbi/core-types';
import { ExecutionRunCoordinator } from '@lightbi/runtime';
import {
  cancelAdvancedRun,
  closeAdvancedConnection,
  createAdvancedConnection,
  createAdvancedConnectionFromProfile,
  executeAdvancedQuery,
  executeAdvancedDocumentQuery,
  explainAdvancedQuery,
  loadAdvancedFavorites,
  loadAdvancedHistory,
  loadAdvancedProviderPlugins,
  loadAdvancedProfiles,
  loadAdvancedSchema,
  loadAdvancedTableCount,
  saveAdvancedFavorite,
  saveAdvancedHistory,
  saveAdvancedProfile,
  type AdvancedConnection,
  type AdvancedConnectionProfile,
  type AdvancedFilter,
  type AdvancedFilterGroup,
  type AdvancedFavorite,
  type AdvancedMutationPreview,
  type AdvancedMutationRequest,
  type AdvancedQueryResult,
  type AdvancedProviderPlugin,
  type AdvancedSchema,
  type AdvancedScriptPreview,
  type AdvancedSort,
  type AdvancedTableNode,
} from '../lib/advanced-api';
import {
  ADVANCED_TABS_STORAGE_KEY,
  createAdvancedTab,
  serializeAdvancedTabs,
  type AdvancedHistoryEntry,
} from '../lib/advanced-workspace';
import {
  CREATE_NEW_IMPORT_TARGET,
  analyzeSqlForAssistant,
  buildRenamedResultSql,
  createBlankColumnDraft,
  defaultImportColumnMap,
  generateCreateTableSql,
  generateStructureSql,
  hydrateTab,
  materializeSqlParameters,
  mongoFilterValue,
  qualifiedTableReference,
  quoteIdentifier,
  quoteMysqlIdentifier,
  reconcileSqlParameters,
  splitReferencedTable,
  sqlLiteral,
  structureDraftFromTable,
  type CreateTableDraft,
  type FileTableImportDraft,
  type ImportDraft,
  type SqlAssistantBrief,
  type StructureTableDraft,
  type WorkspaceTab,
} from '../lib/advanced-workspace-helpers';
import { AdvancedFileSession } from '../lib/advanced-file-session';
import {
  applyAdvancedEdits,
  EMPTY_ADVANCED_EDIT_STATE,
  projectAdvancedColumns,
} from '../lib/advanced-edit-session';
import { useAdvancedSourceStore, type AdvancedWorkspaceSource } from '../stores/advanced-source-store';
import { classifyAdvancedResultCompleteness } from '../lib/advanced-result-handoff';
import type { GridForeignKeyAction } from '../components/advanced/VirtualResultGrid';
import { createAdvancedResultTransferActions } from '../hooks/useAdvancedResultTransferActions';
import { createAdvancedMutationActions } from '../hooks/useAdvancedMutationActions';
import { AdvancedWorkspaceView } from '../components/advanced/AdvancedWorkspaceView';
import { FALLBACK_PROVIDER_PLUGINS, loadAdvancedTabs, providerDisplayName } from '../lib/advanced-provider-support';
import { buildAdvancedQuickCommands, filterAdvancedQuickCommands } from '../lib/advanced-command-palette';

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
  const [tabs, setTabs] = useState<WorkspaceTab[]>(loadAdvancedTabs);
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
    let active = true;
    void loadAdvancedProviderPlugins(controller.signal)
      .then(providers => {
        if (active && providers.length > 0) setProviderPlugins(providers);
      })
      .catch(error => {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setProviderPlugins(FALLBACK_PROVIDER_PLUGINS);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
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
  const displayResultCompleteness = useMemo(() => displayResult ? classifyAdvancedResultCompleteness(displayResult) : null, [displayResult]);
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

  const addTab = (initial?: Partial<WorkspaceTab>) => {
    const tab = { ...hydrateTab(createAdvancedTab(tabs.length + 1, initial)), ...initial } as WorkspaceTab;
    setTabs(current => [...current, tab]);
    setActiveTabId(tab.id);
    return tab;
  };

  const { analyzeActiveResultInSimple, cancelFullExport, cancelSqlImport, copyResult, exportAllResult, exportResult, importSourceIntoTable, runAllStatements } = createAdvancedResultTransferActions({
    activeTab, addTab, connection, displayResult, exportCancelRef, exportJobIdRef, fileSession, fileSource, hasActivePendingChanges, importDraft, importJobIdRef, patchTab, recordHistory, refreshSchema, runQuery, setActiveTabId, setExportProgress, setImportDraft, setIsExportingAll, setTabs, sources, tabs, workspaceProvider, writableTables,
  });
  const { addInsertDraft, commitSourceChanges, commitSqlScript, discardEdits, duplicateRowAsInsert, editVisibleCell, importFileDraftToCurrentTable, importSqlFile, markRowDeleted, openFileImportDraft, openInsertDraft, restoreDeletedRow, reviewSourceChanges, reviewSqlScript } = createAdvancedMutationActions({
    activeResult, activeTab, activeTableNode, addTab, connection, displayResult, fileImportDraft, importJobIdRef, insertDraft, mutationReview, patchTab, refreshSchema, schema, scriptReview, setFileImportDraft, setImportProgress, setInsertDraft, setIsCommitting, setMutationReview, setScriptReview,
  });
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

  const quickCommands = buildAdvancedQuickCommands({
    activeTab, addFavorite, addTab, applyFavorite, applyHistory, favorites, history,
    onClose: () => { setCommandOpen(false); setCommandQuery(''); setSelectedCommandIndex(0); },
    openFileSource, orderedSources, runQuery, schema, selectTable, setActiveTabId, tabs,
  });
  const visibleQuickCommands = filterAdvancedQuickCommands(quickCommands, commandQuery);

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

  return <AdvancedWorkspaceView model={{
    workspaceProvider, connection, fileSource, disconnect, orderedSources, preferredSourceId, isConnecting, profiles, providerPlugins, selectedProfileId, connectionProvider, connectionName, connectionUrl, databaseName, tlsMode, safeMode, profileGroupName, profileTagName, sshHost, sshUser, sshPort, saveProfile, connectionError, openFileSource, connect, handleProviderChange, handleProfileChange, setConnectionName, setConnectionUrl, setDatabaseName, setTlsMode, setSafeMode, setProfileGroupName, setProfileTagName, setSshHost, setSshUser, setSshPort, setSaveProfile,
    setSideView, sideView, refreshSchema, schema, selectTable, exactCounts, requestExactCount, history, applyHistory, setHistory, favorites, applyFavorite, setFavorites, tabs, tabHasPendingChanges, activeTab, setActiveTabId, closeTab, addTab, runQuery, runAllStatements, cancelQuery, explainQuery, reviewSqlScript, sqlFileInputRef, importSqlFile, csvFileInputRef, openFileImportDraft, canCommitActive, isCommitting, openSqlAssistant, openCreateTableDraft, activeTableNode, openStructureDraft, sources, openImportDraft, addFavorite, setCommandOpen, patchTab, statusText,
    displayResult, analyzeActiveResultInSimple, displayResultCompleteness, activeResult, setShowColumnMenu, visibleResult, showColumnMenu, openInsertDraft, hasActivePendingChanges, activeChangeCount, activeInsertCount, activeDeleteCount, discardEdits, reviewSourceChanges, copyResult, setShowExportMenu, isExportingAll, showExportMenu, exportResult, exportAllResult, exportProgress, cancelFullExport, applyFilter, removeFilter, applyMongoProjection, applyMongoBuilder, toggleSort, resizeVisibleColumn, moveVisibleColumn, visibleEditedKeys, activeDeletedRows, editVisibleCell,
    duplicateRowAsInsert, markRowDeleted, restoreDeletedRow, foreignKeyActions, renameResultColumnAlias, commandOpen, commandQuery, setCommandQuery, setSelectedCommandIndex, visibleQuickCommands, selectedCommandIndex, renameColumnDraft, setRenameColumnDraft, confirmRenameResultColumnAlias, createTableDraft, setCreateTableDraft, createTableSqlPreview, openCreateTableSql, structureDraft, setStructureDraft, openStructureSql, mutationReview, setMutationReview, commitSourceChanges, scriptReview, importProgress, cancelSqlImport, setScriptReview, commitSqlScript,
    fileImportDraft, setFileImportDraft, importFileDraftToCurrentTable, insertDraft, setInsertDraft, addInsertDraft, pendingCloseTabId, setPendingCloseTabId, performCloseTab, sqlAssistant, setSqlAssistant, importDraft, writableTables, setImportDraft, importSourceIntoTable,
  }} />;
};
