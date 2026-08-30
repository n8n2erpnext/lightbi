import * as XLSX from 'xlsx';

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

export function createExcelAnalysisWorkbook(plan: AnalysisWorkbookPlanV1): ArrayBuffer {
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
  ]);
  overview['!cols'] = [{ wch: 28 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(workbook, overview, safeSheetName('Analysis Overview', usedNames));

  for (const table of plan.tables) {
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

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
}

export interface AnalysisWorkbookSaveResult {
  fileName: string;
  locationLabel: string;
  usedSaveAs: boolean;
}

type SaveFileHandle = { name: string; createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> };
type SavePickerWindow = Window & { showSaveFilePicker?: (options: Record<string, unknown>) => Promise<SaveFileHandle> };

export async function saveExcelAnalysisWorkbook(plan: AnalysisWorkbookPlanV1): Promise<AnalysisWorkbookSaveResult> {
  const buffer = createExcelAnalysisWorkbook(plan);
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
