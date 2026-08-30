import * as XLSX from 'xlsx';
import type { CleanDataHandoffResultV1 } from './clean-data-handoff';
import type { DecisionVisualizationPlanV1 } from './decision-visualization-plan';

export const ANALYSIS_WORKBOOK_VERSION = 'lightbi.analysis-workbook.v1' as const;
const EXCEL_MAX_DATA_ROWS = 1_048_575;

export type AnalysisWorkbookScopeV1 = {
  period: string;
  metricId: string;
} | null;

export type AnalysisWorkbookSourceV1 = {
  sourceName: string;
  role: string;
  period: string;
  sourceRowCount: number;
  rows: Record<string, unknown>[];
};

export type AnalysisWorkbookTableV1 = {
  id: string;
  title: string;
  kind: 'summary' | 'evidence';
  columns: string[];
  rows: Record<string, unknown>[];
  governed: boolean;
  sourceRefs: string[];
};

export type AnalysisWorkbookPlanV1 = {
  schemaVersion: typeof ANALYSIS_WORKBOOK_VERSION;
  workbookId: string;
  createdAt: string;
  title: string;
  perspectiveId: string;
  selectedScope: AnalysisWorkbookScopeV1;
  sourceCount: number;
  combinationPolicy: 'single_source' | 'governed_metric_results_only';
  sources: Array<Omit<AnalysisWorkbookSourceV1, 'rows'>>;
  tables: AnalysisWorkbookTableV1[];
  findings: string[];
  recommendedActions: string[];
  caveats: string[];
  notes: string[];
  decisionVisualizationPlan: DecisionVisualizationPlanV1 | null;
};

export type ExcelAnalysisWorkbookOptionsV1 = {
  cleanData?: CleanDataHandoffResultV1 | null;
};

export type SingleSourceDeepAnalysisWorkbookInputV1 = {
  title: string;
  perspectiveId: string;
  resultId: string;
  chartRows?: Record<string, unknown>[];
  kpis?: Array<{ id: string; value: number }>;
  evidence?: {
    rows: Record<string, unknown>[];
    sourceResultRowCount: number;
    label: string;
    truncated: boolean;
  } | null;
  findings?: string[];
  recommendedActions?: string[];
  caveats?: string[];
  createdAt?: string;
};

