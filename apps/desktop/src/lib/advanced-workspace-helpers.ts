import type { QueryCellValue } from '@lightbi/core-types';
import type {
  AdvancedColumnNode,
  AdvancedConnection,
  AdvancedFilterOperator,
  AdvancedQueryResult,
  AdvancedTableNode,
} from './advanced-api';
import {
  advancedResultToCsv,
  createAdvancedId,
  restoreAdvancedTabs,
  type PersistedAdvancedTab,
} from './advanced-workspace';
import { EMPTY_ADVANCED_EDIT_STATE, type AdvancedEditState } from './advanced-edit-session';

export const CREATE_NEW_IMPORT_TARGET = '__create_new_table__';

export type ResultView = 'grid' | 'chart' | 'json' | 'structure' | 'plan';

export type WorkspaceTab = PersistedAdvancedTab & {
  offset: number;
  result: AdvancedQueryResult | null;
  warnings: string[];
  error: string;
  isRunning: boolean;
  resultView: ResultView;
  sort?: import('./advanced-api').AdvancedSort;
  filters: import('./advanced-api').AdvancedFilter[];
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

export type SqlAssistantBrief = {
  intent: string;
  risk: 'low' | 'medium' | 'high';
  observations: string[];
  recommendations: string[];
  optimizedSketch?: string;
};

export type ImportDraft = {
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

export type FileTableImportDraft = {
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

export type CreateColumnDraft = {
  id: string;
  name: string;
  nativeType: string;
  nullable: boolean;
  primaryKey: boolean;
  indexed: boolean;
  referencesTable: string;
  referencesColumn: string;
};

export type CreateTableDraft = {
  open: boolean;
  schemaName: string;
  tableName: string;
  columns: CreateColumnDraft[];
};

export type StructureColumnDraft = {
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

export type StructureTableDraft = {
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

export type QuickCommand = {
  id: string;
  kind: 'table' | 'tab' | 'history' | 'favorite' | 'source' | 'action';
  title: string;
  subtitle: string;
  keywords: string;
  run: () => void;
};

export function hydrateTab(tab: PersistedAdvancedTab): WorkspaceTab {
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

export function loadAdvancedWorkspaceTabs(storageValue: string | null): WorkspaceTab[] {
  return restoreAdvancedTabs(storageValue).map(hydrateTab);
}

export function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildRenamedResultSql(sql: string, result: AdvancedQueryResult, columnId: string, nextName: string): string {
  const baseSql = sql.trim().replace(/;+\s*$/, '');
  const trimmedName = nextName.trim();
  if (!baseSql) throw new Error('Run a query before renaming a result column.');
  if (!trimmedName) throw new Error('Column name cannot be empty.');
  if (!result.columns.some(column => column.id === columnId)) throw new Error('Column is not present in this result.');
  const nextColumns = result.columns.map(column => column.id === columnId ? trimmedName : column.name);
  const duplicate = nextColumns.find((name, index) => nextColumns.findIndex(candidate => candidate === name) !== index);
  if (duplicate) throw new Error(`Column name "${duplicate}" already exists in this result.`);
  const projection = result.columns
    .map(column => `  ${quoteIdentifier(column.name)} AS ${quoteIdentifier(column.id === columnId ? trimmedName : column.name)}`)
    .join(',\n');
  return `SELECT\n${projection}\nFROM (\n${baseSql}\n) AS __lightbi_renamed_result`;
}

export function quoteMysqlIdentifier(value: string): string {
  return `\`${value.replaceAll('`', '``')}\``;
}

export function quoteSqlServerIdentifier(value: string): string {
  return `[${value.replaceAll(']', ']]')}]`;
}

export function qualifiedTableReference(provider: AdvancedConnection['provider'] | 'duckdb', schemaName: string, tableName: string): string {
  if (provider === 'mysql' || provider === 'mariadb') return `${quoteMysqlIdentifier(schemaName)}.${quoteMysqlIdentifier(tableName)}`;
  if (provider === 'sqlserver') return `${quoteSqlServerIdentifier(schemaName)}.${quoteSqlServerIdentifier(tableName)}`;
  if (provider === 'sqlite' || provider === 'duckdb') return quoteIdentifier(tableName);
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
}

export function splitReferencedTable(currentSchema: string, referencedTable: string): { schema: string; table: string } {
  const parts = referencedTable.split('.');
  if (parts.length >= 2) return { schema: parts.slice(0, -1).join('.'), table: parts[parts.length - 1] };
  return { schema: currentSchema, table: referencedTable };
}

export function displayCell(value: QueryCellValue): string {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function gridClipboardCell(value: QueryCellValue): string {
  if (value === null) return '';
  return String(value).replace(/\r?\n/g, ' ');
}

function detectSqlParameters(sql: string): string[] {
  const names = new Set<string>();
  for (const match of sql.matchAll(/(^|[^:]):([A-Za-z_][A-Za-z0-9_]*)/g)) names.add(match[2]);
  return [...names].sort();
}

export function reconcileSqlParameters(sql: string, existing: Record<string, string>): Record<string, string> {
  return Object.fromEntries(detectSqlParameters(sql).map(name => [name, existing[name] ?? '']));
}

function parameterValue(value: string): QueryCellValue {
  if (value.trim() === '') return null;
  if (/^(true|false)$/i.test(value.trim())) return value.trim().toLowerCase() === 'true';
  if (Number.isFinite(Number(value))) return Number(value);
  return value;
}

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function materializeSqlParameters(sql: string, parameters: Record<string, string>): string {
  return sql.replace(/(^|[^:]):([A-Za-z_][A-Za-z0-9_]*)/g, (_match, prefix: string, name: string) => (
    `${prefix}${sqlLiteral(parameterValue(parameters[name] ?? ''))}`
  ));
}

export function parseClipboardRows(text: string): string[][] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line, index, lines) => line.length > 0 || index < lines.length - 1)
    .map(line => line.split('\t'));
}

export async function readTextFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return '';
  }
}

export async function copyTextToClipboard(text: string): Promise<void> {
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

export function resultRowsAsObjects(result: AdvancedQueryResult): Record<string, unknown>[] {
  return result.rows.map(row => Object.fromEntries(result.columns.map((column, index) => [column.name, row[index] ?? null])));
}

export function buildDeleteMutationRows(result: AdvancedQueryResult, rowIndexes: number[], primaryKeys: string[]) {
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

export function buildInsertMutationRows(result: AdvancedQueryResult, rowIndexes: number[], primaryKeys: string[]) {
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

export function buildManualInsertMutationRows(rows: Record<string, QueryCellValue>[]) {
  return rows.map(row => ({ action: 'insert' as const, key: {}, changes: row, expected: {} }));
}

export function coerceInsertDraftValue(nativeType: string, text: string): QueryCellValue {
  const value = text.trim();
  if (value === '') return null;
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/(int|decimal|numeric|double|float|real|serial|money)/i.test(nativeType) && Number.isFinite(Number(value))) return Number(value);
  return text;
}

export function analyzeSqlForAssistant(sql: string, provider: string): SqlAssistantBrief {
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

export function defaultImportColumnMap(sourceColumns: string[], targetColumns: AdvancedColumnNode[]): Record<string, string> {
  const normalized = new Map(sourceColumns.map(column => [column.toLocaleLowerCase(), column]));
  return Object.fromEntries(targetColumns
    .filter(column => !column.primaryKey)
    .map(column => [column.name, normalized.get(column.name.toLocaleLowerCase()) ?? '']));
}

export function importColumnSqlType(nativeType?: string): string {
  const type = nativeType || '';
  if (/bool/i.test(type)) return 'BOOLEAN';
  if (/(int|whole)/i.test(type)) return 'BIGINT';
  if (/(number|decimal|numeric|double|float|real|money|currency)/i.test(type)) return 'DOUBLE PRECISION';
  if (/(date|time)/i.test(type)) return 'TIMESTAMP';
  return 'TEXT';
}

export function createBlankColumnDraft(): CreateColumnDraft {
  return { id: createAdvancedId(), name: '', nativeType: 'TEXT', nullable: true, primaryKey: false, indexed: false, referencesTable: '', referencesColumn: '' };
}

export function createBlankStructureColumnDraft(): StructureColumnDraft {
  return { id: createAdvancedId(), originalName: '', name: '', originalType: 'TEXT', nativeType: 'TEXT', originalNullable: true, nullable: true, originalDefault: '', defaultValue: '', originalComment: '', comment: '', primaryKey: false, drop: false, added: true };
}

export function structureDraftFromTable(schemaName: string, table: AdvancedTableNode): StructureTableDraft {
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

export function generateCreateTableSql(draft: CreateTableDraft, provider: AdvancedConnection['provider'] | 'duckdb'): string {
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

export function generateStructureSql(draft: StructureTableDraft, provider: AdvancedConnection['provider'] | 'duckdb'): string {
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
    else statements.push('-- Review manually: SQLite table comments are not supported;');
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

export function mongoFilterValue(operator: AdvancedFilterOperator, value: string): unknown {
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

export function compactCount(value?: number | null): string {
  if (value === undefined || value === null || value < 0) return '';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function resultToCsv(result: AdvancedQueryResult): string {
  return advancedResultToCsv(result.columns, result.rows);
}
