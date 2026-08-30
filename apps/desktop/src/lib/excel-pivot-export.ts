import * as XLSX from 'xlsx';
import type { AnalysisAction } from './analysis-opportunity-actions';
import type { CleanDataHandoffResultV1, CleanDataLineageV1 } from './clean-data-handoff';
import type { DecisionVisualizationPlanV1 } from './decision-visualization-plan';
import { GOVERNED_METRIC_DEFINITIONS_V1 } from './understanding-core/governed-metric-policy';
import { injectNativeExcelPivot, type NativeExcelPivotAggregation } from './excel-pivot-ooxml';

export const EXCEL_PIVOT_EXPORT_VERSION = 'lightbi.excel-pivot-export.v1' as const;
const EXCEL_MAX_DATA_ROWS = 1_048_575;

export type ExcelPivotExportModeV1 = 'full' | 'current_selection';
export type ExcelPivotExportProgressV1 = 'preparing_data' | 'creating_table' | 'creating_pivot' | 'finalizing';

export type ExcelPivotAppliedFilterV1 = {
  column: string;
  operator: string;
  value: string;
};

export type ExcelPivotRecipeV1 = {
  schemaVersion: typeof EXCEL_PIVOT_EXPORT_VERSION;
  perspectiveId: string;
  name: string;
  rowFields: string[];
  columnFields: string[];
  valueField: string;
  aggregation: NativeExcelPivotAggregation;
  filterFields: string[];
  omittedMeasures: string[];
};

export type ExcelPivotExportRequestV1 = {
  mode: ExcelPivotExportModeV1;
  title: string;
  action: AnalysisAction;
  cleanData: CleanDataHandoffResultV1;
  decisionVisualizationPlan?: DecisionVisualizationPlanV1 | null;
  selectedRows?: Record<string, unknown>[] | null;
  appliedFilters?: ExcelPivotAppliedFilterV1[];
  createdAt?: string;
  onProgress?: (step: ExcelPivotExportProgressV1) => void;
};

export type ExcelPivotSaveResultV1 = {
  fileName: string;
  locationLabel: string;
  usedSaveAs: boolean;
  recipe: ExcelPivotRecipeV1;
  exportedRowCount: number;
};