export type CreateAnalysisWorkbookPlanInput = {
  title: string;
  perspectiveId: string;
  sourceCount: number;
  summaryRows: Record<string, unknown>[];
  selectedScope?: AnalysisWorkbookScopeV1;
  evidenceSources?: AnalysisWorkbookSourceV1[];
  findings?: string[];
  recommendedActions?: string[];
  caveats?: string[];
  notes?: string[];
  decisionVisualizationPlan?: DecisionVisualizationPlanV1 | null;
  createdAt?: string;
};

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `analysis-workbook:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function columnsForRows(rows: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const row of rows) {
    for (const column of Object.keys(row)) {
      if (seen.has(column)) continue;
      seen.add(column);
      columns.push(column);
    }
  }
  return columns;
}

function sourceRef(source: Omit<AnalysisWorkbookSourceV1, 'rows'>): string {
  return `${source.period}|${source.role}|${source.sourceName}`;
}

function assertExcelRowLimit(title: string, rows: number): void {
  if (rows > EXCEL_MAX_DATA_ROWS) throw new Error(`ANALYSIS_WORKBOOK_ROW_LIMIT:${title}:${rows}`);
}

function cloneRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => ({ ...row }));
}

export function createSingleSourceDeepAnalysisWorkbookPlan(input: SingleSourceDeepAnalysisWorkbookInputV1): AnalysisWorkbookPlanV1 {
  const kpiSummary = input.kpis?.length
    ? [Object.fromEntries(input.kpis.map(kpi => [kpi.id, kpi.value]))]
    : [];
  const summaryRows = kpiSummary.length ? kpiSummary : cloneRows(input.chartRows ?? []);
  if (summaryRows.length === 0) throw new Error('ANALYSIS_WORKBOOK_SUMMARY_REQUIRED');
  const evidenceSources = input.evidence?.rows.length
    ? [{
        sourceName: `Result ${input.resultId}`,
        role: 'selected_result_evidence',
        period: input.evidence.label || 'selected_scope',
        sourceRowCount: input.evidence.sourceResultRowCount,
        rows: input.evidence.rows,
      }]
    : [];
  return createAnalysisWorkbookPlan({
    title: input.title,
    perspectiveId: input.perspectiveId,
    sourceCount: 1,
    summaryRows,
    evidenceSources,
    findings: input.findings,
    recommendedActions: input.recommendedActions,
    caveats: input.caveats,
    notes: [
      'Single-source summary uses already-computed LightBI BA KPIs when available; otherwise it preserves the governed chart-result rows.',
      ...(input.evidence ? [
        `Selected drill evidence: ${input.evidence.rows.length} exported rows from ${input.evidence.sourceResultRowCount} result rows.`,
        ...(input.evidence.truncated ? ['Selected drill evidence was truncated by the runtime row limit.'] : []),
      ] : ['No raw/detail evidence sheet is emitted unless a source-bound selected drill scope is present.']),
    ],
    createdAt: input.createdAt,
  });
}

export function createAnalysisWorkbookPlan(input: CreateAnalysisWorkbookPlanInput): AnalysisWorkbookPlanV1 {
  assertExcelRowLimit('Analysis Summary', input.summaryRows.length);
  const evidenceSources = input.evidenceSources ?? [];
  const sources = evidenceSources.map(source => ({
    sourceName: source.sourceName,
    role: source.role,
    period: source.period,
    sourceRowCount: source.sourceRowCount,
  }));
  const tables: AnalysisWorkbookTableV1[] = [{
    id: 'analysis-summary',
    title: 'Analysis Summary',
    kind: 'summary',
    columns: columnsForRows(input.summaryRows),
    rows: cloneRows(input.summaryRows),
    governed: true,
    sourceRefs: sources.map(sourceRef),
  }];

  evidenceSources.forEach((source, index) => {
    const title = `Evidence ${source.role || index + 1} ${source.period}`.trim();
    assertExcelRowLimit(title, source.rows.length);
    tables.push({
      id: `evidence-${index + 1}`,
      title,
      kind: 'evidence',
      columns: columnsForRows(source.rows),
      rows: cloneRows(source.rows),
      governed: false,
      sourceRefs: [sourceRef(source)],
    });
  });

  const decisionVisualizationPlan = input.decisionVisualizationPlan ?? null;
  if (decisionVisualizationPlan && decisionVisualizationPlan.perspectiveId !== input.perspectiveId) {
    throw new Error('ANALYSIS_WORKBOOK_DECISION_PLAN_PERSPECTIVE_MISMATCH');
  }
  if (decisionVisualizationPlan && decisionVisualizationPlan.sourceCount !== input.sourceCount) {
    throw new Error('ANALYSIS_WORKBOOK_DECISION_PLAN_SOURCE_COUNT_MISMATCH');
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const selectedScope = input.selectedScope ?? null;
  const seed = JSON.stringify({
    title: input.title,
    perspectiveId: input.perspectiveId,
    sourceCount: input.sourceCount,
    selectedScope,
    sources,
    summaryRows: input.summaryRows,
  });

  return {
    schemaVersion: ANALYSIS_WORKBOOK_VERSION,
    workbookId: stableId(seed),
    createdAt,
    title: input.title,
    perspectiveId: input.perspectiveId,
    selectedScope,
    sourceCount: input.sourceCount,
    combinationPolicy: input.sourceCount > 1 ? 'governed_metric_results_only' : 'single_source',
    sources,
    tables,
    findings: [...(input.findings ?? [])],
    recommendedActions: [...(input.recommendedActions ?? [])],
    caveats: [...(input.caveats ?? [])],
    notes: [...(input.notes ?? [])],
    decisionVisualizationPlan,
  };
}

function safeSheetName(raw: string, used: Set<string>): string {
  const base = raw.replace(/[\\/*?:\[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    const tail = ` ${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 31 - tail.length))}${tail}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function worksheetForRows(rows: Record<string, unknown>[], columns: string[]): XLSX.WorkSheet {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns.length ? columns : undefined });
  if (worksheet['!ref']) worksheet['!autofilter'] = { ref: worksheet['!ref'] };
  worksheet['!cols'] = columns.map(column => ({ wch: Math.min(36, Math.max(12, column.length + 2)) }));
  return worksheet;
}

function excelColumn(index: number): string {
  let value = index + 1;
  let output = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }
  return output;
}

