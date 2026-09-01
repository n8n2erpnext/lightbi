import * as XLSX from 'xlsx';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { RuntimeDatasetSource, RuntimeRowScope } from './runtime-dataset-source';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { SafeSqlPreview } from './safe-sql-preview';
import { executeLocalDuckDB } from './local-duckdb-executor';
import { saveBlobWithUserChoice } from './native-capabilities';

export type DrillThroughPoint = {
  dimensionField: string;
  /** Physical source column used to retrieve the raw rows behind a canonical chart point. */
  sourceDimensionField?: string;
  value: unknown;
  label: string;
  /** Display semantic used by the chart so raw temporal values can be matched without comparing localized labels. */
  dimensionSemanticType?: string;
  measureField?: string;
  measureValue?: unknown;
};

export type DrillThroughFieldBinding = {
  canonicalId: string;
  physicalColumn?: string;
  label?: string;
  role?: string;
  confidence?: number;
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
  fieldBindings?: DrillThroughFieldBinding[];
  limit?: number;
  signal?: AbortSignal;
};

function normalizedFieldName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isGenericTimeField(value: string): boolean {
  return ['time', 'date', 'period', 'timeperiod', 'reportingperiod'].includes(normalizedFieldName(value));
}

export function resolveDrillThroughPoint(
  point: DrillThroughPoint,
  fieldBindings: DrillThroughFieldBinding[] = [],
  sourceColumns: string[] = [],
): DrillThroughPoint {
  const targets = new Set([
    normalizedFieldName(point.dimensionField),
    point.sourceDimensionField ? normalizedFieldName(point.sourceDimensionField) : '',
  ].filter(Boolean));
  const usable = fieldBindings
    .filter((binding) => binding.physicalColumn?.trim())
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0));
  const direct = usable.find((binding) => [binding.canonicalId, binding.physicalColumn!, binding.label ?? '']
    .some((candidate) => targets.has(normalizedFieldName(candidate))));
  const sourceMatch = sourceColumns.find((column) => targets.has(normalizedFieldName(column)));
  const timeBindings = usable.filter((binding) => binding.role === 'time');
  const timeFallback = isGenericTimeField(point.dimensionField) && timeBindings.length === 1
    ? timeBindings[0]
    : undefined;
  // A chart point can already carry a sourceDimensionField derived from a
  // normalized semantic label. Reconcile it again with the physical source
  // binding because Unicode composition, surrounding whitespace, and casing
  // are material when DuckDB binds the runtime JSON column.
  const sourceDimensionField = direct?.physicalColumn
    ?? sourceMatch
    ?? timeFallback?.physicalColumn
    ?? point.sourceDimensionField;
  return sourceDimensionField ? { ...point, sourceDimensionField } : point;
}

function quoteLowercaseIdent(ident: string): string {
  // Keep this identical to full-file-runtime-parser.normalizeRow().
  return `"${ident.trim().toLowerCase().replace(/"/g, '""')}"`;
}

function sqlString(value: unknown): string {
  return String(value).replace(/'/g, "''");
}

function temporalDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Math.abs(value) >= 100_000_000_000) return new Date(value);
    if (Math.abs(value) >= 1_000_000_000) return new Date(value * 1000);
    if (value >= 20_000 && value <= 80_000) return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return temporalDate(Number(trimmed));
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return null;
}

