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

  // 5. xField
  if (runtimePlan.expectedOutput.dimensions.length > 0) {
    model.xField = runtimePlan.expectedOutput.dimensions[0];
  }

  // 6 & 7. yField and seriesFields
  const candidateYFields = previewResult.columns.filter(c => c !== model.xField);
  
  // Try to find a count/numeric field or a measure-derived field
  const yField = candidateYFields.find(c => c.endsWith('_count') || c.endsWith('_sum') || c.includes('qty')) 
                 || candidateYFields[0];
                 
  if (yField) {
    model.yField = yField;
  }
  
  model.seriesFields = candidateYFields;

  return model;
}
