import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { QueryCellValue } from '@lightbi/core-types';
import { ExecutionRunCoordinator } from '@lightbi/runtime';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Braces,
  ChevronDown,
  ChevronRight,
  Clock3,
  Columns,
  Copy,
  Database,
  Download,
  EyeOff,
  FileSearch,
  FileSpreadsheet,
  History,
  Filter,
  Loader2,
  Play,
  Plug,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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
  commitAdvancedMutation,
  closeAdvancedConnection,
  createAdvancedConnection,
  createAdvancedConnectionFromProfile,
  executeAdvancedQuery,
  executeAdvancedDocumentQuery,
  explainAdvancedQuery,
  clearAdvancedHistory,
  deleteAdvancedFavorite,
  loadAdvancedFavorites,
  loadAdvancedHistory,
  loadAdvancedProfiles,
  loadAdvancedSchema,
  loadAdvancedTableCount,
  previewAdvancedMutation,
  saveAdvancedFavorite,
  saveAdvancedHistory,
  saveAdvancedProfile,
  type AdvancedConnection,
  type AdvancedConnectionProfile,
  type AdvancedFilter,
  type AdvancedFilterOperator,
  type AdvancedFavorite,
  type AdvancedMutationPreview,
  type AdvancedMutationRequest,
  type AdvancedQueryResult,
  type AdvancedSchema,
  type AdvancedSort,
  type AdvancedTableNode,
} from '../lib/advanced-api';
import {
  ADVANCED_TABS_STORAGE_KEY,
  advancedResultToCsv,
  createAdvancedId,
  createAdvancedTab,
  restoreAdvancedTabs,
  serializeAdvancedTabs,
  splitAdvancedStatements,
  type AdvancedHistoryEntry,
  type PersistedAdvancedTab,
} from '../lib/advanced-workspace';
import { AdvancedFileSession } from '../lib/advanced-file-session';
import {
  applyAdvancedEdits,
  buildAdvancedMutationRows,
  EMPTY_ADVANCED_EDIT_STATE,
  recordAdvancedCellEdit,
  redoAdvancedCellEdit,
  projectAdvancedColumns,
  undoAdvancedCellEdit,
  type AdvancedEditState,
} from '../lib/advanced-edit-session';
import { useAdvancedSourceStore, type AdvancedWorkspaceSource } from '../stores/advanced-source-store';

const ROW_HEIGHT = 30;
const GRID_HEIGHT = 360;
const OVERSCAN = 8;

type ResultView = 'grid' | 'chart' | 'json' | 'structure' | 'plan';
type WorkspaceTab = PersistedAdvancedTab & {
  offset: number;
  result: AdvancedQueryResult | null;
  warnings: string[];
  error: string;
  isRunning: boolean;
  resultView: ResultView;
  sort?: AdvancedSort;
  filters: AdvancedFilter[];
  filterColumn: string;
  filterOperator: AdvancedFilterOperator;
  filterValue: string;
  plan: unknown | null;
  editMode: boolean;
  editState: AdvancedEditState;
  hiddenColumnIds: string[];
  tableContext?: { schema: string; table: string };
};

