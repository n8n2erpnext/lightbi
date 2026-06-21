import type { QueryCellValue } from '@lightbi/core-types';
import type { AdvancedFilter, AdvancedQueryResult, AdvancedSort } from './advanced-api';
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
    runId: string; sql: string; limit: number; offset?: number; sort?: AdvancedSort; filters?: AdvancedFilter[]; signal?: AbortSignal;
  }): Promise<AdvancedQueryResult> {
    if (!this.connection) throw new Error('File workspace session is not open.');
    input.signal?.throwIfAborted();
    const sql = readOnlySql(input.sql);
    const limit = Math.min(Math.max(input.limit || 200, 1), MAX_ROWS);
    const offset = Math.max(input.offset || 0, 0);
    const description = await this.connection.query(`SELECT * FROM (${sql}) AS __lightbi_file_query LIMIT 0`);
    const available = new Set(description.schema.fields.map(field => field.name));
    for (const filter of input.filters || []) {
      if (!available.has(filter.column)) throw new Error('Filter column is not present in this result.');
    }
    if (input.sort && !available.has(input.sort.column)) throw new Error('Sort column is not present in this result.');
    const predicates = (input.filters || []).map(filter => {
      const value = filter.value.replaceAll('%', '\\%').replaceAll('_', '\\_');
      const pattern = filter.operator === 'contains' ? `%${value}%` : filter.operator === 'starts_with' ? `${value}%` : filter.operator === 'ends_with' ? `%${value}` : value;
      return filter.operator === 'equals'
        ? `CAST(${quoteIdentifier(filter.column)} AS VARCHAR) = ${escapedLiteral(filter.value)}`
        : `CAST(${quoteIdentifier(filter.column)} AS VARCHAR) ILIKE ${escapedLiteral(pattern)} ESCAPE '\\'`;
    });
    const order = input.sort ? ` ORDER BY ${quoteIdentifier(input.sort.column)} ${input.sort.direction === 'desc' ? 'DESC' : 'ASC'} NULLS LAST` : '';
    const where = predicates.length ? ` WHERE ${predicates.join(' AND ')}` : '';
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
