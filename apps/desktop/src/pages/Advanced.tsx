import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as XLSX from 'xlsx';
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
  Plug,
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
  Trash2,
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
  type AdvancedColumnNode,
  type AdvancedConnection,
  type AdvancedConnectionProfile,
  type AdvancedFilter,
  type AdvancedFilterGroup,
  type AdvancedFilterOperator,
  type AdvancedFavorite,
  type AdvancedMutationPreview,
  type AdvancedMutationRequest,
  type AdvancedQueryResult,
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
import { createInvestigationSession } from '../lib/investigation-session';
import { createRuntimeIntentFromAnalysisAction } from '../lib/analysis-runtime-contract';
import { createRuntimePlanPreview } from '../lib/runtime-planner-preview';
import type { AnalysisAction } from '../lib/analysis-opportunity-actions';

const ROW_HEIGHT = 30;
const GRID_HEIGHT = 360;
const OVERSCAN = 8;
const CREATE_NEW_IMPORT_TARGET = '__create_new_table__';

type GridPosition = { rowIndex: number; columnIndex: number };
type GridSelection = { anchor: GridPosition; focus: GridPosition };
type GridForeignKeyAction = {
  id: string;
  columnNames: string[];
  label: string;
  onNavigate: (row: QueryCellValue[], result: AdvancedQueryResult) => void;
};

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
  filterCombinator: 'and' | 'or';
  filterColumn: string;
  filterOperator: AdvancedFilterOperator;
  filterValue: string;
  projectionColumn: string;
  plan: unknown | null;
  editMode: boolean;
  editState: AdvancedEditState;
  insertRowIndexes: number[];
  insertRows: Record<string, QueryCellValue>[];
  deletedRowIndexes: number[];
  hiddenColumnIds: string[];
  columnWidths: Record<string, number>;
  columnOrder: string[];
  parameters: Record<string, string>;
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
    filterCombinator: 'and',
    filterColumn: '',
    filterOperator: 'contains',
    filterValue: '',
    projectionColumn: '',
    plan: null,
    editMode: false,
    editState: EMPTY_ADVANCED_EDIT_STATE,
    insertRowIndexes: [],
    insertRows: [],
    deletedRowIndexes: [],
    hiddenColumnIds: [],
    columnWidths: {},
    columnOrder: [],
    parameters: {},
  };
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteMysqlIdentifier(value: string): string {
  return `\`${value.replaceAll('`', '``')}\``;
}

function qualifiedTableReference(provider: AdvancedConnection['provider'] | 'duckdb', schemaName: string, tableName: string): string {
  if (provider === 'mysql' || provider === 'mariadb') return `${quoteMysqlIdentifier(schemaName)}.${quoteMysqlIdentifier(tableName)}`;
  if (provider === 'sqlite' || provider === 'duckdb') return quoteIdentifier(tableName);
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
}

function splitReferencedTable(currentSchema: string, referencedTable: string): { schema: string; table: string } {
  const parts = referencedTable.split('.');
  if (parts.length >= 2) return { schema: parts.slice(0, -1).join('.'), table: parts[parts.length - 1] };
  return { schema: currentSchema, table: referencedTable };
}

function displayCell(value: QueryCellValue): string {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function gridClipboardCell(value: QueryCellValue): string {
  if (value === null) return '';
  return String(value).replace(/\r?\n/g, ' ');
}

function detectSqlParameters(sql: string): string[] {
  const names = new Set<string>();
  for (const match of sql.matchAll(/(^|[^:]):([A-Za-z_][A-Za-z0-9_]*)/g)) names.add(match[2]);
  return [...names].sort();
}

function reconcileSqlParameters(sql: string, existing: Record<string, string>): Record<string, string> {
  return Object.fromEntries(detectSqlParameters(sql).map(name => [name, existing[name] ?? '']));
}

function parameterValue(value: string): QueryCellValue {
  if (value.trim() === '') return null;
  if (/^(true|false)$/i.test(value.trim())) return value.trim().toLowerCase() === 'true';
  if (Number.isFinite(Number(value))) return Number(value);
  return value;
}

function materializeSqlParameters(sql: string, parameters: Record<string, string>): string {
  return sql.replace(/(^|[^:]):([A-Za-z_][A-Za-z0-9_]*)/g, (_match, prefix: string, name: string) => (
    `${prefix}${sqlLiteral(parameterValue(parameters[name] ?? ''))}`
  ));
}

function parseClipboardRows(text: string): string[][] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line, index, lines) => line.length > 0 || index < lines.length - 1)
    .map(line => line.split('\t'));
}

async function readTextFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return '';
  }
}

function resultRowsAsObjects(result: AdvancedQueryResult): Record<string, unknown>[] {
  return result.rows.map(row => Object.fromEntries(result.columns.map((column, index) => [column.name, row[index] ?? null])));
}

function buildDeleteMutationRows(result: AdvancedQueryResult, rowIndexes: number[], primaryKeys: string[]) {
  if (primaryKeys.length === 0) throw new Error('A primary key is required for source commit.');
  const columnIndexes = new Map(result.columns.map((column, index) => [column.name, index]));
  for (const key of primaryKeys) if (!columnIndexes.has(key)) throw new Error(`Primary-key column ${key} is missing from the result.`);
  return [...new Set(rowIndexes)].sort((left, right) => left - right).map(rowIndex => {
    const row = result.rows[rowIndex];
    if (!row) throw new Error('A deleted row is no longer present in the result.');
    return {
      action: 'delete' as const,
      key: Object.fromEntries(primaryKeys.map(key => [key, row[columnIndexes.get(key)!] ?? null])),
      changes: {},
      expected: {},
    };
  });
}

function buildInsertMutationRows(result: AdvancedQueryResult, rowIndexes: number[], primaryKeys: string[]) {
  const primaryKeySet = new Set(primaryKeys);
  return rowIndexes.map(rowIndex => {
    const row = result.rows[rowIndex];
    if (!row) throw new Error('An inserted row source is no longer present in the result.');
    const changes = Object.fromEntries(result.columns.flatMap((column, columnIndex) => (
      primaryKeySet.has(column.name) ? [] : [[column.name, row[columnIndex] ?? null]]
    )));
    return { action: 'insert' as const, key: {}, changes, expected: {} };
  });
}

function buildManualInsertMutationRows(rows: Record<string, QueryCellValue>[]) {
  return rows.map(row => ({ action: 'insert' as const, key: {}, changes: row, expected: {} }));
}

function coerceInsertDraftValue(nativeType: string, text: string): QueryCellValue {
  const value = text.trim();
  if (value === '') return null;
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/(int|decimal|numeric|double|float|real|serial|money)/i.test(nativeType) && Number.isFinite(Number(value))) return Number(value);
  return text;
}

type SqlAssistantBrief = {
  intent: string;
  risk: 'low' | 'medium' | 'high';
  observations: string[];
  recommendations: string[];
  optimizedSketch?: string;
};

type ImportDraft = {
  open: boolean;
  sourceId: string;
  tableName: string;
  target: string;
  newSchemaName: string;
  newTableName: string;
  columnMap: Record<string, string>;
  running: boolean;
  importedRows: number;
  error: string;
};

type FileTableImportDraft = {
  open: boolean;
  file: File | null;
  fileName: string;
  headers: string[];
  schema: string;
  table: string;
  columnMap: Record<string, string>;
  errorMode: 'stop_rollback' | 'stop_commit' | 'skip_continue';
  running: boolean;
  importedRows: number;
  skippedRows: number;
  error: string;
};

type CreateColumnDraft = {
  id: string;
  name: string;
  nativeType: string;
  nullable: boolean;
  primaryKey: boolean;
  indexed: boolean;
  referencesTable: string;
  referencesColumn: string;
};

type CreateTableDraft = {
  open: boolean;
  schemaName: string;
  tableName: string;
  columns: CreateColumnDraft[];
};