function hydrateTab(tab: PersistedAdvancedTab): WorkspaceTab {
  return {
    ...tab,
    offset: 0,
    result: null,
    warnings: [],
    error: '',
    isRunning: false,
    resultView: 'grid',
    filters: [],
    filterColumn: '',
    filterOperator: 'contains',
    filterValue: '',
    plan: null,
    editMode: false,
    editState: EMPTY_ADVANCED_EDIT_STATE,
    hiddenColumnIds: [],
  };
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function displayCell(value: QueryCellValue): string {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function compactCount(value?: number | null): string {
  if (value === undefined || value === null || value < 0) return '';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function loadTabs(): WorkspaceTab[] {
  return restoreAdvancedTabs(localStorage.getItem(ADVANCED_TABS_STORAGE_KEY)).map(hydrateTab);
}

const VirtualResultGrid: React.FC<{
  result: AdvancedQueryResult;
  sort?: AdvancedSort;
  onSort: (column: string) => void;
  editable?: boolean;
  editedKeys?: Set<string>;
  onEdit?: (rowIndex: number, columnIndex: number, oldValue: QueryCellValue, newValue: QueryCellValue) => void;
}> = ({ result, sort, onSort, editable = false, editedKeys = new Set(), onEdit }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState<{ rowIndex: number; columnIndex: number; value: string } | null>(null);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(GRID_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const end = Math.min(result.rows.length, start + visibleCount);
  const gridWidth = Math.max(720, result.columns.length * 180);
  const template = `repeat(${Math.max(result.columns.length, 1)}, minmax(180px, 1fr))`;
  const commitEdit = (rowIndex: number, columnIndex: number, oldValue: QueryCellValue, text: string) => {
    const logicalType = result.columns[columnIndex]?.logicalType;
    let value: QueryCellValue = text;
    if (logicalType === 'number' && text.trim() !== '' && Number.isFinite(Number(text))) value = Number(text);
    else if (logicalType === 'boolean' && /^(true|false)$/i.test(text.trim())) value = text.trim().toLowerCase() === 'true';
    onEdit?.(rowIndex, columnIndex, oldValue, value);
    setEditing(null);
  };

  return (
    <div className="h-full min-h-0 overflow-auto bg-white" onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
      <div style={{ width: gridWidth }}>
        <div className="sticky top-0 z-10 grid h-8 border-b border-gray-300 bg-gray-100 text-[11px] font-semibold text-gray-600" style={{ gridTemplateColumns: template }}>
          {result.columns.map(column => (
            <button
              key={column.id}
              className="flex min-w-0 items-center gap-2 border-r border-gray-200 px-2 text-left hover:bg-gray-200"
              title={`Sort by ${column.name} · ${column.nativeType || column.logicalType}`}
              onClick={() => onSort(column.name)}
            >
              <span className="truncate">{column.name}</span>
              {sort?.column === column.name && (sort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              <span className="ml-auto shrink-0 font-mono text-[9px] font-normal text-gray-400">{column.nativeType || column.logicalType}</span>
            </button>
          ))}
        </div>
        <div className="relative" style={{ height: result.rows.length * ROW_HEIGHT }}>
          {result.rows.slice(start, end).map((row, relativeIndex) => {
            const rowIndex = start + relativeIndex;
            return (
              <div
                key={rowIndex}
                className="absolute grid border-b border-gray-100 text-[12px] text-gray-700 hover:bg-blue-50"
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT, width: gridWidth, gridTemplateColumns: template }}
              >
                {result.columns.map((column, columnIndex) => {
                  const value = row[columnIndex] ?? null;
                  const isEditing = editing?.rowIndex === rowIndex && editing.columnIndex === columnIndex;
                  const changed = editedKeys.has(`${rowIndex}:${columnIndex}`);
                  return (
                  <div
                    key={column.id}
                    className={`min-w-0 truncate border-r border-gray-100 px-2 py-1.5 font-mono ${value === null ? 'italic text-gray-400' : ''} ${changed ? 'bg-amber-100 text-amber-950' : ''} ${editable ? 'cursor-text' : ''}`}
                    title={editable ? `Edit ${column.name}` : displayCell(value)}
                    onDoubleClick={() => editable && setEditing({ rowIndex, columnIndex, value: value === null ? '' : String(value) })}
                  >
                    {isEditing ? <input autoFocus value={editing.value} onChange={event => setEditing({ ...editing, value: event.target.value })} onBlur={() => commitEdit(rowIndex, columnIndex, value, editing.value)} onKeyDown={event => { if (event.key === 'Enter') commitEdit(rowIndex, columnIndex, value, editing.value); if (event.key === 'Escape') setEditing(null); }} className="h-6 w-full border border-blue-500 bg-white px-1 font-mono text-[12px] not-italic text-gray-900 outline-none" /> : displayCell(value)}
                  </div>
                );})}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ResultChart: React.FC<{ result: AdvancedQueryResult }> = ({ result }) => {
  const numericIndex = result.columns.findIndex(column => column.logicalType === 'number');
  const categoryIndex = result.columns.findIndex((column, index) => index !== numericIndex && (column.logicalType === 'string' || column.logicalType === 'date'));
  if (numericIndex < 0 || categoryIndex < 0) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-500">A category/date column and numeric column are required.</div>;
  }
  const numeric = result.columns[numericIndex];
  const category = result.columns[categoryIndex];
  const rows = result.rows.slice(0, 100);
  const option = {
    animation: false,
    tooltip: { trigger: 'axis' },
    grid: { left: 56, right: 24, top: 32, bottom: 64 },
    xAxis: { type: 'category', name: category.name, data: rows.map(row => displayCell(row[categoryIndex] ?? null)), axisLabel: { color: '#6b7280', hideOverlap: true, rotate: rows.length > 18 ? 35 : 0 } },
    yAxis: { type: 'value', name: numeric.name, splitLine: { lineStyle: { color: '#e5e7eb' } } },
    series: [{ name: numeric.name, type: category.logicalType === 'date' ? 'line' : 'bar', data: rows.map(row => Number(row[numericIndex]) || 0), itemStyle: { color: '#2563eb' }, lineStyle: { color: '#2563eb' } }],
  };
  return <ReactECharts option={option} style={{ height: '100%', minHeight: 320 }} />;
};

const ResultJson: React.FC<{ result: AdvancedQueryResult }> = ({ result }) => {
  const rows = result.rows.map(row => Object.fromEntries(result.columns.map((column, index) => [column.name, row[index] ?? null])));
  return <pre className="h-full min-h-0 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{JSON.stringify(rows, null, 2)}</pre>;
};

const ResultStructure: React.FC<{ result: AdvancedQueryResult }> = ({ result }) => {
  const profiles = useMemo(() => result.columns.map((column, columnIndex) => {
    const values = result.rows.map(row => row[columnIndex] ?? null);
    const present = values.filter(value => value !== null);
    const distinct = new Set(present.map(value => typeof value === 'object' ? JSON.stringify(value) : String(value)));
    const numeric = present.map(Number).filter(Number.isFinite);
    return {
      column,
      nulls: values.length - present.length,
      distinct: distinct.size,
      minimum: numeric.length ? Math.min(...numeric) : null,
      maximum: numeric.length ? Math.max(...numeric) : null,
      example: present[0] ?? null,
    };
  }), [result]);
  return (
    <div className="h-full overflow-auto bg-white">
      <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
        <thead className="sticky top-0 bg-gray-100 text-gray-600"><tr>{['Column', 'Logical type', 'Native type', 'Nulls', 'Distinct', 'Min', 'Max', 'Example'].map(label => <th key={label} className="border-b border-r border-gray-200 px-3 py-2 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{profiles.map(profile => <tr key={profile.column.id} className="border-b border-gray-100 hover:bg-blue-50">
          <td className="border-r border-gray-100 px-3 py-2 font-medium text-gray-800">{profile.column.name}</td>
          <td className="border-r border-gray-100 px-3 py-2">{profile.column.logicalType}</td>
          <td className="border-r border-gray-100 px-3 py-2 font-mono text-gray-500">{profile.column.nativeType || '-'}</td>
          <td className="border-r border-gray-100 px-3 py-2 tabular-nums">{profile.nulls}</td>
          <td className="border-r border-gray-100 px-3 py-2 tabular-nums">{profile.distinct}</td>
          <td className="border-r border-gray-100 px-3 py-2 font-mono">{profile.minimum ?? '-'}</td>
          <td className="border-r border-gray-100 px-3 py-2 font-mono">{profile.maximum ?? '-'}</td>
          <td className="max-w-[260px] truncate px-3 py-2 font-mono" title={displayCell(profile.example)}>{displayCell(profile.example)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
};

const SchemaTree: React.FC<{
  schema: AdvancedSchema;
  onSelectTable: (schemaName: string, table: AdvancedTableNode) => void;
  exactCounts: Record<string, { status: 'loading' | 'ready' | 'failed'; count?: number }>;
  onRequestCount: (schemaName: string, table: AdvancedTableNode) => void;
}> = ({ schema, onSelectTable, exactCounts, onRequestCount }) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({ public: true });
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return (
    <div className="py-1 text-[12px]">
      <label className="mx-2 mb-1 flex h-7 items-center gap-1.5 border border-gray-200 bg-white px-2 text-gray-400"><Search className="h-3 w-3" /><input aria-label="Search tables" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[11px] text-gray-700 outline-none" placeholder="Search tables" /></label>
      {schema.schemas.map(schemaNode => {
        const visibleTables = normalizedSearch ? schemaNode.tables.filter(table => table.name.toLocaleLowerCase().includes(normalizedSearch)) : schemaNode.tables;
        if (normalizedSearch && visibleTables.length === 0) return null;
        const schemaOpen = expandedSchemas[schemaNode.name] ?? false;
        return (
          <div key={schemaNode.name}>
            <button className="flex h-7 w-full items-center gap-1 px-2 text-left font-medium text-gray-700 hover:bg-gray-100" onClick={() => setExpandedSchemas(current => ({ ...current, [schemaNode.name]: !schemaOpen }))}>
              {schemaOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <Database className="h-3.5 w-3.5 text-gray-400" />
              <span className="truncate">{schemaNode.name}</span>
              <span className="ml-auto text-[10px] font-normal text-gray-400">{schemaNode.tables.length}</span>
            </button>
            {(schemaOpen || normalizedSearch) && visibleTables.map(table => {
              const key = `${schemaNode.name}.${table.name}`;
              const tableOpen = expandedTables[key] ?? false;
              return (
                <div key={key}>
                  <div className="flex h-7 items-center pl-6 pr-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700">
                    <button className="p-1" onClick={() => {
                      setExpandedTables(current => ({ ...current, [key]: !tableOpen }));
                      if (!tableOpen) onRequestCount(schemaNode.name, table);
                    }} title="Toggle columns">
                      {tableOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                    <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onSelectTable(schemaNode.name, table)} title={`Open ${key}`}>
                      <Table2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{table.name}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                        {exactCounts[key]?.status === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : exactCounts[key]?.status === 'ready' ? compactCount(exactCounts[key].count) : table.estimatedRows !== undefined && table.estimatedRows !== null ? `~${compactCount(table.estimatedRows)}` : ''}
                      </span>
                    </button>
                  </div>
                  {tableOpen && table.columns.map(column => (
                    <div key={`${key}.${column.name}`} className="flex h-6 items-center gap-2 pl-12 pr-2 text-[11px] text-gray-500">
                      <span className="truncate">{column.name}</span>
                      {column.primaryKey && <span className="shrink-0 bg-amber-100 px-1 text-[8px] font-semibold text-amber-800">PK</span>}
                      <span className="ml-auto shrink-0 font-mono text-[9px] text-gray-400">{column.nativeType}{column.nullable ? '?' : ''}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const HistoryPanel: React.FC<{
  entries: AdvancedHistoryEntry[];
  onSelect: (entry: AdvancedHistoryEntry) => void;
  onClear: () => void;
}> = ({ entries, onSelect, onClear }) => (
  <div className="flex h-full flex-col">
    <div className="flex h-8 items-center justify-between border-b border-gray-200 px-2 text-[10px] text-gray-500">
      <span>{entries.length} executions</span>
      <button className="px-1.5 py-1 hover:bg-gray-200" onClick={onClear}>Clear</button>
    </div>
    <div className="flex-1 overflow-auto">
      {entries.map(entry => (
        <button key={entry.id} className="block w-full border-b border-gray-200 px-3 py-2 text-left hover:bg-gray-100" onClick={() => onSelect(entry)}>
          <div className="truncate font-mono text-[11px] text-gray-700">{entry.sql.replace(/\s+/g, ' ')}</div>
          <div className="mt-1 flex items-center gap-2 text-[9px] text-gray-400">
            <span className={entry.successful ? 'text-emerald-600' : 'text-red-600'}>{entry.successful ? `${entry.rowCount} rows` : 'Failed'}</span>
            <span>{entry.executionMs} ms</span>
            <span className="ml-auto">{new Date(entry.executedAt).toLocaleTimeString()}</span>
          </div>
        </button>
      ))}
      {entries.length === 0 && <div className="p-3 text-[11px] text-gray-400">No query history.</div>}
    </div>
  </div>
);

const FavoritesPanel: React.FC<{
  entries: AdvancedFavorite[];
  onSelect: (entry: AdvancedFavorite) => void;
  onDelete: (entry: AdvancedFavorite) => void;
}> = ({ entries, onSelect, onDelete }) => (
  <div className="h-full overflow-auto">
    {entries.map(entry => (
      <div key={entry.id} className="flex border-b border-gray-200 hover:bg-gray-100">
        <button className="min-w-0 flex-1 px-3 py-2 text-left" onClick={() => onSelect(entry)}>
          <div className="truncate text-[11px] font-medium text-gray-700">{entry.name}</div>
          <div className="mt-1 truncate font-mono text-[9px] text-gray-400">{entry.sql.replace(/\s+/g, ' ')}</div>
        </button>
        <button className="shrink-0 p-2 text-gray-400 hover:text-red-600" onClick={() => onDelete(entry)} title="Delete favorite"><X className="h-3.5 w-3.5" /></button>
      </div>
    ))}
    {entries.length === 0 && <div className="p-3 text-[11px] text-gray-400">No saved queries.</div>}
  </div>
);

export const Advanced: React.FC = () => {
  const coordinators = useRef(new Map<string, ExecutionRunCoordinator>());
  const activeRunIds = useRef(new Map<string, string>());
  const fileSession = useRef(new AdvancedFileSession());
  const sources = useAdvancedSourceStore(state => state.sources);
  const preferredSourceId = useAdvancedSourceStore(state => state.activeSourceId);
  const setPreferredSource = useAdvancedSourceStore(state => state.setActiveSource);
  const [connection, setConnection] = useState<AdvancedConnection | null>(null);
  const [fileSource, setFileSource] = useState<AdvancedWorkspaceSource | null>(null);
  const [schema, setSchema] = useState<AdvancedSchema | null>(null);
  const [connectionName, setConnectionName] = useState('Postgres');
  const [connectionUrl, setConnectionUrl] = useState('');
  const [connectionProvider, setConnectionProvider] = useState<AdvancedConnection['provider']>('postgresql');
  const [databaseName, setDatabaseName] = useState('');
  const [profiles, setProfiles] = useState<AdvancedConnectionProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [saveProfile, setSaveProfile] = useState(false);
  const [tlsMode, setTlsMode] = useState('driver-default');
  const [sshHost, setSshHost] = useState('');
  const [sshUser, setSshUser] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [connectionError, setConnectionError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [exactCounts, setExactCounts] = useState<Record<string, { status: 'loading' | 'ready' | 'failed'; count?: number }>>({});
  const [tabs, setTabs] = useState<WorkspaceTab[]>(loadTabs);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const [sideView, setSideView] = useState<'schema' | 'history' | 'favorites'>('schema');
  const [history, setHistory] = useState<AdvancedHistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<AdvancedFavorite[]>([]);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [mutationReview, setMutationReview] = useState<{ request: AdvancedMutationRequest; preview: AdvancedMutationPreview } | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
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
  const visibleResult = useMemo(() => activeResult ? projectAdvancedColumns(activeResult, activeTab.hiddenColumnIds) : null, [activeResult, activeTab.hiddenColumnIds]);
  const visibleEditedKeys = useMemo(() => {
    if (!activeResult || !visibleResult) return new Set<string>();
    const keys = Object.values(activeTab.editState.changes).flatMap(edit => {
      const columnId = activeResult.columns[edit.columnIndex]?.id;
      const visibleIndex = visibleResult.columns.findIndex(column => column.id === columnId);
      return visibleIndex >= 0 ? [`${edit.rowIndex}:${visibleIndex}`] : [];
    });
    return new Set(keys);
  }, [activeResult, activeTab.editState.changes, visibleResult]);
  const activeTableNode = useMemo(() => activeTab.tableContext
    ? schema?.schemas.find(item => item.name === activeTab.tableContext!.schema)?.tables.find(item => item.name === activeTab.tableContext!.table)
    : undefined, [activeTab.tableContext, schema]);
  const canCommitActive = Boolean(
    connection
    && ['sqlite', 'postgresql', 'mysql', 'mariadb'].includes(connection.provider)
    && activeTableNode?.writable === true
    && activeTableNode.columns.some(column => column.primaryKey)
  );

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    setConnectionError('');
    setIsConnecting(true);
    try {
      const profile = profiles.find(item => item.id === selectedProfileId);
      const nextConnection = profile
        ? await createAdvancedConnectionFromProfile(connectionName, profile)
        : await createAdvancedConnection(connectionName, connectionUrl, connectionProvider, databaseName);
      if (!profile && saveProfile) {
        const saved = await saveAdvancedProfile({ name: connectionName, provider: connectionProvider, database: databaseName, connectionUrl, tlsMode, sshHost: sshHost || undefined, sshPort: sshHost ? sshPort : undefined, sshUser: sshUser || undefined });
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
        patchTab(activeTab.id, { sql: defaultSql, plan: null, result: null, filters: [] });
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
      if (firstTable) patchTab(activeTab.id, { title: firstTable.name, sql: `SELECT *\nFROM ${quoteIdentifier(firstTable.name)}`, result: null, plan: null, filters: [], offset: 0, tableContext: undefined });
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

  const runQuery = async (tabId = activeTab.id, options?: { offset?: number; sort?: AdvancedSort; filters?: AdvancedFilter[] }) => {
    if (!connection && !fileSource) return;
    const tab = tabs.find(candidate => candidate.id === tabId);
    if (!tab?.sql.trim()) return;
    if (Object.keys(tab.editState.changes).length > 0) {
      patchTab(tabId, { warnings: ['Export or discard pending result edits before rerunning, sorting, filtering, or paging.'] });
      return;
    }
    const offset = options?.offset ?? tab.offset;
    const sort = options && 'sort' in options ? options.sort : tab.sort;
    const filters = options && 'filters' in options ? options.filters ?? [] : tab.filters;
    const coordinator = coordinatorFor(tabId);
    const run = coordinator.begin();
    activeRunIds.current.set(tabId, run.id);
    patchTab(tabId, { isRunning: true, error: '', warnings: [], offset, sort, filters });
    try {
      const nextResult = fileSource
        ? await fileSession.current.execute({ runId: run.id, sql: tab.sql, limit: tab.limit, offset, sort, filters, signal: run.signal })
        : connection!.provider === 'mongodb'
          ? await executeAdvancedDocumentQuery(connection!.connectionId, { ...JSON.parse(tab.sql), runId: run.id, limit: tab.limit, offset }, run.signal)
          : await executeAdvancedQuery(connection!.connectionId, { runId: run.id, sql: tab.sql, limit: tab.limit, offset, sort, filters }, run.signal);
      if (!coordinator.isCurrent(run)) return;
      patchTab(tabId, {
        result: nextResult,
        warnings: nextResult.warnings,
        isRunning: false,
        offset: nextResult.page.offset,
        filterColumn: tab.filterColumn || nextResult.columns[0]?.name || '',
        editMode: false,
        editState: EMPTY_ADVANCED_EDIT_STATE,
        hiddenColumnIds: [],
      });
      recordHistory({ sql: tab.sql, executionMs: nextResult.executionMs, rowCount: nextResult.rows.length, successful: true });
      coordinator.finish(run);
      activeRunIds.current.delete(tabId);
    } catch (cause) {
      if (run.signal.aborted) return;
      if (coordinator.isCurrent(run)) {
        const message = cause instanceof Error ? cause.message : 'Query failed.';
        patchTab(tabId, { error: message, isRunning: false });
        recordHistory({ sql: tab.sql, executionMs: 0, rowCount: 0, successful: false, error: message });
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
      const explained = await explainAdvancedQuery(connection.connectionId, activeTab.sql);
      patchTab(activeTab.id, { plan: explained.plan, resultView: 'plan', isRunning: false });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Explain failed.', isRunning: false });
    }
  };

  const runAllStatements = async () => {
    if ((!connection && !fileSource) || connection?.provider === 'mongodb') return;
    const statements = splitAdvancedStatements(activeTab.sql);
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

  const exportResult = () => {
    if (!visibleResult) return;
    const blob = new Blob([advancedResultToCsv(visibleResult.columns, visibleResult.rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeTab.title.replace(/[^a-z0-9_-]+/gi, '_') || 'lightbi-result'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyResult = async () => {
    if (!visibleResult) return;
    const text = advancedResultToCsv(visibleResult.columns, visibleResult.rows);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
  };

  const editCell = (rowIndex: number, columnIndex: number, oldValue: QueryCellValue, newValue: QueryCellValue) => {
    patchTab(activeTab.id, tab => ({ editState: recordAdvancedCellEdit(tab.editState, { rowIndex, columnIndex, oldValue, newValue }), error: '' }));
  };

  const editVisibleCell = (rowIndex: number, visibleColumnIndex: number, oldValue: QueryCellValue, newValue: QueryCellValue) => {
    if (!activeResult || !visibleResult) return;
    const columnId = visibleResult.columns[visibleColumnIndex]?.id;
    const sourceColumnIndex = activeResult.columns.findIndex(column => column.id === columnId);
    if (sourceColumnIndex >= 0) editCell(rowIndex, sourceColumnIndex, oldValue, newValue);
  };

  const discardEdits = () => patchTab(activeTab.id, { editState: EMPTY_ADVANCED_EDIT_STATE, editMode: false, error: '' });

  const reviewSourceChanges = async () => {
    if (!connection || !['sqlite', 'postgresql', 'mysql', 'mariadb'].includes(connection.provider) || !activeTab.result || !activeTab.tableContext) return;
    const schemaNode = schema?.schemas.find(item => item.name === activeTab.tableContext!.schema);
    const table = schemaNode?.tables.find(item => item.name === activeTab.tableContext!.table);
    const primaryKeys = table?.columns.filter(column => column.primaryKey).map(column => column.name) ?? [];
    try {
      const request: AdvancedMutationRequest = {
        schema: activeTab.tableContext.schema,
        table: activeTab.tableContext.table,
        rows: buildAdvancedMutationRows(activeTab.result, activeTab.editState, primaryKeys),
      };
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
      patchTab(activeTab.id, { editState: EMPTY_ADVANCED_EDIT_STATE, editMode: false, result: null, warnings: [`Committed ${committed.updatedRows} row${committed.updatedRows === 1 ? '' : 's'} in one transaction. Run the query to reload source data.`], error: '' });
      await refreshSchema();
    } catch (cause) {
      setMutationReview(null);
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Source commit failed and was rolled back.' });
    } finally {
      setIsCommitting(false);
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
  };

  const closeTab = (tabId: string) => {
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

  const selectTable = (schemaName: string, table: AdvancedTableNode) => {
    if (Object.keys(activeTab.editState.changes).length > 0) {
      patchTab(activeTab.id, { warnings: ['Export or discard pending result edits before switching tables.'] });
      return;
    }
    const title = `${schemaName}.${table.name}`;
    const query = fileSource
      ? `SELECT *\nFROM ${quoteIdentifier(table.name)}`
      : connection?.provider === 'mongodb'
      ? JSON.stringify({ collection: table.name, filter: {}, projection: {}, sort: {} }, null, 2)
      : connection?.provider === 'mysql' || connection?.provider === 'mariadb'
        ? `SELECT *\nFROM \`${schemaName.replaceAll('`', '``')}\`.\`${table.name.replaceAll('`', '``')}\``
        : connection?.provider === 'sqlite'
          ? `SELECT *\nFROM ${quoteIdentifier(table.name)}`
          : `SELECT *\nFROM ${quoteIdentifier(schemaName)}.${quoteIdentifier(table.name)}`;
    const existing = tabs.find(tab => tab.title === title);
    if (existing) {
      patchTab(existing.id, { sql: query, offset: 0, sort: undefined, filters: [], filterValue: '', tableContext: fileSource ? undefined : { schema: schemaName, table: table.name } });
      setActiveTabId(existing.id);
    } else {
      addTab({ title, sql: query, limit: activeTab.limit, tableContext: fileSource ? undefined : { schema: schemaName, table: table.name } });
    }
  };

  const applyHistory = (entry: AdvancedHistoryEntry) => {
    patchTab(activeTab.id, { sql: entry.sql, offset: 0, sort: undefined, filters: [], filterValue: '', error: '' });
  };

  const applyFavorite = (entry: AdvancedFavorite) => {
    patchTab(activeTab.id, { title: entry.name, sql: entry.sql, offset: 0, sort: undefined, filters: [], filterValue: '', error: '' });
  };

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
    const filters = value && activeTab.filterColumn
      ? [{ column: activeTab.filterColumn, operator: activeTab.filterOperator, value }]
      : [];
    void runQuery(activeTab.id, { offset: 0, filters });
  };

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
        <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-50 p-3 sm:p-8">
          <div className="mt-4 w-full max-w-3xl space-y-5 sm:mt-8">
          {orderedSources.length > 0 && <section className="border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <div><h2 className="text-sm font-semibold text-gray-900">Datasets understood in Simple</h2><p className="text-[11px] text-gray-500">Open the original file or online workbook without importing or profiling it again.</p></div>
            </div>
            <div className="divide-y divide-gray-100">
              {orderedSources.map(source => <div key={source.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-blue-50 text-blue-700"><FileSpreadsheet className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-[12px] font-medium text-gray-800">{source.name}</span>{source.id === preferredSourceId && <span className="shrink-0 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-700">Current</span>}</div><p className="truncate text-[10px] text-gray-500">{source.sourceKind === 'online_link' ? 'Online link' : 'Local file'} · {source.tables.length} table{source.tables.length === 1 ? '' : 's'} · {source.tables.reduce((sum, table) => sum + table.rowCount, 0).toLocaleString()} rows</p></div>
                <button type="button" disabled={isConnecting} onClick={() => void openFileSource(source)} className="flex h-8 shrink-0 items-center gap-1.5 bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Open</button>
              </div>)}
            </div>
          </section>}
          <form className="w-full border border-gray-200 bg-white p-4 shadow-sm sm:p-6" onSubmit={connect}>
            <div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center bg-blue-50 text-blue-700"><Plug className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold text-gray-900">Open database session</h2><p className="text-[12px] text-gray-500">Credentials stay in backend memory for this server session.</p></div></div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-provider">Provider</label>
            <select id="advanced-provider" className="mb-4 h-9 w-full border border-gray-300 bg-white px-3 text-sm" value={connectionProvider} onChange={event => { const provider = event.target.value as AdvancedConnection['provider']; setConnectionProvider(provider); setConnectionName(provider === 'postgresql' ? 'Postgres' : provider === 'mongodb' ? 'MongoDB Atlas' : provider === 'sqlite' ? 'SQLite' : provider === 'mariadb' ? 'MariaDB' : 'MySQL'); }}>
              <option value="postgresql">PostgreSQL</option><option value="mysql">MySQL</option><option value="mariadb">MariaDB</option><option value="sqlite">SQLite</option><option value="mongodb">MongoDB / Atlas</option>
            </select>
            {profiles.length > 0 && <><label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-profile">Saved profile</label><select id="advanced-profile" className="mb-4 h-9 w-full border border-gray-300 bg-white px-3 text-sm" value={selectedProfileId} onChange={event => { setSelectedProfileId(event.target.value); const profile = profiles.find(item => item.id === event.target.value); if (profile) { setConnectionName(profile.name); setConnectionProvider(profile.provider); setDatabaseName(profile.database); setTlsMode(profile.tlsMode); } }}><option value="">New connection</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name} · {profile.provider}</option>)}</select></>}
            <label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-name">Connection name</label>
            <input id="advanced-name" className="mb-4 h-9 w-full border border-gray-300 px-3 text-sm outline-none focus:border-blue-500" value={connectionName} onChange={event => setConnectionName(event.target.value)} required />
            <label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-url">Connection URL or SQLite path</label>
            <input id="advanced-url" type="password" disabled={Boolean(selectedProfileId)} className="h-9 w-full border border-gray-300 px-3 font-mono text-sm outline-none focus:border-blue-500 disabled:bg-gray-100" placeholder={selectedProfileId ? 'Encrypted credential from profile' : connectionProvider === 'mongodb' ? 'mongodb+srv://user:password@cluster/database' : connectionProvider === 'sqlite' ? 'sqlite:///path/to/database.db' : `${connectionProvider}://user:password@host/database`} value={connectionUrl} onChange={event => setConnectionUrl(event.target.value)} required={!selectedProfileId} />
            {connectionProvider === 'mongodb' && <><label className="mb-1 mt-4 block text-[11px] font-medium text-gray-600" htmlFor="advanced-database">Database override</label><input id="advanced-database" className="h-9 w-full border border-gray-300 px-3 text-sm" value={databaseName} onChange={event => setDatabaseName(event.target.value)} placeholder="Optional when present in URL" /></>}
            {!selectedProfileId && <div className="mt-4 grid grid-cols-2 gap-3"><label className="block"><span className="text-[11px] font-medium text-gray-600">TLS policy</span><select className="mt-1 h-8 w-full border border-gray-300 bg-white px-2 text-[11px]" value={tlsMode} onChange={event => setTlsMode(event.target.value)}><option value="driver-default">Driver default</option><option value="require">Require TLS</option><option value="verify-full">Verify full</option></select></label><label className="flex items-end gap-2 pb-1 text-[11px] text-gray-600"><input type="checkbox" checked={saveProfile} onChange={event => setSaveProfile(event.target.checked)} /> Save encrypted profile</label><input className="h-8 border border-gray-300 px-2 text-[11px]" value={sshHost} onChange={event => setSshHost(event.target.value)} placeholder="SSH host (profile metadata)" /><div className="flex gap-2"><input className="h-8 min-w-0 flex-1 border border-gray-300 px-2 text-[11px]" value={sshUser} onChange={event => setSshUser(event.target.value)} placeholder="SSH user" /><input type="number" className="h-8 w-16 border border-gray-300 px-2 text-[11px]" value={sshPort} onChange={event => setSshPort(Number(event.target.value) || 22)} /></div></div>}
            {connectionError && <div className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-[12px] text-red-700">{connectionError}</div>}
            <button type="submit" disabled={isConnecting} className="mt-5 flex h-9 items-center gap-2 bg-gray-900 px-4 text-[12px] font-medium text-white hover:bg-gray-800 disabled:opacity-50">{isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Connect</button>
          </form>
          </div>
        </div>
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
              {tabs.map(tab => <div key={tab.id} className={`flex h-8 min-w-[120px] max-w-[220px] items-center border-r border-gray-200 px-2 text-[11px] ${tab.id === activeTab.id ? 'bg-white text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}><button className="min-w-0 flex-1 truncate text-left" onClick={() => setActiveTabId(tab.id)}>{tab.isRunning && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}{tab.title}</button><button className="ml-2 p-0.5 hover:bg-gray-200" onClick={() => closeTab(tab.id)} title="Close tab"><X className="h-3 w-3" /></button></div>)}
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
              <button onClick={addFavorite} className="p-1.5 text-gray-500 hover:bg-gray-200" title="Save query to favorites"><Star className="h-3.5 w-3.5" /></button>
              <div className="ml-2 hidden h-5 border-l border-gray-300 sm:block" />
              <label className="hidden text-[11px] text-gray-500 sm:block" htmlFor="advanced-limit">Rows</label>
              <select id="advanced-limit" value={activeTab.limit} onChange={event => patchTab(activeTab.id, { limit: Number(event.target.value), offset: 0 })} className="hidden h-7 border border-gray-300 bg-white px-2 text-[11px] outline-none sm:block">{[100, 200, 500, 1000].map(value => <option key={value} value={value}>{value}</option>)}</select>
              <span className="ml-auto hidden text-[11px] text-gray-500 sm:block">{statusText}</span>
            </div>

            <div className="h-[210px] shrink-0 border-b border-gray-200">
              <textarea aria-label={workspaceProvider === 'mongodb' ? 'MongoDB document query' : 'SQL query'} spellCheck={false} value={activeTab.sql} onChange={event => patchTab(activeTab.id, { sql: event.target.value, offset: 0, sort: undefined, filters: [], filterValue: '', plan: null, tableContext: undefined })} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void runQuery(); } }} className="h-full w-full resize-none bg-[#fbfbfc] p-4 font-mono text-[13px] leading-6 text-gray-800 outline-none" />
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-gray-200 px-2">
                <button onClick={() => patchTab(activeTab.id, { resultView: 'grid' })} className={`flex h-7 items-center gap-1.5 px-3 text-[11px] ${activeTab.resultView === 'grid' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><Columns className="h-3.5 w-3.5" /> Grid</button>
                <button onClick={() => patchTab(activeTab.id, { resultView: 'chart' })} className={`flex h-7 items-center gap-1.5 px-3 text-[11px] ${activeTab.resultView === 'chart' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><BarChart3 className="h-3.5 w-3.5" /> Chart</button>
                <button onClick={() => patchTab(activeTab.id, { resultView: 'json' })} className={`hidden h-7 items-center gap-1.5 px-3 text-[11px] sm:flex ${activeTab.resultView === 'json' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><Braces className="h-3.5 w-3.5" /> JSON</button>
                <button onClick={() => patchTab(activeTab.id, { resultView: 'structure' })} className={`hidden h-7 items-center gap-1.5 px-3 text-[11px] md:flex ${activeTab.resultView === 'structure' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><ListTree className="h-3.5 w-3.5" /> Structure</button>
                {activeTab.plan !== null && <button onClick={() => patchTab(activeTab.id, { resultView: 'plan' })} className={`flex h-7 items-center gap-1.5 px-3 text-[11px] ${activeTab.resultView === 'plan' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><FileSearch className="h-3.5 w-3.5" /> Plan</button>}
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
                {(Object.keys(activeTab.editState.changes).length > 0 || activeTab.editState.redo.length > 0) && <>
                  {Object.keys(activeTab.editState.changes).length > 0 && <span className="ml-1 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">{Object.keys(activeTab.editState.changes).length} changed</span>}
                  <button disabled={activeTab.editState.undo.length === 0} onClick={() => patchTab(activeTab.id, tab => ({ editState: undoAdvancedCellEdit(tab.editState) }))} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Undo edit"><Undo2 className="h-3.5 w-3.5" /></button>
                  <button disabled={activeTab.editState.redo.length === 0} onClick={() => patchTab(activeTab.id, tab => ({ editState: redoAdvancedCellEdit(tab.editState) }))} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Redo edit"><Redo2 className="h-3.5 w-3.5" /></button>
                  <button onClick={discardEdits} className="p-1 text-gray-500 hover:bg-gray-100" title="Discard result edits"><RotateCcw className="h-3.5 w-3.5" /></button>
                  {canCommitActive && Object.keys(activeTab.editState.changes).length > 0 && <button onClick={() => void reviewSourceChanges()} className="flex h-7 items-center gap-1 bg-emerald-700 px-2 text-[10px] font-medium text-white hover:bg-emerald-800" title="Review source transaction"><ShieldCheck className="h-3.5 w-3.5" /> Review</button>}
                </>}
                {activeTab.result && <><div className="ml-3 h-5 border-l border-gray-200" /><button disabled={activeTab.offset === 0 || activeTab.isRunning} onClick={() => runQuery(activeTab.id, { offset: Math.max(0, activeTab.offset - activeTab.limit) })} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Previous page"><ArrowLeft className="h-3.5 w-3.5" /></button><button disabled={!activeTab.result.page.hasMore || activeTab.isRunning} onClick={() => runQuery(activeTab.id, { offset: activeTab.offset + activeTab.limit })} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Next page"><ArrowRight className="h-3.5 w-3.5" /></button><span className="ml-1 text-[10px] text-gray-400">Page {Math.floor(activeTab.offset / activeTab.limit) + 1}</span></>}
                {activeTab.warnings.map(warning => <span key={warning} className="ml-3 truncate text-[10px] text-amber-700">{warning}</span>)}
                {activeTab.result && <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400"><Clock3 className="h-3 w-3" /> {activeTab.result.executionMs} ms</span>}
                {activeResult && <button onClick={() => void copyResult()} className="ml-2 p-1 text-gray-500 hover:bg-gray-100" title="Copy current result as CSV"><Copy className="h-3.5 w-3.5" /></button>}
                {activeResult && <button onClick={exportResult} className="ml-2 p-1 text-gray-500 hover:bg-gray-100" title={Object.keys(activeTab.editState.changes).length ? 'Export edited result page as CSV' : 'Export current result page as CSV'}><Download className="h-3.5 w-3.5" /></button>}
              </div>
              {activeTab.result && workspaceProvider !== 'mongodb' && (
                <div className="hidden h-9 shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-50 px-2 md:flex">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  <select aria-label="Filter column" value={activeTab.filterColumn} onChange={event => patchTab(activeTab.id, { filterColumn: event.target.value })} className="h-7 max-w-[180px] border border-gray-300 bg-white px-2 text-[11px]">
                    {activeTab.result.columns.map(column => <option key={column.id} value={column.name}>{column.name}</option>)}
                  </select>
                  <select aria-label="Filter operator" value={activeTab.filterOperator} onChange={event => patchTab(activeTab.id, { filterOperator: event.target.value as AdvancedFilterOperator })} className="h-7 border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="contains">contains</option>
                    <option value="equals">equals</option>
                    <option value="starts_with">starts with</option>
                    <option value="ends_with">ends with</option>
                  </select>
                  <input aria-label="Filter value" value={activeTab.filterValue} onChange={event => patchTab(activeTab.id, { filterValue: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') applyFilter(); }} className="h-7 min-w-0 flex-1 border border-gray-300 bg-white px-2 text-[11px] outline-none focus:border-blue-500" />
                  <button onClick={applyFilter} disabled={activeTab.isRunning} className="h-7 bg-gray-800 px-3 text-[11px] font-medium text-white disabled:opacity-40">Apply</button>
                  <button onClick={() => { patchTab(activeTab.id, { filterValue: '', filters: [] }); void runQuery(activeTab.id, { offset: 0, filters: [] }); }} disabled={activeTab.filters.length === 0 || activeTab.isRunning} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-30" title="Clear filter"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              {activeTab.error ? <div className="m-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 font-mono text-[12px] text-red-700">{activeTab.error}</div> : activeTab.isRunning ? <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Executing read-only query...</div> : activeTab.resultView === 'plan' && activeTab.plan !== null ? <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-300">{JSON.stringify(activeTab.plan, null, 2)}</pre> : visibleResult ? <div className="min-h-0 flex-1">{activeTab.resultView === 'grid' ? <VirtualResultGrid result={visibleResult} sort={activeTab.sort} onSort={workspaceProvider === 'mongodb' ? () => undefined : toggleSort} editable={activeTab.editMode} editedKeys={visibleEditedKeys} onEdit={editVisibleCell} /> : activeTab.resultView === 'chart' ? <ResultChart result={visibleResult} /> : activeTab.resultView === 'json' ? <ResultJson result={visibleResult} /> : <ResultStructure result={visibleResult} />}</div> : <div className="flex flex-1 items-center justify-center text-sm text-gray-400">No result set.</div>}
            </div>
          </section>
        </div>
      )}
      {mutationReview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Review source transaction">
        <div className="flex max-h-[80vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><ShieldCheck className="h-4 w-4 text-emerald-700" /><div><h2 className="text-sm font-semibold text-gray-900">Review source transaction</h2><p className="text-[11px] text-gray-500">{mutationReview.preview.rowCount} row{mutationReview.preview.rowCount === 1 ? '' : 's'} · optimistic concurrency · one transaction</p></div></div>
          <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{mutationReview.preview.statements.join('\n\n')}</pre>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button disabled={isCommitting} onClick={() => setMutationReview(null)} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Cancel</button><button disabled={isCommitting || !mutationReview.preview.canCommit} onClick={() => void commitSourceChanges()} className="flex h-8 items-center gap-1.5 bg-emerald-700 px-3 text-[11px] font-medium text-white hover:bg-emerald-800 disabled:opacity-40">{isCommitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Commit transaction</button></div>
        </div>
      </div>}
    </div>
  );
};