function pivotViewWorksheet(summary: AnalysisWorkbookTableV1, summarySheetName: string): XLSX.WorkSheet {
  const dimensionColumn = summary.columns.includes('reporting_period') ? 'reporting_period' : summary.columns[0];
  const metricColumns = summary.columns.filter(column => column !== dimensionColumn);
  const dimensionIndex = dimensionColumn ? summary.columns.indexOf(dimensionColumn) : -1;
  const headings = summary.rows.map((row, index) => dimensionColumn ? String(row[dimensionColumn] ?? `Row ${index + 1}`) : `Row ${index + 1}`);
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Governed metric', ...headings],
    ...metricColumns.map(metric => [metric, ...summary.rows.map(() => null)]),
  ]);
  const escapedSummaryName = summarySheetName.replaceAll("'", "''");
  metricColumns.forEach((metric, metricIndex) => {
    const sourceColumnIndex = summary.columns.indexOf(metric);
    summary.rows.forEach((_, rowIndex) => {
      const targetCell = `${excelColumn(rowIndex + 1)}${metricIndex + 2}`;
      const sourceCell = `${excelColumn(sourceColumnIndex)}${rowIndex + 2}`;
      worksheet[targetCell] = { t: 'n', f: `'${escapedSummaryName}'!${sourceCell}` };
    });
  });
  worksheet['!cols'] = [{ wch: 28 }, ...headings.map(heading => ({ wch: Math.min(22, Math.max(12, heading.length + 2)) }))];
  worksheet['!autofilter'] = { ref: `A1:${excelColumn(Math.max(1, headings.length))}${Math.max(1, metricColumns.length + 1)}` };
  if (dimensionIndex < 0 || metricColumns.length === 0 || summary.rows.length === 0) {
    XLSX.utils.sheet_add_aoa(worksheet, [['No pivot-style view is available for this summary shape.']], { origin: 'A3' });
  }
  return worksheet;
}

