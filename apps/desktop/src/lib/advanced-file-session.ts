import type { QueryCellValue } from '@lightbi/core-types';
import type { AdvancedFilter, AdvancedFilterGroup, AdvancedFilterNode, AdvancedQueryResult, AdvancedSort } from './advanced-api';
import { materializeRuntimeDatasetSource } from './full-file-runtime-materializer';
import { initDuckDbWasm } from './duckdb-wasm-loader';
import type { AdvancedWorkspaceSource } from '../stores/advanced-source-store';

const MAX_ROWS = 1000;

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function normalizeValue(value: unknown): QueryCellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

function logicalType(nativeType: string): 'string' | 'number' | 'boolean' | 'date' {
  const native = nativeType.toUpperCase();
  if (/INT|DECIMAL|DOUBLE|FLOAT|REAL|HUGEINT/.test(native)) return 'number';
  if (/BOOL/.test(native)) return 'boolean';
  if (/DATE|TIME/.test(native)) return 'date';
  return 'string';
}

function readOnlySql(sql: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  const first = trimmed.split(/\s+/, 1)[0]?.toUpperCase();
  if (!trimmed || (first !== 'SELECT' && first !== 'WITH')) throw new Error('File workspace only permits SELECT or WITH queries.');
  return trimmed;
}

function escapedLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function isFilterGroup(node: AdvancedFilterNode): node is AdvancedFilterGroup {
  return 'children' in node;
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function splitFilterList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 50);
}

function compileFilterCondition(filter: AdvancedFilter): string {
  const column = `CAST(${quoteIdentifier(filter.column)} AS VARCHAR)`;
  const value = filter.value ?? '';
  switch (filter.operator) {
    case 'contains': return `${column} ILIKE ${escapedLiteral(`%${escapeLike(value)}%`)} ESCAPE '\\'`;
    case 'not_contains': return `(${column} NOT ILIKE ${escapedLiteral(`%${escapeLike(value)}%`)} ESCAPE '\\' OR ${quoteIdentifier(filter.column)} IS NULL)`;
    case 'equals': return `${column} = ${escapedLiteral(value)}`;
    case 'not_equals': return `(${column} <> ${escapedLiteral(value)} OR ${quoteIdentifier(filter.column)} IS NULL)`;
    case 'starts_with': return `${column} ILIKE ${escapedLiteral(`${escapeLike(value)}%`)} ESCAPE '\\'`;
    case 'ends_with': return `${column} ILIKE ${escapedLiteral(`%${escapeLike(value)}`)} ESCAPE '\\'`;
    case 'greater_than': return `${quoteIdentifier(filter.column)} > ${escapedLiteral(value)}`;
    case 'greater_or_equal': return `${quoteIdentifier(filter.column)} >= ${escapedLiteral(value)}`;
    case 'less_than': return `${quoteIdentifier(filter.column)} < ${escapedLiteral(value)}`;
    case 'less_or_equal': return `${quoteIdentifier(filter.column)} <= ${escapedLiteral(value)}`;
    case 'is_blank': return `(${quoteIdentifier(filter.column)} IS NULL OR ${column} = '')`;
    case 'is_not_blank': return `(${quoteIdentifier(filter.column)} IS NOT NULL AND ${column} <> '')`;
    case 'in': return `${column} IN (${splitFilterList(value).map(escapedLiteral).join(', ') || "''"})`;
    case 'not_in': return `(${column} NOT IN (${splitFilterList(value).map(escapedLiteral).join(', ') || "''"}) OR ${quoteIdentifier(filter.column)} IS NULL)`;
  }
}

function compileFilterNode(node: AdvancedFilterNode): string {
  if (!isFilterGroup(node)) return compileFilterCondition(node);
  const predicates = node.children.map(compileFilterNode).filter(Boolean);
  if (predicates.length === 0) return '';
  return `(${predicates.join(node.combinator === 'or' ? ' OR ' : ' AND ')})`;
}

