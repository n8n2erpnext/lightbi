import * as XLSX from 'xlsx';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { RuntimeDatasetSource, RuntimeRowScope } from './runtime-dataset-source';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { SafeSqlPreview } from './safe-sql-preview';
import { executeLocalDuckDB } from './local-duckdb-executor';

export type DrillThroughPoint = {
  dimensionField: string;
  value: unknown;
  label: string;
  measureField?: string;
  measureValue?: unknown;
};

export type DrillThroughResult = DuckDBPreviewResult & {
  point: DrillThroughPoint;
};

export type DrillThroughInput = {
  runtimePlan: RuntimePlanPreview;
  point: DrillThroughPoint;
  rows?: Record<string, unknown>[];
  runtimeDatasetSource?: RuntimeDatasetSource;
  rowScope?: RuntimeRowScope;
  limit?: number;
  signal?: AbortSignal;
};

function quoteLowercaseIdent(ident: string): string {
  return `"${ident.toLowerCase().replace(/"/g, '""')}"`;
}

function sqlString(value: unknown): string {
  return String(value).replace(/'/g, "''");
}

export function buildDrillThroughSql(point: DrillThroughPoint, limit = 50_000): string {
  const field = quoteLowercaseIdent(point.dimensionField);
  const safeLimit = Math.max(1, Math.min(100_000, Math.floor(limit)));
  const where = point.value === null || point.value === undefined
    ? `${field} IS NULL`
    : `TRIM(CAST(${field} AS VARCHAR)) = '${sqlString(point.value).trim()}'`;
  return `SELECT *\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE ${where}\nLIMIT ${safeLimit};`;
}

function createDrillPlan(runtimePlan: RuntimePlanPreview, point: DrillThroughPoint): RuntimePlanPreview {
  return {
    ...runtimePlan,
    id: `${runtimePlan.id}_drill_${point.dimensionField.replace(/[^a-z0-9_-]+/gi, '_')}`,
    logicalOperations: [{ type: 'scan', columns: [] }, { type: 'limit', rows: 50_000 }],
    requiredColumns: [],
    expectedOutput: {
      shape: 'table',
      dimensions: [],
      measures: [],
    },
    warnings: [...runtimePlan.warnings],
    blockedReasons: [...runtimePlan.blockedReasons],
  };
}

function createDrillSqlPreview(runtimePlan: RuntimePlanPreview, point: DrillThroughPoint, limit: number): SafeSqlPreview {
  return {
    id: `sql_${runtimePlan.id}_drill`,
    sourcePlanId: runtimePlan.id,
    status: runtimePlan.status,
    dialect: 'duckdb',
    sql: runtimePlan.status === 'ready' ? buildDrillThroughSql(point, limit) : null,
    parameters: { [point.dimensionField]: point.value },
    referencedColumns: [point.dimensionField],
    warnings: [...runtimePlan.warnings],
    blockedReasons: [...runtimePlan.blockedReasons],
    source: 'runtime_plan_preview',
  };
}

export async function executeDrillThrough(input: DrillThroughInput): Promise<DrillThroughResult> {
  const limit = input.limit ?? 50_000;
  const runtimePlan = createDrillPlan(input.runtimePlan, input.point);
  const safeSqlPreview = createDrillSqlPreview(runtimePlan, input.point, limit);
  const result = await executeLocalDuckDB({
    runtimePlan,
    safeSqlPreview,
    rows: input.rows,
    runtimeDatasetSource: input.runtimeDatasetSource,
    rowScope: input.rowScope,
    limit,
    signal: input.signal,
  });
  return { ...result, point: input.point };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function rowsToCsv(columns: string[], rows: Record<string, unknown>[]): string {
  return [
    columns.map(csvCell).join(','),
    ...rows.map(row => columns.map(column => csvCell(row[column])).join(',')),
  ].join('\r\n');
}

export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportRowsAsCsv(name: string, columns: string[], rows: Record<string, unknown>[]): void {
  downloadBlob(name, new Blob([rowsToCsv(columns, rows)], { type: 'text/csv;charset=utf-8' }));
}

export function exportRowsAsXlsx(name: string, columns: string[], rows: Record<string, unknown>[]): void {
  const workbook = XLSX.utils.book_new();
  const orderedRows = rows.map(row => Object.fromEntries(columns.map(column => [column, row[column]])));
  const worksheet = XLSX.utils.json_to_sheet(orderedRows, { header: columns });
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered rows');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  downloadBlob(name, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
