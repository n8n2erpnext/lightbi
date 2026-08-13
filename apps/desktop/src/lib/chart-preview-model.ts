import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { RuntimePlanPreview } from './runtime-planner-preview';

export interface ChartPreviewModel {
  id: string;
  sourceResultId: string;
  status: "ready" | "empty" | "blocked" | "failed";
  chartType: "bar" | "line" | "scatter" | "table";
  title: string;
  xField?: string;
  yField?: string;
  seriesFields: string[];
  rows: Record<string, unknown>[];
  warnings: string[];
  source: "duckdb_preview_result";
}

export interface CreateChartPreviewInput {
  previewResult: DuckDBPreviewResult;
  runtimePlan: RuntimePlanPreview;
  analysisLabel: string;
}

function normalizeFieldName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const TABLE_CHART_FIELD_HINTS = [
  'route', 'tuyen', 'status', 'trang thai', 'branch', 'hub', 'kho',
  'region', 'location', 'province', 'category', 'type', 'control', 'kiem soat'
];

function createTableDistribution(
  columns: string[],
  rows: Record<string, unknown>[]
): { field: string; rows: Record<string, unknown>[] } | null {
  if (rows.length === 0) return null;

  const candidates = columns.flatMap((field, columnIndex) => {
    const values = rows
      .map(row => row[field])
      .filter(value => value !== null && value !== undefined && String(value).trim() !== '');
    if (values.length === 0) return [];

    const numericCount = values.filter(value => {
      if (typeof value === 'number') return Number.isFinite(value);
      const text = String(value).trim();
      return text !== '' && Number.isFinite(Number(text));
    }).length;
    if (numericCount / values.length >= 0.8) return [];

    const distinctCount = new Set(values.map(value => String(value))).size;
    const maxDistinct = Math.min(30, Math.max(2, Math.floor(rows.length * 0.8)));
    if (distinctCount < 2 || distinctCount > maxDistinct) return [];

    const normalized = normalizeFieldName(field);
    const hintIndex = TABLE_CHART_FIELD_HINTS.findIndex(hint => normalized.includes(hint));
    const hintScore = hintIndex >= 0 ? 200 - hintIndex * 5 : 0;
    const densityScore = Math.round((values.length / rows.length) * 40);
    const cardinalityScore = Math.max(0, 30 - distinctCount);
    return [{ field, score: hintScore + densityScore + cardinalityScore - columnIndex }];
  });

  const selected = candidates.sort((a, b) => b.score - a.score)[0];
  if (!selected) return null;

  const counts = new Map<string, number>();
  for (const row of rows) {
    const rawValue = row[selected.field];
    const label = rawValue === null || rawValue === undefined || String(rawValue).trim() === ''
      ? '(Empty)'
      : String(rawValue);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return {
    field: selected.field,
    rows: [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([label, count]) => ({ [selected.field]: label, row_count: count }))
  };
}

export function createChartPreviewModel(input: CreateChartPreviewInput): ChartPreviewModel {
  const { previewResult, runtimePlan, analysisLabel } = input;
  
  const model: ChartPreviewModel = {
    id: `chart_${previewResult.id}`,
    sourceResultId: previewResult.id,
    status: "ready",
    chartType: "table",
    title: analysisLabel,
    seriesFields: [],
    rows: [...previewResult.rows],
    warnings: [...previewResult.warnings],
    source: "duckdb_preview_result"
  };

  // 1. Blocked
  if (previewResult.status === "blocked") {
    model.status = "blocked";
    model.rows = [];
    model.warnings = [...previewResult.blockedReasons];
    return model;
  }

  // 2. Failed
  if (previewResult.status === "failed") {
    model.status = "failed";
    model.warnings.push(previewResult.errorMessage || "Unknown error occurred during preview execution.");
    return model;
  }

  // 3. Empty
  if (previewResult.rows.length === 0) {
    model.status = "empty";
    model.warnings.push("No preview rows available.");
    // We still set chart type so UI knows what was expected
  }

  // 4. Shape mapping
  switch (runtimePlan.expectedOutput.shape) {
    case "bar_chart": model.chartType = "bar"; break;
    case "line_chart": model.chartType = "line"; break;
    case "scatter_plot": model.chartType = "scatter"; break;
    case "table": model.chartType = "table"; break;
    default: model.chartType = "table"; break;
  }

  if (runtimePlan.expectedOutput.shape === "table") {
    const distribution = createTableDistribution(previewResult.columns, previewResult.rows);
    if (distribution) {
      model.chartType = "bar";
      model.title = `Preview distribution by ${distribution.field}`;
      model.xField = distribution.field;
      model.yField = "row_count";
      model.seriesFields = ["row_count"];
      model.rows = distribution.rows;
      return model;
    }
  }

  // 5. xField
  if (runtimePlan.expectedOutput.dimensions.length > 0) {
    model.xField = runtimePlan.expectedOutput.dimensions[0];
  }

  // 6 & 7. yField and seriesFields
  const candidateYFields = previewResult.columns.filter(c => c !== model.xField);
  
  // Try to find a count/numeric field or a measure-derived field
  const yField = candidateYFields.find(c => c.endsWith('_count') || c.endsWith('_sum') || c.includes('qty'))
                 || candidateYFields.find(c => c.endsWith('_rate') || c.includes('rate'))
                 || candidateYFields[0];
                 
  if (yField) {
    model.yField = yField;
  }
  
  model.seriesFields = candidateYFields;

  return model;
}