function appendCleanDataSheets(workbook: XLSX.WorkBook, result: CleanDataHandoffResultV1, usedNames: Set<string>): void {
  XLSX.utils.book_append_sheet(workbook, worksheetForRows(result.cleanRows, result.artifact.lineage.map(item => item.outputColumn)), safeSheetName('Clean Data', usedNames));
  const dictionaryRows = result.artifact.lineage.map(item => ({
    'Raw column': item.sourceColumn,
    'Clean column': item.outputColumn,
    'Physical type': item.physicalType,
    'Canonical concept': item.semanticConcept ?? '',
    'Semantic state': item.semanticState,
    Nullable: item.nullable ? 'Yes' : 'No',
    Transformations: item.transformations.join(', '),
    'Quality issues': item.qualityIssues.join(', '),
  }));
  XLSX.utils.book_append_sheet(workbook, worksheetForRows(dictionaryRows, ['Raw column', 'Clean column', 'Physical type', 'Canonical concept', 'Semantic state', 'Nullable', 'Transformations', 'Quality issues']), safeSheetName('Data Dictionary', usedNames));
  XLSX.utils.book_append_sheet(workbook, worksheetForRows(result.artifact.auditTrail, ['operation', 'column', 'affectedValues']), safeSheetName('Transformation Audit', usedNames));
  const manifest = XLSX.utils.aoa_to_sheet([
    ['LightBI Clean Data Handoff', result.artifact.schemaVersion],
    ['Artifact ID', result.artifact.artifactId],
    ['Source', result.artifact.source.sourceName],
    ['Source fingerprint', result.artifact.source.sourceFingerprint ?? 'Unavailable'],
    ['Source preserved', 'Yes'],
    ['Rows', result.artifact.output.rowCount],
    ['Columns', result.artifact.output.columnCount],
    ['Grain', result.artifact.grain.structuralForm],
    ['Identity basis', result.artifact.grain.identityBasis],
    ['Temporal mode', result.artifact.grain.temporalMode],
    ['Candidate keys', result.artifact.candidateKeys.join(', ')],
    ['Quality caveats', result.artifact.qualityCaveats.join(', ')],
  ]);
  manifest['!cols'] = [{ wch: 28 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(workbook, manifest, safeSheetName('Clean Handoff Manifest', usedNames));
}

export function createExcelAnalysisWorkbook(plan: AnalysisWorkbookPlanV1, options: ExcelAnalysisWorkbookOptionsV1 = {}): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  const overview = XLSX.utils.aoa_to_sheet([
    ['LightBI Excel Analysis Workbook', plan.schemaVersion],
    ['Workbook ID', plan.workbookId],
    ['Created at', plan.createdAt],
    ['Analysis', plan.title],
    ['Perspective', plan.perspectiveId],
    ['Source count', plan.sourceCount],
    ['Combination policy', plan.combinationPolicy],
    ['Selected period', plan.selectedScope?.period ?? 'All governed result periods'],
    ['Selected metric', plan.selectedScope?.metricId ?? 'All governed result metrics'],
    ['Raw multi-source join', plan.combinationPolicy === 'governed_metric_results_only' ? 'Prohibited' : 'Not applicable'],
    ['Evidence policy', 'Source-bound evidence remains in separate sheets'],
    ['Decision plan version', plan.decisionVisualizationPlan?.schemaVersion ?? 'Not attached'],
    ['Decision plan ID', plan.decisionVisualizationPlan?.planId ?? 'Not attached'],
    ['Clean canonical data attached', options.cleanData ? 'Yes' : 'No'],
  ]);
  overview['!cols'] = [{ wch: 28 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(workbook, overview, safeSheetName('Analysis Overview', usedNames));

  const summaryTable = plan.tables.find(table => table.kind === 'summary');
  if (summaryTable) {
    const summaryName = safeSheetName(summaryTable.title, usedNames);
    XLSX.utils.book_append_sheet(workbook, worksheetForRows(summaryTable.rows, summaryTable.columns), summaryName);
    XLSX.utils.book_append_sheet(workbook, pivotViewWorksheet(summaryTable, summaryName), safeSheetName('Pivot View', usedNames));
  }
  for (const table of plan.tables.filter(table => table.kind !== 'summary')) {
    const worksheet = worksheetForRows(table.rows, table.columns);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(table.title, usedNames));
  }

  const lineageRows = plan.sources.map(source => ({
    Period: source.period,
    Role: source.role,
    Source: source.sourceName,
    'Source rows': source.sourceRowCount,
    'Evidence sheet rule': 'Separate source-bound evidence; no blind raw-row join',
  }));
  XLSX.utils.book_append_sheet(workbook, worksheetForRows(lineageRows, ['Period', 'Role', 'Source', 'Source rows', 'Evidence sheet rule']), safeSheetName('Source Lineage', usedNames));

  const noteRows = [
    ...plan.findings.map(message => ({ Type: 'Finding', Message: message })),
    ...plan.recommendedActions.map(message => ({ Type: 'Recommended action', Message: message })),
    ...plan.caveats.map(message => ({ Type: 'Caveat', Message: message })),
    ...plan.notes.map(message => ({ Type: 'Note', Message: message })),
  ];
  XLSX.utils.book_append_sheet(workbook, worksheetForRows(noteRows, ['Type', 'Message']), safeSheetName('Decision Notes', usedNames));
  if (options.cleanData) appendCleanDataSheets(workbook, options.cleanData, usedNames);

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
}

export interface AnalysisWorkbookSaveResult {
  fileName: string;
  locationLabel: string;
  usedSaveAs: boolean;
}

type SaveFileHandle = { name: string; createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> };
type SavePickerWindow = Window & { showSaveFilePicker?: (options: Record<string, unknown>) => Promise<SaveFileHandle> };

export async function saveExcelAnalysisWorkbook(plan: AnalysisWorkbookPlanV1, options: ExcelAnalysisWorkbookOptionsV1 = {}): Promise<AnalysisWorkbookSaveResult> {
  const buffer = createExcelAnalysisWorkbook(plan, options);
  const stem = plan.title.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'LightBI-analysis';
  const defaultName = `${stem}-LightBI-analysis.xlsx`;
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: defaultName,
        types: [{ description: 'Excel workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { fileName: handle.name, locationLabel: handle.name, usedSaveAs: true };
    } catch (cause) {
      if (!(cause instanceof DOMException) || cause.name !== 'AbortError') throw cause;
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = defaultName;
  anchor.click();
  URL.revokeObjectURL(url);
  return { fileName: defaultName, locationLabel: `Downloads/${defaultName}`, usedSaveAs: false };
}