function buildTemporalPredicate(field: string, point: DrillThroughPoint): string | null {
  const semantic = point.dimensionSemanticType?.toLowerCase();
  const normalizedField = normalizedFieldName(point.sourceDimensionField ?? point.dimensionField);
  const isTemporalField = semantic === 'date' || semantic === 'datetime' || semantic === 'time'
    || /(date|time|timestamp|datetime|period|ngay|thang|nam)/.test(normalizedField);
  if (!isTemporalField) return null;
  const target = temporalDate(point.value);
  if (!target || !Number.isFinite(target.getTime())) return null;
  const numeric = `TRY_CAST(${field} AS DOUBLE)`;
  const targetDate = target.toISOString().slice(0, 10);
  const dateOnly = semantic === 'date' || (!semantic && !/\d{1,2}:\d{2}/.test(point.label));
  if (dateOnly) {
    return `(
      CAST(TRY_CAST(${field} AS TIMESTAMP) AS DATE) = DATE '${targetDate}'
      OR CASE WHEN ABS(${numeric}) BETWEEN 100000000000 AND 9999999999999 THEN CAST(epoch_ms(TRY_CAST(${field} AS BIGINT)) AS DATE) END = DATE '${targetDate}'
      OR CASE WHEN ABS(${numeric}) BETWEEN 1000000000 AND 99999999999 THEN CAST(to_timestamp(${numeric}) AS DATE) END = DATE '${targetDate}'
      OR CASE WHEN ${numeric} BETWEEN 20000 AND 80000 THEN DATE '1899-12-30' + TRY_CAST(${field} AS INTEGER) END = DATE '${targetDate}'
    )`;
  }
  const targetTimestamp = target.toISOString().replace('T', ' ').replace('Z', '');
  return `(
    TRY_CAST(${field} AS TIMESTAMP) = TIMESTAMP '${targetTimestamp}'
    OR CASE WHEN ABS(${numeric}) BETWEEN 100000000000 AND 9999999999999 THEN epoch_ms(TRY_CAST(${field} AS BIGINT)) END = TIMESTAMP '${targetTimestamp}'
    OR CASE WHEN ABS(${numeric}) BETWEEN 1000000000 AND 99999999999 THEN CAST(to_timestamp(${numeric}) AS TIMESTAMP) END = TIMESTAMP '${targetTimestamp}'
  )`;
}

export function buildDrillThroughSql(point: DrillThroughPoint, limit = 50_000): string {
  const field = quoteLowercaseIdent(point.sourceDimensionField ?? point.dimensionField);
  const safeLimit = Math.max(1, Math.min(100_000, Math.floor(limit)));
  const direct = point.value === null || point.value === undefined
    ? `${field} IS NULL`
    : `TRIM(CAST(${field} AS VARCHAR)) = '${sqlString(point.value).trim()}'`;
  const temporal = point.value === null || point.value === undefined ? null : buildTemporalPredicate(field, point);
  const where = temporal ? `(${direct} OR ${temporal})` : direct;
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
  const sourceDimensionField = point.sourceDimensionField ?? point.dimensionField;
  return {
    id: `sql_${runtimePlan.id}_drill`,
    sourcePlanId: runtimePlan.id,
    status: runtimePlan.status,
    dialect: 'duckdb',
    sql: runtimePlan.status === 'ready' ? buildDrillThroughSql(point, limit) : null,
    parameters: { [sourceDimensionField]: point.value },
    referencedColumns: [sourceDimensionField],
    warnings: [...runtimePlan.warnings],
    blockedReasons: [...runtimePlan.blockedReasons],
    source: 'runtime_plan_preview',
  };
}

export async function executeDrillThrough(input: DrillThroughInput): Promise<DrillThroughResult> {
  const limit = input.limit ?? 50_000;
  const sourceColumns = Object.keys(input.rows?.[0] ?? {});
  const point = resolveDrillThroughPoint(input.point, input.fieldBindings, sourceColumns);
  const runtimePlan = createDrillPlan(input.runtimePlan, point);
  const safeSqlPreview = createDrillSqlPreview(runtimePlan, point, limit);
  const result = await executeLocalDuckDB({
    runtimePlan,
    safeSqlPreview,
    rows: input.rows,
    runtimeDatasetSource: input.runtimeDatasetSource,
    rowScope: input.rowScope,
    limit,
    signal: input.signal,
  });
  return { ...result, point };
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

export async function downloadBlob(name: string, blob: Blob) {
  const extension = name.includes('.') ? name.split('.').pop() || '' : '';
  return saveBlobWithUserChoice(blob, {
    suggestedName: name,
    description: extension ? `${extension.toUpperCase()} file` : 'LightBI export',
    extensions: extension ? [extension] : [],
  });
}

export async function exportRowsAsCsv(name: string, columns: string[], rows: Record<string, unknown>[]) {
  return downloadBlob(name, new Blob([rowsToCsv(columns, rows)], { type: 'text/csv;charset=utf-8' }));
}

export async function exportRowsAsXlsx(name: string, columns: string[], rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  const orderedRows = rows.map(row => Object.fromEntries(columns.map(column => [column, row[column]])));
  const worksheet = XLSX.utils.json_to_sheet(orderedRows, { header: columns });
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered rows');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return downloadBlob(name, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