function filterLeaves(node: AdvancedFilterNode): AdvancedFilter[] {
  return isFilterGroup(node) ? node.children.flatMap(filterLeaves) : [node];
}

export class AdvancedFileSession {
  private connection: Awaited<ReturnType<Awaited<ReturnType<typeof initDuckDbWasm>>['connect']>> | null = null;
  private sourceId = '';

  async open(source: AdvancedWorkspaceSource, signal?: AbortSignal): Promise<void> {
    if (this.connection && this.sourceId === source.id) return;
    await this.close();
    signal?.throwIfAborted();
    const db = await initDuckDbWasm();
    this.connection = await db.connect();
    this.sourceId = source.id;
    for (const [index, table] of source.tables.entries()) {
      signal?.throwIfAborted();
      const materialized = await materializeRuntimeDatasetSource({
        kind: 'local_files', files: [{ file: table.file, sheetName: table.sheetName }], sourceRowCount: table.rowCount,
      }, signal);
      const fileName = `advanced-source-${index}.json`;
      await db.registerFileText(fileName, materialized.jsonText);
      await this.connection.query(`CREATE OR REPLACE VIEW ${quoteIdentifier(table.name)} AS SELECT * FROM read_json_auto('${fileName}')`);
    }
  }

  async execute(input: {
    runId: string; sql: string; limit: number; offset?: number; sort?: AdvancedSort; filters?: AdvancedFilter[]; filterTree?: AdvancedFilterGroup; signal?: AbortSignal;
  }): Promise<AdvancedQueryResult> {
    if (!this.connection) throw new Error('File workspace session is not open.');
    input.signal?.throwIfAborted();
    const sql = readOnlySql(input.sql);
    const limit = Math.min(Math.max(input.limit || 200, 1), MAX_ROWS);
    const offset = Math.max(input.offset || 0, 0);
    const description = await this.connection.query(`SELECT * FROM (${sql}) AS __lightbi_file_query LIMIT 0`);
    const available = new Set(description.schema.fields.map(field => field.name));
    const filterTree = input.filterTree ?? ((input.filters || []).length ? { combinator: 'and' as const, children: input.filters || [] } : undefined);
    for (const filter of filterTree ? filterLeaves(filterTree) : []) {
      if (!available.has(filter.column)) throw new Error('Filter column is not present in this result.');
      if ((filter.value ?? '').length > 1000) throw new Error('Filter value cannot exceed 1,000 characters.');
    }
    if (input.sort && !available.has(input.sort.column)) throw new Error('Sort column is not present in this result.');
    const predicate = filterTree ? compileFilterNode(filterTree) : '';
    const order = input.sort ? ` ORDER BY ${quoteIdentifier(input.sort.column)} ${input.sort.direction === 'desc' ? 'DESC' : 'ASC'} NULLS LAST` : '';
    const where = predicate ? ` WHERE ${predicate}` : '';
    const startedAt = performance.now();
    const result = await this.connection.query(`SELECT * FROM (${sql}) AS __lightbi_file_query${where}${order} LIMIT ${limit + 1} OFFSET ${offset}`);
    input.signal?.throwIfAborted();
    const rawRows = result.toArray();
    const hasMore = rawRows.length > limit;
    const fields = result.schema.fields;
    const rows = rawRows.slice(0, limit).map(row => {
      const object = row.toJSON() as Record<string, unknown>;
      return fields.map(field => normalizeValue(object[field.name]));
    });
    return {
      runId: input.runId,
      columns: fields.map((field, index) => ({ id: `column:${index}:${field.name}`, name: field.name, logicalType: logicalType(String(field.type)), nativeType: String(field.type) })),
      rows,
      page: { offset, limit, hasMore },
      truncated: hasMore,
      warnings: hasMore ? [`Result limited to ${limit} rows.`] : [],
      executionMs: Math.round(performance.now() - startedAt),
    };
  }

  async close(): Promise<void> {
    if (this.connection) await this.connection.close().catch(() => undefined);
    this.connection = null;
    this.sourceId = '';
  }
}