type StructureColumnDraft = {
  id: string;
  originalName: string;
  name: string;
  originalType: string;
  nativeType: string;
  originalNullable: boolean;
  nullable: boolean;
  originalDefault: string;
  defaultValue: string;
  originalComment: string;
  comment: string;
  primaryKey: boolean;
  drop: boolean;
  added: boolean;
};

type StructureTableDraft = {
  open: boolean;
  schemaName: string;
  originalTableName: string;
  tableName: string;
  columns: StructureColumnDraft[];
  originalTableComment: string;
  tableComment: string;
  newIndexName: string;
  newIndexColumns: string;
  newIndexUnique: boolean;
  dropIndexName: string;
  newForeignKeyName: string;
  foreignKeyColumns: string;
  foreignKeyReferenceTable: string;
  foreignKeyReferenceColumns: string;
  dropForeignKeyName: string;
  triggerName: string;
  triggerSql: string;
};

type QuickCommand = {
  id: string;
  kind: 'table' | 'tab' | 'history' | 'favorite' | 'source' | 'action';
  title: string;
  subtitle: string;
  keywords: string;
  run: () => void;
};

function analyzeSqlForAssistant(sql: string, provider: string): SqlAssistantBrief {
  const compact = sql.trim().replace(/\s+/g, ' ');
  const lower = compact.toLowerCase();
  const observations: string[] = [];
  const recommendations: string[] = [];
  const verb = lower.match(/^(select|insert|update|delete|with|create|alter|drop)\b/)?.[1] ?? 'statement';
  let risk: SqlAssistantBrief['risk'] = ['delete', 'update', 'drop', 'alter'].includes(verb) ? 'high' : 'low';
  const intent = verb === 'with' ? 'Common-table-expression query' : `${verb.toUpperCase()} query`;
  if (/\bselect\s+\*/i.test(compact)) recommendations.push('Select only needed columns to reduce transfer, memory, and grid rendering cost.');
  if (!/\blimit\s+\d+/i.test(compact) && /\bselect\b/i.test(compact)) recommendations.push('Add a LIMIT while exploring, then use full export when the result shape is verified.');
  if (/\border\s+by\b/i.test(compact) && !/\blimit\s+\d+/i.test(compact)) recommendations.push('ORDER BY without LIMIT can force a full sort; confirm the sorted columns are indexed.');
  if (/\boffset\s+\d+/i.test(compact)) recommendations.push('Large OFFSET pagination can get slower over time; prefer keyset pagination when browsing operational tables.');
  if (/\blike\s+['"]%/i.test(compact)) recommendations.push('Leading-wildcard LIKE usually cannot use a normal b-tree index; consider full-text/trigram search if this is frequent.');
  if (/\bjoin\b/i.test(compact)) observations.push('Contains joins; validate join keys and indexes on both sides.');
  if (/\bwhere\b/i.test(compact)) observations.push('Has a WHERE clause, so execution can likely be narrowed by indexes.');
  if (/\bgroup\s+by\b/i.test(compact)) observations.push('Aggregates rows; compare grouping columns with available indexes and expected cardinality.');
  if ((verb === 'update' || verb === 'delete') && !/\bwhere\b/i.test(compact)) {
    risk = 'high';
    recommendations.unshift('This write query has no WHERE clause. Review carefully before execution.');
  }
  if (provider === 'postgresql' && /\bselect\b/i.test(compact)) observations.push('PostgreSQL EXPLAIN plan tree is available from the toolbar.');
  if (observations.length === 0) observations.push('No obvious structural issue found from static SQL inspection.');
  if (recommendations.length === 0) recommendations.push('Query shape looks reasonable. Use Explain/Run on a bounded result before exporting all rows.');
  const optimizedSketch = /\bselect\s+\*/i.test(compact)
    ? compact.replace(/\bselect\s+\*/i, 'SELECT <needed_columns>')
    : undefined;
  return { intent, risk, observations, recommendations, optimizedSketch };
}

function defaultImportColumnMap(sourceColumns: string[], targetColumns: AdvancedColumnNode[]): Record<string, string> {
  const normalized = new Map(sourceColumns.map(column => [column.toLocaleLowerCase(), column]));
  return Object.fromEntries(targetColumns
    .filter(column => !column.primaryKey)
    .map(column => [column.name, normalized.get(column.name.toLocaleLowerCase()) ?? '']));
}

function importColumnSqlType(nativeType?: string): string {
  const type = nativeType || '';
  if (/bool/i.test(type)) return 'BOOLEAN';
  if (/(int|whole)/i.test(type)) return 'BIGINT';
  if (/(number|decimal|numeric|double|float|real|money|currency)/i.test(type)) return 'DOUBLE PRECISION';
  if (/(date|time)/i.test(type)) return 'TIMESTAMP';
  return 'TEXT';
}

function createBlankColumnDraft(): CreateColumnDraft {
  return { id: createAdvancedId(), name: '', nativeType: 'TEXT', nullable: true, primaryKey: false, indexed: false, referencesTable: '', referencesColumn: '' };
}

function createBlankStructureColumnDraft(): StructureColumnDraft {
  return { id: createAdvancedId(), originalName: '', name: '', originalType: 'TEXT', nativeType: 'TEXT', originalNullable: true, nullable: true, originalDefault: '', defaultValue: '', originalComment: '', comment: '', primaryKey: false, drop: false, added: true };
}

function structureDraftFromTable(schemaName: string, table: AdvancedTableNode): StructureTableDraft {
  return {
    open: true,
    schemaName,
    originalTableName: table.name,
    tableName: table.name,
    columns: table.columns.map(column => ({
      id: createAdvancedId(),
      originalName: column.name,
      name: column.name,
      originalType: column.nativeType,
      nativeType: column.nativeType,
      originalNullable: column.nullable,
      nullable: column.nullable,
      originalDefault: column.defaultValue ?? '',
      defaultValue: column.defaultValue ?? '',
      originalComment: column.comment ?? '',
      comment: column.comment ?? '',
      primaryKey: Boolean(column.primaryKey),
      drop: false,
      added: false,
    })),
    originalTableComment: table.comment ?? '',
    tableComment: table.comment ?? '',
    newIndexName: '',
    newIndexColumns: '',
    newIndexUnique: false,
    dropIndexName: '',
    newForeignKeyName: '',
    foreignKeyColumns: '',
    foreignKeyReferenceTable: '',
    foreignKeyReferenceColumns: '',
    dropForeignKeyName: '',
    triggerName: '',
    triggerSql: '',
  };
}

function generateCreateTableSql(draft: CreateTableDraft, provider: AdvancedConnection['provider'] | 'duckdb'): string {
  const schemaName = draft.schemaName || 'public';
  const tableName = draft.tableName || 'new_table';
  const columns = draft.columns.filter(column => column.name.trim());
  const columnLines = columns.map(column => {
    const parts = [provider === 'mysql' || provider === 'mariadb' ? quoteMysqlIdentifier(column.name.trim()) : quoteIdentifier(column.name.trim()), column.nativeType.trim() || 'TEXT'];
    if (!column.nullable || column.primaryKey) parts.push('NOT NULL');
    return `  ${parts.join(' ')}`;
  });
  const primaryKeys = columns.filter(column => column.primaryKey).map(column => provider === 'mysql' || provider === 'mariadb' ? quoteMysqlIdentifier(column.name.trim()) : quoteIdentifier(column.name.trim()));
  if (primaryKeys.length > 0) columnLines.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
  const create = `CREATE TABLE ${qualifiedTableReference(provider, schemaName, tableName)} (\n${columnLines.join(',\n') || '  id INTEGER PRIMARY KEY'}\n);`;
  const indexStatements = columns.filter(column => column.indexed && !column.primaryKey).map(column => (
    `CREATE INDEX ${provider === 'mysql' || provider === 'mariadb' ? quoteMysqlIdentifier(`idx_${tableName}_${column.name}`) : quoteIdentifier(`idx_${tableName}_${column.name}`)} ON ${qualifiedTableReference(provider, schemaName, tableName)} (${provider === 'mysql' || provider === 'mariadb' ? quoteMysqlIdentifier(column.name.trim()) : quoteIdentifier(column.name.trim())});`
  ));
  const fkStatements = columns.filter(column => column.referencesTable.trim() && column.referencesColumn.trim()).map(column => {
    const referenced = splitReferencedTable(schemaName, column.referencesTable.trim());
    const localColumn = provider === 'mysql' || provider === 'mariadb' ? quoteMysqlIdentifier(column.name.trim()) : quoteIdentifier(column.name.trim());
    const referencedColumn = provider === 'mysql' || provider === 'mariadb' ? quoteMysqlIdentifier(column.referencesColumn.trim()) : quoteIdentifier(column.referencesColumn.trim());
    return `ALTER TABLE ${qualifiedTableReference(provider, schemaName, tableName)} ADD FOREIGN KEY (${localColumn}) REFERENCES ${qualifiedTableReference(provider, referenced.schema, referenced.table)} (${referencedColumn});`;
  });
  return [create, ...indexStatements, ...fkStatements].join('\n\n');
}

function generateStructureSql(draft: StructureTableDraft, provider: AdvancedConnection['provider'] | 'duckdb'): string {
  const schemaName = draft.schemaName || 'public';
  const originalTable = draft.originalTableName || draft.tableName || 'table_name';
  const nextTable = draft.tableName || originalTable;
  const tableRef = qualifiedTableReference(provider, schemaName, originalTable);
  const nextTableRef = qualifiedTableReference(provider, schemaName, nextTable);
  const quoteColumn = (name: string) => provider === 'mysql' || provider === 'mariadb' ? quoteMysqlIdentifier(name) : quoteIdentifier(name);
  const statements: string[] = [];
  if (nextTable !== originalTable) {
    if (provider === 'mysql' || provider === 'mariadb') statements.push(`RENAME TABLE ${tableRef} TO ${nextTableRef};`);
    else if (provider === 'sqlite') statements.push(`ALTER TABLE ${tableRef} RENAME TO ${quoteIdentifier(nextTable)};`);
    else statements.push(`ALTER TABLE ${tableRef} RENAME TO ${quoteIdentifier(nextTable)};`);
  }
  const mutableTableRef = nextTable !== originalTable ? nextTableRef : tableRef;
  draft.columns.forEach(column => {
    const name = column.name.trim();
    const originalName = column.originalName.trim();
    if (!name && !originalName) return;
    if (column.added) {
      if (!name) return;
      statements.push(`ALTER TABLE ${mutableTableRef} ADD COLUMN ${quoteColumn(name)} ${column.nativeType || 'TEXT'}${column.nullable ? '' : ' NOT NULL'}${column.defaultValue.trim() ? ` DEFAULT ${column.defaultValue.trim()}` : ''};`);
      if (column.comment.trim()) {
        if (provider === 'postgresql') statements.push(`COMMENT ON COLUMN ${mutableTableRef}.${quoteColumn(name)} IS ${sqlLiteral(column.comment.trim())};`);
        else if (provider === 'mysql' || provider === 'mariadb') statements.push(`-- Review manually: MySQL column comments require MODIFY COLUMN with the full column definition for ${name}.`);
      }
      return;
    }
    if (column.drop) {
      statements.push(`ALTER TABLE ${mutableTableRef} DROP COLUMN ${quoteColumn(originalName)};`);
      return;
    }
    const columnRef = quoteColumn(originalName);
    if (name && name !== originalName) {
      statements.push(`ALTER TABLE ${mutableTableRef} RENAME COLUMN ${columnRef} TO ${quoteColumn(name)};`);
    }
    const effectiveName = name || originalName;
    if (column.nativeType && column.nativeType !== column.originalType) {
      if (provider === 'postgresql') statements.push(`ALTER TABLE ${mutableTableRef} ALTER COLUMN ${quoteColumn(effectiveName)} TYPE ${column.nativeType};`);
      else if (provider === 'mysql' || provider === 'mariadb') statements.push(`ALTER TABLE ${mutableTableRef} MODIFY COLUMN ${quoteColumn(effectiveName)} ${column.nativeType}${column.nullable ? '' : ' NOT NULL'};`);
      else statements.push(`-- Review manually: change ${effectiveName} type from ${column.originalType} to ${column.nativeType};`);
    }
    if (column.nullable !== column.originalNullable && provider === 'postgresql') {
      statements.push(`ALTER TABLE ${mutableTableRef} ALTER COLUMN ${quoteColumn(effectiveName)} ${column.nullable ? 'DROP NOT NULL' : 'SET NOT NULL'};`);
    }
    if (column.defaultValue.trim() !== column.originalDefault.trim()) {
      if (provider === 'postgresql') statements.push(`ALTER TABLE ${mutableTableRef} ALTER COLUMN ${quoteColumn(effectiveName)} ${column.defaultValue.trim() ? `SET DEFAULT ${column.defaultValue.trim()}` : 'DROP DEFAULT'};`);
      else if (provider === 'mysql' || provider === 'mariadb') statements.push(`ALTER TABLE ${mutableTableRef} ALTER COLUMN ${quoteColumn(effectiveName)} ${column.defaultValue.trim() ? `SET DEFAULT ${column.defaultValue.trim()}` : 'DROP DEFAULT'};`);
      else statements.push(`-- Review manually: change ${effectiveName} default to ${column.defaultValue.trim() || 'NULL/default removed'};`);
    }
    if (column.comment.trim() !== column.originalComment.trim()) {
      if (provider === 'postgresql') statements.push(`COMMENT ON COLUMN ${mutableTableRef}.${quoteColumn(effectiveName)} IS ${column.comment.trim() ? sqlLiteral(column.comment.trim()) : 'NULL'};`);
      else if (provider === 'mysql' || provider === 'mariadb') statements.push(`-- Review manually: change ${effectiveName} comment to ${sqlLiteral(column.comment.trim())};`);
      else statements.push(`-- Review manually: comments are not stored by SQLite for ${effectiveName};`);
    }
  });
  if (draft.tableComment.trim() !== draft.originalTableComment.trim()) {
    if (provider === 'postgresql') statements.push(`COMMENT ON TABLE ${mutableTableRef} IS ${draft.tableComment.trim() ? sqlLiteral(draft.tableComment.trim()) : 'NULL'};`);
    else if (provider === 'mysql' || provider === 'mariadb') statements.push(`ALTER TABLE ${mutableTableRef} COMMENT = ${sqlLiteral(draft.tableComment.trim())};`);
    else statements.push(`-- Review manually: SQLite table comments are not supported;`);
  }
  if (draft.newIndexName.trim() && draft.newIndexColumns.trim()) {
    const columns = draft.newIndexColumns.split(',').map(column => column.trim()).filter(Boolean).map(quoteColumn).join(', ');
    statements.push(`CREATE ${draft.newIndexUnique ? 'UNIQUE ' : ''}INDEX ${provider === 'mysql' || provider === 'mariadb' ? quoteMysqlIdentifier(draft.newIndexName.trim()) : quoteIdentifier(draft.newIndexName.trim())} ON ${mutableTableRef} (${columns});`);
  }
  if (draft.dropIndexName.trim()) {
    if (provider === 'mysql' || provider === 'mariadb') statements.push(`DROP INDEX ${quoteMysqlIdentifier(draft.dropIndexName.trim())} ON ${mutableTableRef};`);
    else statements.push(`DROP INDEX ${quoteIdentifier(draft.dropIndexName.trim())};`);
  }
  if (draft.newForeignKeyName.trim() && draft.foreignKeyColumns.trim() && draft.foreignKeyReferenceTable.trim() && draft.foreignKeyReferenceColumns.trim()) {
    const reference = splitReferencedTable(schemaName, draft.foreignKeyReferenceTable.trim());
    const columns = draft.foreignKeyColumns.split(',').map(column => column.trim()).filter(Boolean).map(quoteColumn).join(', ');
    const referencedColumns = draft.foreignKeyReferenceColumns.split(',').map(column => column.trim()).filter(Boolean).map(quoteColumn).join(', ');
    statements.push(`ALTER TABLE ${mutableTableRef} ADD CONSTRAINT ${provider === 'mysql' || provider === 'mariadb' ? quoteMysqlIdentifier(draft.newForeignKeyName.trim()) : quoteIdentifier(draft.newForeignKeyName.trim())} FOREIGN KEY (${columns}) REFERENCES ${qualifiedTableReference(provider, reference.schema, reference.table)} (${referencedColumns});`);
  }
  if (draft.dropForeignKeyName.trim()) {
    if (provider === 'mysql' || provider === 'mariadb') statements.push(`ALTER TABLE ${mutableTableRef} DROP FOREIGN KEY ${quoteMysqlIdentifier(draft.dropForeignKeyName.trim())};`);
    else statements.push(`ALTER TABLE ${mutableTableRef} DROP CONSTRAINT ${quoteIdentifier(draft.dropForeignKeyName.trim())};`);
  }
  if (draft.triggerName.trim() && draft.triggerSql.trim()) {
    statements.push(draft.triggerSql.trim().endsWith(';') ? draft.triggerSql.trim() : `${draft.triggerSql.trim()};`);
  }
  return statements.length ? statements.join('\n\n') : '-- No structure changes selected.';
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function mongoFilterValue(operator: AdvancedFilterOperator, value: string): unknown {
  const numeric = Number(value);
  const typedValue: unknown = value.trim() !== '' && Number.isFinite(numeric) ? numeric : value;
  switch (operator) {
    case 'not_equals': return { $ne: typedValue };
    case 'contains': return { $regex: value, $options: 'i' };
    case 'not_contains': return { $not: { $regex: value, $options: 'i' } };
    case 'starts_with': return { $regex: `^${value}`, $options: 'i' };
    case 'ends_with': return { $regex: `${value}$`, $options: 'i' };
    case 'greater_than': return { $gt: typedValue };
    case 'greater_or_equal': return { $gte: typedValue };
    case 'less_than': return { $lt: typedValue };
    case 'less_or_equal': return { $lte: typedValue };
    case 'is_blank': return { $in: [null, ''] };
    case 'is_not_blank': return { $nin: [null, ''] };
    case 'in': return { $in: value.split(',').map(item => item.trim()).filter(Boolean) };
    case 'not_in': return { $nin: value.split(',').map(item => item.trim()).filter(Boolean) };
    default: return typedValue;
  }
}

async function copyTextToClipboard(text: string): Promise<void> {
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
  columnWidths?: Record<string, number>;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnMove?: (columnId: string, direction: -1 | 1) => void;
  editable?: boolean;
  editedKeys?: Set<string>;
  deletedRows?: Set<number>;
  onEdit?: (rowIndex: number, columnIndex: number, oldValue: QueryCellValue, newValue: QueryCellValue) => void;
  onDuplicateRow?: (rowIndex: number) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onRestoreRow?: (rowIndex: number) => void;
  copyTableName?: string;
  foreignKeyActions?: GridForeignKeyAction[];
}> = ({ result, sort, onSort, columnWidths = {}, onColumnResize, onColumnMove, editable = false, editedKeys = new Set(), deletedRows = new Set(), onEdit, onDuplicateRow, onDeleteRow, onRestoreRow, copyTableName, foreignKeyActions = [] }) => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState<{ rowIndex: number; columnIndex: number; value: string } | null>(null);
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowIndex: number; columnIndex: number } | null>(null);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(GRID_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const end = Math.min(result.rows.length, start + visibleCount);
  const resolvedColumnWidths = result.columns.map(column => Math.max(80, Math.min(520, columnWidths[column.id] ?? 180)));
  const gridWidth = Math.max(720, resolvedColumnWidths.reduce((sum, width) => sum + width, 0));
  const template = resolvedColumnWidths.length ? resolvedColumnWidths.map(width => `${width}px`).join(' ') : 'minmax(180px, 1fr)';
  const selectedRange = selection ? {
    rowStart: Math.min(selection.anchor.rowIndex, selection.focus.rowIndex),
    rowEnd: Math.max(selection.anchor.rowIndex, selection.focus.rowIndex),
    columnStart: Math.min(selection.anchor.columnIndex, selection.focus.columnIndex),
    columnEnd: Math.max(selection.anchor.columnIndex, selection.focus.columnIndex),
  } : null;
  const selectionSize = selectedRange ? {
    rows: selectedRange.rowEnd - selectedRange.rowStart + 1,
    columns: selectedRange.columnEnd - selectedRange.columnStart + 1,
  } : null;
  const isSelected = (rowIndex: number, columnIndex: number) => Boolean(
    selectedRange
    && rowIndex >= selectedRange.rowStart
    && rowIndex <= selectedRange.rowEnd
    && columnIndex >= selectedRange.columnStart
    && columnIndex <= selectedRange.columnEnd
  );
  const isActive = (rowIndex: number, columnIndex: number) => selection?.focus.rowIndex === rowIndex && selection.focus.columnIndex === columnIndex;
  const selectCell = (rowIndex: number, columnIndex: number, extend: boolean) => {
    const nextFocus = { rowIndex, columnIndex };
    setSelection(current => extend && current ? { anchor: current.anchor, focus: nextFocus } : { anchor: nextFocus, focus: nextFocus });
  };
  const moveSelection = (rowDelta: number, columnDelta: number, extend: boolean) => {
    setSelection(current => {
      const focus = current?.focus ?? { rowIndex: 0, columnIndex: 0 };
      const nextFocus = {
        rowIndex: Math.max(0, Math.min(result.rows.length - 1, focus.rowIndex + rowDelta)),
        columnIndex: Math.max(0, Math.min(result.columns.length - 1, focus.columnIndex + columnDelta)),
      };
      return extend && current ? { anchor: current.anchor, focus: nextFocus } : { anchor: nextFocus, focus: nextFocus };
    });
  };
  const copySelection = async () => {
    if (!selectedRange) return;
    const text = result.rows
      .slice(selectedRange.rowStart, selectedRange.rowEnd + 1)
      .map(row => row.slice(selectedRange.columnStart, selectedRange.columnEnd + 1).map(value => gridClipboardCell(value ?? null)).join('\t'))
      .join('\n');
    await copyTextToClipboard(text);
  };
  const selectedRowIndexes = (fallbackRow: number) => {
    if (!selectedRange) return [fallbackRow];
    const indexes: number[] = [];
    for (let index = selectedRange.rowStart; index <= selectedRange.rowEnd; index += 1) indexes.push(index);
    return indexes;
  };
  const selectedRowObjects = (fallbackRow: number) => selectedRowIndexes(fallbackRow).map(rowIndex => (
    Object.fromEntries(result.columns.map((column, columnIndex) => [column.name, result.rows[rowIndex]?.[columnIndex] ?? null]))
  ));
  const copyRowsAsJson = async (rowIndex: number) => {
    await copyTextToClipboard(JSON.stringify(selectedRowObjects(rowIndex), null, 2));
  };
  const copyRowsAsMarkdown = async (rowIndex: number) => {
    const rows = selectedRowIndexes(rowIndex).map(index => result.rows[index] ?? []);
    const header = `| ${result.columns.map(column => column.name).join(' | ')} |`;
    const divider = `| ${result.columns.map(() => '---').join(' | ')} |`;
    const body = rows.map(row => `| ${result.columns.map((_, index) => gridClipboardCell(row[index] ?? null).replaceAll('|', '\\|')).join(' | ')} |`);
    await copyTextToClipboard([header, divider, ...body].join('\n'));
  };
  const copyRowsAsInsert = async (rowIndex: number) => {
    const tableName = quoteIdentifier(copyTableName || 'target_table');
    const columns = result.columns.map(column => quoteIdentifier(column.name)).join(', ');
    const statements = selectedRowIndexes(rowIndex).map(index => {
      const row = result.rows[index] ?? [];
      return `INSERT INTO ${tableName} (${columns}) VALUES (${result.columns.map((_, columnIndex) => sqlLiteral(row[columnIndex] ?? null)).join(', ')});`;
    });
    await copyTextToClipboard(statements.join('\n'));
  };
  const copyRowsAsUpdate = async (rowIndex: number) => {
    if (result.columns.length === 0) return;
    const tableName = quoteIdentifier(copyTableName || 'target_table');
    const keyColumn = result.columns[0];
    const setColumns = result.columns.slice(1);
    const statements = selectedRowIndexes(rowIndex).map(index => {
      const row = result.rows[index] ?? [];
      const assignments = (setColumns.length ? setColumns : result.columns)
        .map((column, offset) => {
          const sourceIndex = setColumns.length ? offset + 1 : offset;
          return `${quoteIdentifier(column.name)} = ${sqlLiteral(row[sourceIndex] ?? null)}`;
        })
        .join(', ');
      return `UPDATE ${tableName} SET ${assignments} WHERE ${quoteIdentifier(keyColumn.name)} = ${sqlLiteral(row[0] ?? null)};`;
    });
    await copyTextToClipboard(statements.join('\n'));
  };
  const copyRowsAsCsv = async (rowIndex: number) => {
    const rows = selectedRowIndexes(rowIndex).map(index => result.rows[index] ?? []);
    await copyTextToClipboard(advancedResultToCsv(result.columns, rows));
  };
  const copyColumnAsInClause = async (rowIndex: number, columnIndex: number) => {
    const values = selectedRowIndexes(rowIndex).map(index => sqlLiteral(result.rows[index]?.[columnIndex] ?? null));
    await copyTextToClipboard(`${quoteIdentifier(result.columns[columnIndex]?.name || 'column')} IN (${values.join(', ')})`);
  };
  const copyColumnValues = async (rowIndex: number, columnIndex: number) => {
    const values = selectedRowIndexes(rowIndex).map(index => gridClipboardCell(result.rows[index]?.[columnIndex] ?? null));
    await copyTextToClipboard(values.join('\n'));
  };

  const coerceGridValue = (columnIndex: number, text: string): QueryCellValue => {
    const logicalType = result.columns[columnIndex]?.logicalType;
    let value: QueryCellValue = text;
    if (logicalType === 'number' && text.trim() !== '' && Number.isFinite(Number(text))) value = Number(text);
    else if (logicalType === 'boolean' && /^(true|false)$/i.test(text.trim())) value = text.trim().toLowerCase() === 'true';
    return value;
  };

  const commitEdit = (rowIndex: number, columnIndex: number, oldValue: QueryCellValue, text: string) => {
    const value = coerceGridValue(columnIndex, text);
    onEdit?.(rowIndex, columnIndex, oldValue, value);
    setEditing(null);
  };

  const pasteClipboardAt = async (rowIndex: number, columnIndex: number) => {
    if (!editable) return;
    if (deletedRows.has(rowIndex)) return;
    const matrix = parseClipboardRows(await readTextFromClipboard());
    if (matrix.length === 0) return;
    matrix.forEach((row, rowOffset) => {
      row.forEach((cell, columnOffset) => {
        const targetRow = rowIndex + rowOffset;
        const targetColumn = columnIndex + columnOffset;
        if (targetRow >= result.rows.length || targetColumn >= result.columns.length) return;
        if (deletedRows.has(targetRow)) return;
        const oldValue = result.rows[targetRow]?.[targetColumn] ?? null;
        onEdit?.(targetRow, targetColumn, oldValue, coerceGridValue(targetColumn, cell));
      });
    });
  };

  const startColumnResize = (event: React.PointerEvent, columnId: string, width: number) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const onMove = (moveEvent: PointerEvent) => {
      onColumnResize?.(columnId, Math.max(80, Math.min(520, width + moveEvent.clientX - startX)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="Result grid"
      aria-rowcount={result.rows.length}
      aria-colcount={result.columns.length}
      tabIndex={0}
      className="h-full min-h-0 overflow-auto bg-white outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      onScroll={event => setScrollTop(event.currentTarget.scrollTop)}
      onKeyDown={event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
          event.preventDefault();
          void copySelection();
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
          event.preventDefault();
          const focus = selection?.focus ?? { rowIndex: 0, columnIndex: 0 };
          void pasteClipboardAt(focus.rowIndex, focus.columnIndex);
          return;
        }
        if (event.key === 'Escape') setContextMenu(null);
        if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1, 0, event.shiftKey); }
        if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1, 0, event.shiftKey); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelection(0, -1, event.shiftKey); }
        if (event.key === 'ArrowRight') { event.preventDefault(); moveSelection(0, 1, event.shiftKey); }
      }}
    >
      <div style={{ width: gridWidth }}>
        <div role="row" className="sticky top-0 z-10 grid h-8 border-b border-gray-300 bg-gray-100 text-[11px] font-semibold text-gray-600" style={{ gridTemplateColumns: template }}>
          {result.columns.map((column, columnIndex) => (
            <button
              key={column.id}
              role="columnheader"
              className="group relative flex min-w-0 items-center gap-1 border-r border-gray-200 px-2 text-left hover:bg-gray-200"
              title={`Sort by ${column.name} · ${column.nativeType || column.logicalType}`}
              onClick={() => onSort(column.name)}
            >
              <span className="truncate">{column.name}</span>
              {sort?.column === column.name && (sort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              <span className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
                <span
                  role="button"
                  aria-label={`Move ${column.name} left`}
                  title={`Move ${column.name} left`}
                  className={`p-0.5 text-gray-400 hover:bg-gray-300 hover:text-gray-700 ${columnIndex === 0 ? 'pointer-events-none opacity-30' : ''}`}
                  onClick={event => { event.stopPropagation(); onColumnMove?.(column.id, -1); }}
                ><ArrowLeft className="h-3 w-3" /></span>
                <span
                  role="button"
                  aria-label={`Move ${column.name} right`}
                  title={`Move ${column.name} right`}
                  className={`p-0.5 text-gray-400 hover:bg-gray-300 hover:text-gray-700 ${columnIndex === result.columns.length - 1 ? 'pointer-events-none opacity-30' : ''}`}
                  onClick={event => { event.stopPropagation(); onColumnMove?.(column.id, 1); }}
                ><ArrowRight className="h-3 w-3" /></span>
              </span>
              <span className="ml-auto shrink-0 font-mono text-[9px] font-normal text-gray-400">{column.nativeType || column.logicalType}</span>
              <span
                className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                title={`Resize ${column.name}`}
                onPointerDown={event => startColumnResize(event, column.id, resolvedColumnWidths[columnIndex])}
              />
            </button>
          ))}
        </div>
        <div className="relative" style={{ height: result.rows.length * ROW_HEIGHT }}>
          {selectionSize && <div className="pointer-events-none sticky left-2 top-9 z-20 inline-flex bg-blue-600 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">{selectionSize.rows}x{selectionSize.columns}</div>}
          {result.rows.slice(start, end).map((row, relativeIndex) => {
            const rowIndex = start + relativeIndex;
            const deleted = deletedRows.has(rowIndex);
            return (
              <div
                key={rowIndex}
                role="row"
                aria-disabled={deleted}
                className={`absolute grid border-b border-gray-100 text-[12px] hover:bg-blue-50 ${deleted ? 'bg-red-50 text-red-700 opacity-80' : 'text-gray-700'}`}
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT, width: gridWidth, gridTemplateColumns: template }}
              >
                {result.columns.map((column, columnIndex) => {
                  const value = row[columnIndex] ?? null;
                  const isEditing = editing?.rowIndex === rowIndex && editing.columnIndex === columnIndex;
                  const changed = editedKeys.has(`${rowIndex}:${columnIndex}`);
                  const selected = isSelected(rowIndex, columnIndex);
                  const active = isActive(rowIndex, columnIndex);
                  return (
                  <div
                    key={column.id}
                    role="gridcell"
                    aria-selected={selected}
                    aria-rowindex={rowIndex + 1}
                    aria-colindex={columnIndex + 1}
                    className={`min-w-0 truncate border-r px-2 py-1.5 font-mono ${value === null ? 'italic text-gray-400' : ''} ${changed ? 'bg-amber-100 text-amber-950' : ''} ${selected ? 'border-blue-300 bg-blue-100 text-blue-950' : 'border-gray-100'} ${active ? 'ring-2 ring-inset ring-blue-600' : ''} ${editable && !deleted ? 'cursor-text' : 'cursor-cell'} ${deleted ? 'line-through decoration-red-500 decoration-2' : ''}`}
                    title={editable ? `Edit ${column.name}` : displayCell(value)}
                    onClick={event => {
                      gridRef.current?.focus();
                      selectCell(rowIndex, columnIndex, event.shiftKey);
                      setContextMenu(null);
                    }}
                    onContextMenu={event => {
                      event.preventDefault();
                      gridRef.current?.focus();
                      if (!selected) selectCell(rowIndex, columnIndex, event.shiftKey);
                      setContextMenu({ x: event.clientX, y: event.clientY, rowIndex, columnIndex });
                    }}
                    onDoubleClick={() => editable && !deleted && setEditing({ rowIndex, columnIndex, value: value === null ? '' : String(value) })}
                  >
                    {isEditing ? <input autoFocus value={editing.value} onChange={event => setEditing({ ...editing, value: event.target.value })} onBlur={() => commitEdit(rowIndex, columnIndex, value, editing.value)} onKeyDown={event => { if (event.key === 'Enter') commitEdit(rowIndex, columnIndex, value, editing.value); if (event.key === 'Escape') setEditing(null); }} className="h-6 w-full border border-blue-500 bg-white px-1 font-mono text-[12px] not-italic text-gray-900 outline-none" /> : displayCell(value)}
                  </div>
                );})}
              </div>
            );
          })}
        </div>
      </div>
      {contextMenu && (
        <div className="fixed z-50 w-52 border border-gray-200 bg-white py-1 text-[11px] text-gray-700 shadow-lg" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {foreignKeyActions.filter(action => action.columnNames.includes(result.columns[contextMenu.columnIndex]?.name || '')).map(action => (
            <button key={action.id} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-purple-50 hover:text-purple-700" onClick={() => { action.onNavigate(result.rows[contextMenu.rowIndex] ?? [], result); setContextMenu(null); }}><ArrowRight className="h-3.5 w-3.5 text-purple-400" /> {action.label}</button>
          ))}
          {foreignKeyActions.some(action => action.columnNames.includes(result.columns[contextMenu.columnIndex]?.name || '')) && <div className="my-1 border-t border-gray-100" />}
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copySelection(); setContextMenu(null); }}><Copy className="h-3.5 w-3.5 text-gray-400" /> Copy selection</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyTextToClipboard(gridClipboardCell(result.rows[contextMenu.rowIndex]?.[contextMenu.columnIndex] ?? null)); setContextMenu(null); }}><Copy className="h-3.5 w-3.5 text-gray-400" /> Copy cell</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsJson(contextMenu.rowIndex); setContextMenu(null); }}><Braces className="h-3.5 w-3.5 text-gray-400" /> Copy rows JSON</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsCsv(contextMenu.rowIndex); setContextMenu(null); }}><Table2 className="h-3.5 w-3.5 text-gray-400" /> Copy rows CSV</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsMarkdown(contextMenu.rowIndex); setContextMenu(null); }}><ListTree className="h-3.5 w-3.5 text-gray-400" /> Copy rows Markdown</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsInsert(contextMenu.rowIndex); setContextMenu(null); }}><Database className="h-3.5 w-3.5 text-gray-400" /> Copy rows INSERT</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsUpdate(contextMenu.rowIndex); setContextMenu(null); }}><Database className="h-3.5 w-3.5 text-gray-400" /> Copy rows UPDATE</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyColumnAsInClause(contextMenu.rowIndex, contextMenu.columnIndex); setContextMenu(null); }}><Filter className="h-3.5 w-3.5 text-gray-400" /> Copy IN clause</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyColumnValues(contextMenu.rowIndex, contextMenu.columnIndex); setContextMenu(null); }}><Columns className="h-3.5 w-3.5 text-gray-400" /> Copy column values</button>
          <button disabled={!editable || deletedRows.has(contextMenu.rowIndex)} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100 disabled:opacity-40" onClick={() => { void pasteClipboardAt(contextMenu.rowIndex, contextMenu.columnIndex); setContextMenu(null); }}><Pencil className="h-3.5 w-3.5 text-gray-400" /> Paste cells</button>
          {editable && onDuplicateRow && <button disabled={deletedRows.has(contextMenu.rowIndex)} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40" onClick={() => { onDuplicateRow(contextMenu.rowIndex); setContextMenu(null); }}><Plus className="h-3.5 w-3.5 text-emerald-500" /> Duplicate as insert</button>}
          {editable && onDeleteRow && onRestoreRow && <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-red-50 hover:text-red-700" onClick={() => { if (deletedRows.has(contextMenu.rowIndex)) onRestoreRow(contextMenu.rowIndex); else onDeleteRow(contextMenu.rowIndex); setContextMenu(null); }}><Trash2 className="h-3.5 w-3.5 text-red-400" /> {deletedRows.has(contextMenu.rowIndex) ? 'Restore row' : 'Mark row delete'}</button>}
          <div className="my-1 border-t border-gray-100" />
          <button disabled={contextMenu.columnIndex === 0} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100 disabled:opacity-40" onClick={() => { onColumnMove?.(result.columns[contextMenu.columnIndex].id, -1); setContextMenu(null); }}><ArrowLeft className="h-3.5 w-3.5 text-gray-400" /> Move column left</button>
          <button disabled={contextMenu.columnIndex === result.columns.length - 1} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100 disabled:opacity-40" onClick={() => { onColumnMove?.(result.columns[contextMenu.columnIndex].id, 1); setContextMenu(null); }}><ArrowRight className="h-3.5 w-3.5 text-gray-400" /> Move column right</button>
        </div>
      )}
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