function token(value: string | null | undefined): string {
  return (value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function lookupValue(row: Record<string, unknown>, lineage: CleanDataLineageV1): unknown {
  if (Object.prototype.hasOwnProperty.call(row, lineage.outputColumn)) return row[lineage.outputColumn];
  if (Object.prototype.hasOwnProperty.call(row, lineage.sourceColumn)) return row[lineage.sourceColumn];
  const target = token(lineage.sourceColumn);
  for (const [key, value] of Object.entries(row)) if (token(key) === target) return value;
  return undefined;
}

function cleanedValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function cleanSelectedRowsForPivot(cleanData: CleanDataHandoffResultV1, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => Object.fromEntries(cleanData.artifact.lineage.map(lineage => [
    lineage.outputColumn,
    cleanedValue(lookupValue(row, lineage)),
  ])));
}

function matchLineage(lineage: CleanDataLineageV1[], candidate: string): CleanDataLineageV1 | null {
  const wanted = token(candidate);
  if (!wanted) return null;
  return lineage.find(item => [item.outputColumn, item.sourceColumn, item.semanticConcept]
    .some(value => token(value) === wanted)) ?? null;
}

function definitionForField(item: CleanDataLineageV1) {
  const concept = token(item.semanticConcept);
  if (!concept) return null;
  return GOVERNED_METRIC_DEFINITIONS_V1.find(definition => token(definition.metricId) === concept
    || definition.requirements.some(requirement => requirement.semanticSignals.some(signal => token(signal) === concept))) ?? null;
}

function safeAggregation(action: AnalysisAction, requestedMeasure: string, field: CleanDataLineageV1): NativeExcelPivotAggregation | null {
  const definition = GOVERNED_METRIC_DEFINITIONS_V1.find(item => token(item.metricId) === token(requestedMeasure)) ?? definitionForField(field);
  if (definition) {
    if (definition.aggregationOperator === 'count_governed_identity' || definition.aggregationOperator === 'count_source_rows') return 'count';
    if (definition.aggregationOperator === 'sum' && definition.additivity === 'additive') return 'sum';
    return null;
  }
  const explicit = action.measureAggregations?.[requestedMeasure]
    ?? action.measureAggregations?.[field.semanticConcept ?? '']
    ?? action.measureAggregations?.[field.outputColumn];
  if (explicit === 'SUM') return 'sum';
  if (explicit === 'COUNT') return 'count';
  return null;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function companionConcepts(primary: CleanDataLineageV1): string[] {
  const concept = token(primary.semanticConcept);
  if (['salesperson', 'person', 'employee', 'employee_name', 'staff_name'].includes(concept)) return ['employee_id'];
  if (['product', 'product_name', 'item'].includes(concept)) return ['sku', 'item_code', 'product_id'];
  if (['customer', 'customer_name'].includes(concept)) return ['customer_id'];
  return [];
}

function firstGenericDimension(lineage: CleanDataLineageV1[], valueField: string): CleanDataLineageV1 | null {
  return lineage.find(item => item.outputColumn !== valueField
    && !/number|decimal|float|double|integer|int/i.test(item.physicalType)
    && item.semanticState !== 'unknown') ?? null;
}

function filterCandidates(lineage: CleanDataLineageV1[], excluded: Set<string>): string[] {
  const preferred = ['report_date', 'date', 'time_period', 'branch', 'region', 'category', 'warehouse', 'sales_channel', 'channel'];
  const output: string[] = [];
  for (const concept of preferred) {
    const item = matchLineage(lineage, concept);
    if (item && !excluded.has(item.outputColumn) && !output.includes(item.outputColumn)) output.push(item.outputColumn);
    if (output.length >= 3) break;
  }
  return output;
}

export function resolveExcelPivotRecipe(request: Pick<ExcelPivotExportRequestV1, 'title' | 'action' | 'cleanData' | 'decisionVisualizationPlan'>): ExcelPivotRecipeV1 {
  const lineage = request.cleanData.artifact.lineage;
  const measureCandidates = unique([
    ...(request.decisionVisualizationPlan?.result.metricIds ?? []),
    ...request.action.measures,
  ].filter(Boolean));
  let valueField: CleanDataLineageV1 | null = null;
  let aggregation: NativeExcelPivotAggregation | null = null;
  const omittedMeasures: string[] = [];
  for (const candidate of measureCandidates) {
    const field = matchLineage(lineage, candidate);
    if (!field) { omittedMeasures.push(candidate); continue; }
    const resolvedAggregation = safeAggregation(request.action, candidate, field);
    if (!resolvedAggregation) { omittedMeasures.push(candidate); continue; }
    valueField = field; aggregation = resolvedAggregation; break;
  }
  if (!valueField || !aggregation) {
    for (const field of lineage) {
      const definition = definitionForField(field);
      if (!definition) continue;
      const resolvedAggregation = safeAggregation(request.action, definition.metricId, field);
      if (resolvedAggregation) { valueField = field; aggregation = resolvedAggregation; break; }
    }
  }
  if (!valueField || !aggregation) throw new Error('EXCEL_PIVOT_NO_SAFE_VALUE_FIELD');

  const dimensionCandidates = unique([
    ...request.action.dimensions,
    request.decisionVisualizationPlan?.result.dimensionField ?? '',
  ].filter(Boolean));
  let primary = dimensionCandidates.map(candidate => matchLineage(lineage, candidate)).find(Boolean) ?? null;
  if (!primary) primary = firstGenericDimension(lineage, valueField.outputColumn);
  if (!primary) throw new Error('EXCEL_PIVOT_NO_USABLE_DIMENSION');
  const rowFields = [primary.outputColumn];
  for (const concept of companionConcepts(primary)) {
    const companion = matchLineage(lineage, concept);
    if (companion && companion.outputColumn !== primary.outputColumn && !rowFields.includes(companion.outputColumn)) rowFields.push(companion.outputColumn);
  }
  const excluded = new Set([...rowFields, valueField.outputColumn]);
  const filterFields = filterCandidates(lineage, excluded);
  return {
    schemaVersion: EXCEL_PIVOT_EXPORT_VERSION,
    perspectiveId: request.decisionVisualizationPlan?.perspectiveId ?? request.action.id,
    name: request.title,
    rowFields,
    columnFields: [],
    valueField: valueField.outputColumn,
    aggregation,
    filterFields,
    omittedMeasures: unique(omittedMeasures.filter(item => token(item) !== token(valueField!.semanticConcept) && token(item) !== token(valueField!.outputColumn))),
  };
}

function contentWidth(value: unknown): number {
  if (value == null) return 0;
  return Math.min(48, String(value).length + 2);
}

function worksheetForData(rows: Record<string, unknown>[], columns: string[]): XLSX.WorkSheet {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] };
  const sample = rows.slice(0, 256);
  sheet['!cols'] = columns.map(column => ({ wch: Math.max(12, Math.min(48, Math.max(column.length + 2, ...sample.map(row => contentWidth(row[column]))))) }));
  return sheet;
}