type QueryPlanNode = {
  operation: string;
  relation?: string;
  indexName?: string;
  startupCost?: number;
  totalCost?: number;
  estimatedRows?: number;
  actualTime?: number;
  children: QueryPlanNode[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parsePlanNode(value: unknown): QueryPlanNode | null {
  const record = asRecord(value);
  if (!record) return null;
  const childValues = Array.isArray(record.Plans) ? record.Plans : [];
  return {
    operation: typeof record['Node Type'] === 'string' ? record['Node Type'] : 'Plan node',
    relation: typeof record['Relation Name'] === 'string' ? record['Relation Name'] : undefined,
    indexName: typeof record['Index Name'] === 'string' ? record['Index Name'] : undefined,
    startupCost: numberField(record, 'Startup Cost'),
    totalCost: numberField(record, 'Total Cost'),
    estimatedRows: numberField(record, 'Plan Rows'),
    actualTime: numberField(record, 'Actual Total Time'),
    children: childValues.flatMap(child => {
      const node = parsePlanNode(child);
      return node ? [node] : [];
    }),
  };
}

function parseQueryPlan(plan: unknown): { root: QueryPlanNode | null; planningTime?: number; executionTime?: number } {
  const top = Array.isArray(plan) ? asRecord(plan[0]) : asRecord(plan);
  if (!top) return { root: null };
  const root = parsePlanNode(top.Plan ?? top);
  return {
    root,
    planningTime: numberField(top, 'Planning Time'),
    executionTime: numberField(top, 'Execution Time'),
  };
}

const QueryPlanTreeRow: React.FC<{ node: QueryPlanNode; depth?: number; maxCost: number }> = ({ node, depth = 0, maxCost }) => {
  const costRatio = maxCost > 0 && node.totalCost ? node.totalCost / maxCost : 0;
  const color = costRatio > 0.5 ? 'bg-red-500' : costRatio > 0.2 ? 'bg-amber-500' : costRatio > 0.05 ? 'bg-yellow-400' : 'bg-emerald-500';
  return (
    <>
      <div className="grid min-h-8 grid-cols-[minmax(220px,1fr)_120px_90px_90px] items-center border-b border-gray-100 text-[11px] text-gray-700 hover:bg-blue-50">
        <div className="flex min-w-0 items-center gap-2 px-3" style={{ paddingLeft: 12 + depth * 18 }}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
          <div className="min-w-0"><div className="truncate font-medium text-gray-900">{node.operation}</div>{(node.relation || node.indexName) && <div className="truncate text-[10px] text-gray-500">{node.relation}{node.indexName ? ` · ${node.indexName}` : ''}</div>}</div>
        </div>
        <div className="px-3 font-mono text-gray-500">{node.startupCost !== undefined && node.totalCost !== undefined ? `${node.startupCost.toFixed(2)}..${node.totalCost.toFixed(2)}` : '-'}</div>
        <div className="px-3 font-mono text-gray-500">{node.estimatedRows?.toLocaleString('en') ?? '-'}</div>
        <div className="px-3 font-mono text-gray-500">{node.actualTime !== undefined ? `${node.actualTime.toFixed(3)}ms` : '-'}</div>
      </div>
      {node.children.map((child, index) => <QueryPlanTreeRow key={`${depth}:${index}:${child.operation}:${child.relation ?? ''}`} node={child} depth={depth + 1} maxCost={maxCost} />)}
    </>
  );
};

const QueryPlanView: React.FC<{ plan: unknown }> = ({ plan }) => {
  const parsed = useMemo(() => parseQueryPlan(plan), [plan]);
  const maxCost = useMemo(() => {
    const costs: number[] = [];
    const visit = (node: QueryPlanNode | null) => {
      if (!node) return;
      if (node.totalCost !== undefined) costs.push(node.totalCost);
      node.children.forEach(visit);
    };
    visit(parsed.root);
    return Math.max(0, ...costs);
  }, [parsed.root]);
  if (!parsed.root) return <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-300">{JSON.stringify(plan, null, 2)}</pre>;
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 text-[11px] text-gray-500">
        <span className="font-semibold text-gray-800">Plan tree</span>
        {parsed.planningTime !== undefined && <span>Planning {parsed.planningTime.toFixed(3)}ms</span>}
        {parsed.executionTime !== undefined && <span>Execution {parsed.executionTime.toFixed(3)}ms</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid h-8 min-w-[760px] grid-cols-[minmax(220px,1fr)_120px_90px_90px] items-center border-b border-gray-200 bg-gray-100 px-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          <div className="px-3">Operation</div><div className="px-3">Cost</div><div className="px-3">Rows</div><div className="px-3">Actual</div>
        </div>
        <div className="min-w-[760px]"><QueryPlanTreeRow node={parsed.root} maxCost={maxCost} /></div>
      </div>
      <details className="shrink-0 border-t border-gray-200 bg-gray-950 text-emerald-200">
        <summary className="cursor-pointer px-3 py-2 text-[11px] text-gray-300">Raw JSON</summary>
        <pre className="max-h-56 overflow-auto p-3 font-mono text-[11px] leading-5">{JSON.stringify(plan, null, 2)}</pre>
      </details>
    </div>
  );
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
              const indexCount = table.indexes?.length ?? 0;
              const foreignKeyCount = table.foreignKeys?.length ?? 0;
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
                      {(indexCount > 0 || foreignKeyCount > 0) && <span className="shrink-0 font-mono text-[8px] text-blue-500">{indexCount}i/{foreignKeyCount}fk</span>}
                      <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                        {exactCounts[key]?.status === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : exactCounts[key]?.status === 'ready' ? compactCount(exactCounts[key].count) : table.estimatedRows !== undefined && table.estimatedRows !== null ? `~${compactCount(table.estimatedRows)}` : ''}
                      </span>
                    </button>
                  </div>
                  {tableOpen && table.comment && <div className="truncate pl-12 pr-2 text-[10px] italic text-gray-400" title={table.comment}>{table.comment}</div>}
                  {tableOpen && table.columns.map(column => (
                    <div key={`${key}.${column.name}`} className="flex h-6 items-center gap-2 pl-12 pr-2 text-[11px] text-gray-500" title={[column.comment, column.defaultValue ? `default ${column.defaultValue}` : ''].filter(Boolean).join(' · ') || undefined}>
                      <span className="truncate">{column.name}</span>
                      {column.primaryKey && <span className="shrink-0 bg-amber-100 px-1 text-[8px] font-semibold text-amber-800">PK</span>}
                      {column.defaultValue && <span className="shrink-0 bg-gray-100 px-1 text-[8px] text-gray-500">DEF</span>}
                      <span className="ml-auto shrink-0 font-mono text-[9px] text-gray-400">{column.nativeType}{column.nullable ? '?' : ''}</span>
                    </div>
                  ))}
                  {tableOpen && indexCount > 0 && <div className="pl-12 pr-2 text-[10px] text-blue-500">Indexes: {table.indexes!.slice(0, 3).map(index => index.name).join(', ')}{indexCount > 3 ? ` +${indexCount - 3}` : ''}</div>}
                  {tableOpen && foreignKeyCount > 0 && <div className="pl-12 pr-2 text-[10px] text-purple-500">FK: {table.foreignKeys!.slice(0, 2).map(fk => fk.name).join(', ')}{foreignKeyCount > 2 ? ` +${foreignKeyCount - 2}` : ''}</div>}
                </div>
              );
            })}
          </div>
        );
      })}
      {schema.schemas.some(schemaNode => (schemaNode.routines?.length ?? 0) > 0) && <div className="mt-2 border-t border-gray-200 pt-2">
        {schema.schemas.flatMap(schemaNode => (schemaNode.routines || []).slice(0, 5).map(routine => (
          <div key={`${schemaNode.name}.${routine.name}`} className="flex h-6 items-center gap-2 px-3 text-[10px] text-gray-500"><Braces className="h-3 w-3 text-gray-400" /><span className="truncate">{routine.name}</span><span className="ml-auto uppercase text-[8px] text-gray-400">{routine.kind}</span></div>
        )))}
      </div>}
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

  const connect = async (event: React.FormEvent) => {
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

  const runQuery = async (tabId = activeTab.id, options?: { offset?: number; sort?: AdvancedSort; filters?: AdvancedFilter[] }) => {
    if (!connection && !fileSource) return;
    const tab = tabs.find(candidate => candidate.id === tabId);
    if (!tab?.sql.trim()) return;
    const executableSql = materializeSqlParameters(tab.sql, tab.parameters);
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
    patchTab(tabId, { isRunning: true, error: '', warnings: [], offset, sort, filters });
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
    const rows = resultRowsAsObjects(displayResult).slice(0, 1000);
    if (rows.length === 0) {
      patchTab(activeTab.id, { warnings: ['Run a query with rows before creating a Simple BA brief.'] });
      return;
    }

    const analysisAction: AnalysisAction = {
      id: `advanced_result_${activeTab.id}`,
      opportunityName: `Decision brief: ${activeTab.title}`,
      label: 'Analyze Advanced result',
      description: 'Create a Simple mode BA decision brief from the current Advanced result set.',
      actionType: 'table_preview',
      dimensions: [],
      measures: [],
      confidenceScore: 70,
      source: 'dataset_understanding'
    };
    const runtimeIntent = createRuntimeIntentFromAnalysisAction(analysisAction);
    const runtimePlanPreview = createRuntimePlanPreview(runtimeIntent);
    createInvestigationSession(
      `advanced:${activeTab.title}`,
      analysisAction,
      runtimeIntent,
      runtimePlanPreview,
      rows,
      undefined,
      undefined,
      'retained_rows'
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
            {profiles.length > 0 && <><label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-profile">Saved profile</label><select id="advanced-profile" className="mb-4 h-9 w-full border border-gray-300 bg-white px-3 text-sm" value={selectedProfileId} onChange={event => { setSelectedProfileId(event.target.value); const profile = profiles.find(item => item.id === event.target.value); if (profile) { setConnectionName(profile.name); setConnectionProvider(profile.provider); setDatabaseName(profile.database); setTlsMode(profile.tlsMode); setSshHost(profile.sshHost || ''); setSshPort(profile.sshPort || 22); setSshUser(profile.sshUser || ''); setProfileGroupName(profile.groupName || ''); setProfileTagName(profile.tagName || ''); setSafeMode(profile.safeMode || 'confirm_writes'); } }}><option value="">New connection</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.groupName ? `${profile.groupName} / ` : ''}{profile.name} · {profile.provider}{profile.tagName ? ` · ${profile.tagName}` : ''}</option>)}</select></>}
            <label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-name">Connection name</label>
            <input id="advanced-name" className="mb-4 h-9 w-full border border-gray-300 px-3 text-sm outline-none focus:border-blue-500" value={connectionName} onChange={event => setConnectionName(event.target.value)} required />
            <label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-url">Connection URL or SQLite path</label>
            <input id="advanced-url" type="password" disabled={Boolean(selectedProfileId)} className="h-9 w-full border border-gray-300 px-3 font-mono text-sm outline-none focus:border-blue-500 disabled:bg-gray-100" placeholder={selectedProfileId ? 'Encrypted credential from profile' : connectionProvider === 'mongodb' ? 'mongodb+srv://user:password@cluster/database' : connectionProvider === 'sqlite' ? 'sqlite:///path/to/database.db' : `${connectionProvider}://user:password@host/database`} value={connectionUrl} onChange={event => setConnectionUrl(event.target.value)} required={!selectedProfileId} />
            {connectionProvider === 'mongodb' && <><label className="mb-1 mt-4 block text-[11px] font-medium text-gray-600" htmlFor="advanced-database">Database override</label><input id="advanced-database" className="h-9 w-full border border-gray-300 px-3 text-sm" value={databaseName} onChange={event => setDatabaseName(event.target.value)} placeholder="Optional when present in URL" /></>}
            {!selectedProfileId && <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[11px] font-medium text-gray-600">TLS policy</span><select className="mt-1 h-8 w-full border border-gray-300 bg-white px-2 text-[11px]" value={tlsMode} onChange={event => setTlsMode(event.target.value)}><option value="driver-default">Driver default</option><option value="require">Require TLS</option><option value="verify-full">Verify full</option></select></label>
              <label className="block"><span className="text-[11px] font-medium text-gray-600">Safe mode</span><select className="mt-1 h-8 w-full border border-gray-300 bg-white px-2 text-[11px]" value={safeMode} onChange={event => setSafeMode(event.target.value as AdvancedConnectionProfile['safeMode'])}><option value="confirm_writes">Confirm writes</option><option value="read_only">Read only</option><option value="off">Off</option></select></label>
              <input className="h-8 border border-gray-300 px-2 text-[11px]" value={profileGroupName} onChange={event => setProfileGroupName(event.target.value)} placeholder="Profile group" />
              <input className="h-8 border border-gray-300 px-2 text-[11px]" value={profileTagName} onChange={event => setProfileTagName(event.target.value)} placeholder="Profile tag" />
              <input className="h-8 border border-gray-300 px-2 text-[11px]" value={sshHost} onChange={event => setSshHost(event.target.value)} placeholder="SSH host" />
              <div className="flex gap-2"><input className="h-8 min-w-0 flex-1 border border-gray-300 px-2 text-[11px]" value={sshUser} onChange={event => setSshUser(event.target.value)} placeholder="SSH user" /><input type="number" className="h-8 w-16 border border-gray-300 px-2 text-[11px]" value={sshPort} onChange={event => setSshPort(Number(event.target.value) || 22)} /></div>
              <label className="col-span-2 flex items-center gap-2 text-[11px] text-gray-600"><input type="checkbox" checked={saveProfile} onChange={event => setSaveProfile(event.target.checked)} /> Save encrypted profile</label>
            </div>}
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
              <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-gray-200 px-2">
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
                {activeResult && <><button onClick={() => exportResult('csv')} className="ml-2 p-1 text-gray-500 hover:bg-gray-100" title={hasActivePendingChanges ? 'Export edited result page as CSV' : 'Export current result page as CSV'}><Download className="h-3.5 w-3.5" /></button><button onClick={() => void exportAllResult('csv')} disabled={isExportingAll} className="hidden h-6 items-center gap-1 px-1.5 text-[9px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-40 sm:inline-flex" title="Export full result as paged CSV">{isExportingAll && <Loader2 className="h-3 w-3 animate-spin" />}All CSV</button><button onClick={() => void exportAllResult('xlsx')} disabled={isExportingAll} className="hidden h-6 px-1.5 text-[9px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-40 sm:inline-flex">All XLSX</button><button onClick={() => void exportAllResult('json')} disabled={isExportingAll} className="hidden h-6 px-1.5 text-[9px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-40 sm:inline-flex">All JSON</button><button onClick={() => void exportAllResult('sql')} disabled={isExportingAll} className="hidden h-6 px-1.5 text-[9px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-40 sm:inline-flex">All SQL</button>{exportProgress && <span className="hidden items-center gap-1 px-1.5 text-[9px] font-semibold text-blue-700 sm:inline-flex"><Loader2 className="h-3 w-3 animate-spin" /> {exportProgress.format} {exportProgress.rows.toLocaleString('en')}</span>}{isExportingAll && <button onClick={cancelFullExport} className="hidden h-6 px-1.5 text-[9px] font-semibold text-red-600 hover:bg-red-50 sm:inline-flex">Cancel export</button>}<button onClick={() => exportResult('xlsx')} className="hidden h-6 px-1.5 text-[9px] font-semibold text-gray-500 hover:bg-gray-100 sm:inline-flex">Export XLSX</button><button onClick={() => exportResult('json')} className="hidden h-6 px-1.5 text-[9px] font-semibold text-gray-500 hover:bg-gray-100 sm:inline-flex">Export JSON</button><button onClick={() => exportResult('sql')} className="hidden h-6 px-1.5 text-[9px] font-semibold text-gray-500 hover:bg-gray-100 sm:inline-flex">Export SQL</button></>}
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
              {activeTab.error ? <div className="m-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 font-mono text-[12px] text-red-700">{activeTab.error}</div> : activeTab.isRunning ? <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Executing read-only query...</div> : activeTab.resultView === 'plan' && activeTab.plan !== null ? <QueryPlanView plan={activeTab.plan} /> : displayResult ? <div className="min-h-0 flex-1">{activeTab.resultView === 'grid' ? <VirtualResultGrid result={displayResult} sort={activeTab.sort} onSort={workspaceProvider === 'mongodb' ? () => undefined : toggleSort} columnWidths={activeTab.columnWidths} onColumnResize={resizeVisibleColumn} onColumnMove={moveVisibleColumn} editable={activeTab.editMode} editedKeys={visibleEditedKeys} deletedRows={activeDeletedRows} onEdit={editVisibleCell} onDuplicateRow={canCommitActive ? duplicateRowAsInsert : undefined} onDeleteRow={canCommitActive ? markRowDeleted : undefined} onRestoreRow={canCommitActive ? restoreDeletedRow : undefined} copyTableName={activeTab.tableContext?.table} foreignKeyActions={foreignKeyActions} /> : activeTab.resultView === 'chart' ? <ResultChart result={displayResult} /> : activeTab.resultView === 'json' ? <ResultJson result={displayResult} /> : <ResultStructure result={displayResult} />}</div> : <div className="flex flex-1 items-center justify-center text-sm text-gray-400">No result set.</div>}
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