function aboutRows(request: ExcelPivotExportRequestV1, recipe: ExcelPivotRecipeV1, exportedRowCount: number): Array<[string, string | number]> {
  const filters = request.appliedFilters?.map(filter => `${filter.column} ${filter.operator} ${filter.value}`).join('; ') || 'None';
  return [
    ['Generated by', 'LightBI'],
    ['Export contract', EXCEL_PIVOT_EXPORT_VERSION],
    ['Generated at', request.createdAt ?? new Date().toISOString()],
    ['Perspective', recipe.perspectiveId],
    ['Analysis', request.title],
    ['Export mode', request.mode === 'full' ? 'Full cleaned dataset' : 'Current selection'],
    ['Source rows', request.cleanData.artifact.source.sourceRows],
    ['Exported rows', exportedRowCount],
    ['Initial Pivot rows', recipe.rowFields.join(', ')],
    ['Initial Pivot value', `${recipe.aggregation.toUpperCase()}(${recipe.valueField})`],
    ['Suggested filters', recipe.filterFields.join(', ') || 'None'],
    ['Current LightBI filters', request.mode === 'full' ? 'Not applied to source dataset' : filters],
    ['Omitted default measures', recipe.omittedMeasures.join(', ') || 'None'],
    ['Pivot freedom', 'All exported cleaned fields remain available in the Excel Pivot Field List.'],
    ['Calculated measure policy', 'Unsafe/non-additive/calculated measures are not silently preset.'],
  ];
}

export function createExcelPivotWorkbook(request: ExcelPivotExportRequestV1): { buffer: ArrayBuffer; recipe: ExcelPivotRecipeV1; exportedRowCount: number } {
  request.onProgress?.('preparing_data');
  const requestedRowCount = request.mode === 'full' ? request.cleanData.cleanRows.length : request.selectedRows?.length ?? 0;
  if (request.mode === 'current_selection' && requestedRowCount === 0) throw new Error('EXCEL_PIVOT_CURRENT_SELECTION_EMPTY');
  if (requestedRowCount === 0) throw new Error('EXCEL_PIVOT_DATA_EMPTY');
  if (requestedRowCount > EXCEL_MAX_DATA_ROWS) throw new Error(`EXCEL_PIVOT_ROW_LIMIT:${requestedRowCount}`);
  const rows = request.mode === 'full'
    ? request.cleanData.cleanRows.map(row => ({ ...row }))
    : cleanSelectedRowsForPivot(request.cleanData, request.selectedRows ?? []);
  const columns = request.cleanData.artifact.lineage.map(item => item.outputColumn);
  const recipe = resolveExcelPivotRecipe(request);

  request.onProgress?.('creating_table');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheetForData(rows, columns), 'Data');
  const pivot = XLSX.utils.aoa_to_sheet([
    [request.title],
    [`Initial Pivot · ${recipe.rowFields.join(' + ')} → ${recipe.aggregation.toUpperCase()} ${recipe.valueField}`],
  ]);
  pivot['!cols'] = [{ wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, pivot, 'Pivot');
  const about = XLSX.utils.aoa_to_sheet(aboutRows(request, recipe, rows.length));
  about['!cols'] = [{ wch: 28 }, { wch: 82 }];
  XLSX.utils.book_append_sheet(workbook, about, 'About');
  (workbook as XLSX.WorkBook & { Workbook?: { Views?: Array<{ activeTab?: number }> } }).Workbook = { Views: [{ activeTab: 1 }] };

  request.onProgress?.('creating_pivot');
  const base = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
  const buffer = injectNativeExcelPivot(base, {
    dataSheetName: 'Data', pivotSheetName: 'Pivot', dataColumns: columns, dataRows: rows,
    rowFields: recipe.rowFields, columnFields: recipe.columnFields, pageFields: recipe.filterFields,
    valueField: recipe.valueField, aggregation: recipe.aggregation, pivotTitle: request.title,
    tableName: 'LightBI_Data', startRow: 4,
  });
  request.onProgress?.('finalizing');
  return { buffer, recipe, exportedRowCount: rows.length };
}

function safeStem(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 90) || 'LightBI-Pivot';
}

type SaveFileHandle = { name: string; createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> };
type SavePickerWindow = Window & { showSaveFilePicker?: (options: Record<string, unknown>) => Promise<SaveFileHandle> };

export async function saveExcelPivotWorkbook(request: ExcelPivotExportRequestV1): Promise<ExcelPivotSaveResultV1> {
  const createdAt = request.createdAt ?? new Date().toISOString();
  const generated = createExcelPivotWorkbook({ ...request, createdAt });
  const date = createdAt.slice(0, 10);
  const selected = request.mode === 'current_selection' ? '_Selected' : '';
  const defaultName = `LightBI_${safeStem(request.title)}${selected}_${date}.xlsx`;
  const blob = new Blob([generated.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: defaultName, types: [{ description: 'Excel workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }] });
      const writable = await handle.createWritable(); await writable.write(blob); await writable.close();
      return { fileName: handle.name, locationLabel: handle.name, usedSaveAs: true, recipe: generated.recipe, exportedRowCount: generated.exportedRowCount };
    } catch (cause) {
      if (!(cause instanceof DOMException) || cause.name !== 'AbortError') throw cause;
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = defaultName; anchor.click(); URL.revokeObjectURL(url);
  return { fileName: defaultName, locationLabel: `Downloads/${defaultName}`, usedSaveAs: false, recipe: generated.recipe, exportedRowCount: generated.exportedRowCount };
}
