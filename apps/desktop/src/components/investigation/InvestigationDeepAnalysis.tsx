import React, { useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ClipboardCheck, Download, FileImage, FileSpreadsheet, FileText, LayoutDashboard, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';
import { BADecisionBriefPanel } from '../analysis/BADecisionBriefPanel';
import type { BADecisionBrief } from '../../lib/ba-decision-engine';
import { createBusinessBrainBrief } from '../../lib/business-brain-brief';
import { BusinessBrainBriefPanel } from '../analysis/BusinessBrainBriefPanel';
import type { BusinessFusionOverview } from '../../lib/business-fusion-overview';
import { BusinessFusionOverviewCard } from '../analysis/BusinessFusionOverviewCard';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';
import type { DisplayPreferences } from '../../stores/display-preferences-store';
import { BusinessFusionAngleReadout } from './InvestigationBAReadouts';
import { useUiLanguage } from '../../lib/ui-language';
import type { SingleSourceBAOverview } from '../../lib/single-source-ba-overview';
import { SingleSourceBAOverviewCard } from './SingleSourceBAOverviewCard';
import type { FilteredDeepAnalysisScope } from './InvestigationDrillThroughPanel';
import { formatValue } from '../../lib/display-formatter';
import { createCleanDataHandoffFromCanonicalBoundary } from '../../lib/clean-data-handoff';
import { saveExcelPivotWorkbook, type ExcelPivotExportModeV1, type ExcelPivotExportProgressV1 } from '../../lib/excel-pivot-export';
import type { CanonicalSourceBoundaryV1 } from '../../lib/understanding-core/canonical-source-boundary';
import type { DecisionVisualizationPlanV1 } from '../../lib/decision-visualization-plan';
import { saveBlobWithUserChoice, saveDataUrlWithUserChoice } from '../../lib/native-capabilities';

export interface InvestigationDeepAnalysisProps {
  action: AnalysisAction;
  brief: BADecisionBrief | null;
  businessFusionOverview?: BusinessFusionOverview;
  singleSourceBAOverview?: SingleSourceBAOverview | null;
  chartModel: ChartPreviewModel | null;
  decisionVisualizationPlan?: DecisionVisualizationPlanV1 | null;
  canonicalSourceBoundary?: CanonicalSourceBoundaryV1 | null;
  sourceName?: string;
  filteredScope?: FilteredDeepAnalysisScope | null;
  onClose: () => void;
  onCreateDashboard?: () => void;
  canCreateDashboard?: boolean;
  preferences: DisplayPreferences;
}

export const InvestigationDeepAnalysis: React.FC<InvestigationDeepAnalysisProps> = ({ action, brief, businessFusionOverview, singleSourceBAOverview, chartModel, decisionVisualizationPlan = null, canonicalSourceBoundary = null, sourceName, filteredScope, onClose, onCreateDashboard, canCreateDashboard = false, preferences }) => {
  const { t, localize } = useUiLanguage();
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportState, setExportState] = useState<'idle' | 'image' | 'pdf' | 'excel'>('idle');
  const [exportError, setExportError] = useState('');
  const [pivotMenuOpen, setPivotMenuOpen] = useState(false);
  const [pivotProgress, setPivotProgress] = useState<ExcelPivotExportProgressV1 | null>(null);
  const fileStem = (localize(action.opportunityName) || 'LightBI-BA').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);

  const renderAnalysisImage = async (): Promise<string> => {
    if (!exportRef.current) throw new Error(t('The analysis is not ready to export.'));
    return toPng(exportRef.current, { backgroundColor: '#fbfbfa', cacheBust: true, pixelRatio: 2 });
  };

  const exportImage = async () => {
    setExportState('image'); setExportError('');
    try {
      const dataUrl = await renderAnalysisImage();
      await saveDataUrlWithUserChoice(dataUrl, { suggestedName: `${fileStem}-BA.png`, description: 'PNG image', extensions: ['png'] });
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : t('Could not export the image.')); }
    finally { setExportState('idle'); }
  };

  const exportPdf = async () => {
    setExportState('pdf'); setExportError('');
    try {
      const dataUrl = await renderAnalysisImage();
      const image = new Image(); image.src = dataUrl; await image.decode();
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const margin = 8; const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
      const width = pageWidth - margin * 2; const height = image.height * width / image.width; const printable = pageHeight - margin * 2;
      for (let offset = 0, page = 0; offset < height; offset += printable, page += 1) {
        if (page > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', margin, margin - offset, width, height, undefined, 'FAST');
      }
      await saveBlobWithUserChoice(pdf.output('blob'), { suggestedName: `${fileStem}-BA.pdf`, description: 'PDF document', extensions: ['pdf'] });
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : t('Could not export the PDF.')); }
    finally { setExportState('idle'); }
  };

  const canExportExcel = Boolean(canonicalSourceBoundary);
  const canExportSelection = Boolean(canonicalSourceBoundary && filteredScope?.rows.length);
  const pivotProgressLabel: Record<ExcelPivotExportProgressV1, string> = {
    preparing_data: t('Preparing cleaned data'),
    creating_table: t('Creating Excel table'),
    creating_pivot: t('Creating PivotTable'),
    finalizing: t('Finalizing workbook'),
  };
  const exportExcelPivot = async (mode: ExcelPivotExportModeV1) => {
    if (!canonicalSourceBoundary || (mode === 'current_selection' && !filteredScope?.rows.length)) return;
    setPivotMenuOpen(false); setExportState('excel'); setExportError(''); setPivotProgress('preparing_data');
    try {
      const cleanData = await createCleanDataHandoffFromCanonicalBoundary(canonicalSourceBoundary, sourceName || canonicalSourceBoundary.datasetId);
      await saveExcelPivotWorkbook({
        mode,
        title: localize(action.opportunityName) || chartModel?.title || action.id,
        action,
        cleanData,
        decisionVisualizationPlan,
        selectedRows: mode === 'current_selection' ? filteredScope?.rows ?? [] : null,
        appliedFilters: mode === 'current_selection' ? (filteredScope?.filters.map(filter => ({
          column: filter.column,
          operator: filter.operator === 'contains' ? 'contains' : filter.operator === 'not_equals' ? '!=' : '=',
          value: filter.value,
        })) ?? []) : [],
        onProgress: setPivotProgress,
      });
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : t('Could not export the Excel Pivot workbook.')); }
    finally { setPivotProgress(null); setExportState('idle'); }
  };
  return (
  <div className="fixed inset-0 z-40 flex justify-end bg-black/15 backdrop-blur-[1px]" onClick={onClose}>
    <aside className="h-full w-full max-w-[1120px] overflow-y-auto border-l border-black/10 bg-[#fbfbfa] shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white/95 px-6 py-5 backdrop-blur"><div className="flex items-start gap-3"><button data-testid="deep-analysis-back" onClick={onClose} className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/60 shadow-sm transition-colors hover:bg-black/[0.035] hover:text-black" title={t('Back to chart')}><ArrowLeft className="h-4 w-4" />{t('Back')}</button><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-600"><ClipboardCheck className="h-3.5 w-3.5" />{filteredScope ? t('Deep BA analysis · Step 2') : t('Deep BA analysis')}</div><h2 className="mt-1 text-xl font-semibold text-[#202123]">{localize(action.opportunityName)}</h2><p className="mt-1 text-xs leading-5 text-black/50">{filteredScope ? t('The existing deep-analysis framework is now applied only to the rows selected from the chart drill-through.') : t('Explanation, governed evidence, caveats, drivers, and recommended actions for the decision angle currently shown in the chart.')}</p></div></div><button onClick={onClose} className="rounded-full border border-black/10 bg-white p-2 text-black/50 shadow-sm transition-colors hover:bg-black/[0.035] hover:text-black" title={t('Close analysis panel')}><X className="h-4 w-4" /></button></div>
      <div className="border-b border-black/5 bg-white px-5 py-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto inline-flex items-center gap-2 text-xs text-black/45"><Download className="h-3.5 w-3.5" />{t('Export this complete perspective analysis')}</span>
          <div className="relative">
            <button data-testid="deep-analysis-export-excel" type="button" onClick={() => setPivotMenuOpen(open => !open)} disabled={exportState !== 'idle' || !canExportExcel} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"><FileSpreadsheet className="h-4 w-4" />{exportState === 'excel' && pivotProgress ? pivotProgressLabel[pivotProgress] : t('Export to Excel Pivot')}<ChevronDown className="h-3.5 w-3.5" /></button>
            {pivotMenuOpen && exportState === 'idle' && <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-xl border border-black/10 bg-white p-1.5 text-left shadow-xl">
              <button data-testid="deep-analysis-export-pivot-full" type="button" onClick={() => void exportExcelPivot('full')} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-emerald-50"><span className="block text-xs font-semibold text-slate-900">{t('Full cleaned data + Pivot')}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{t('All cleaned canonical rows, Pivot preset to this perspective')}</span></button>
              <button data-testid="deep-analysis-export-pivot-selection" type="button" onClick={() => void exportExcelPivot('current_selection')} disabled={!canExportSelection} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"><span className="block text-xs font-semibold text-slate-900">{t('Current selection + Pivot')}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{canExportSelection ? t('Only the rows currently selected in drill-through') : t('Select chart rows first to enable this scope')}</span></button>
            </div>}
          </div>
          <button data-testid="deep-analysis-export-image" type="button" onClick={() => void exportImage()} disabled={exportState !== 'idle'} className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/65 shadow-sm hover:bg-black/[0.035] disabled:opacity-50"><FileImage className="h-4 w-4" />{exportState === 'image' ? t('Exporting…') : t('Export image')}</button>
          <button data-testid="deep-analysis-export-pdf" type="button" onClick={() => void exportPdf()} disabled={exportState !== 'idle'} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"><FileText className="h-4 w-4" />{exportState === 'pdf' ? t('Exporting…') : t('Export PDF')}</button>
        </div>
        {exportError && <p role="alert" className="mt-2 text-xs text-red-600">{exportError}</p>}
      </div>
      <div ref={exportRef} data-testid="deep-analysis-export-surface" className="p-5">
        {filteredScope && <section data-testid="filtered-deep-analysis-scope" className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{t('Step 2 · Selected-data scope')}</p><p className="mt-1 font-semibold">{filteredScope.point.dimensionField} = {filteredScope.point.label}</p></div><p className="rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow-sm">{formatValue(filteredScope.selectedRowCount, 'number', preferences)} / {formatValue(filteredScope.matchedRowCount, 'number', preferences)} {t('filtered rows selected')}</p></div>
          {filteredScope.filters.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{filteredScope.filters.map(filter => <span key={filter.id} className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs">{filter.column} {filter.operator === 'contains' ? t('contains') : filter.operator === 'not_equals' ? '≠' : '='} {filter.value}</span>)}</div>}
          <p className="mt-3 text-xs leading-5 text-violet-800">{t('All KPIs, breakdowns, findings and recommendations below are recalculated by the existing BA framework from these selected rows only.')}</p>
          {filteredScope.isTruncated && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('This drill-through reached its row limit. The analysis covers the selected rows retrieved within that limit, not every possible matching source row.')}</p>}
        </section>}
        {businessFusionOverview && <><BusinessBrainBriefPanel brief={createBusinessBrainBrief({ action, chartModel, overview: businessFusionOverview })} preferences={preferences} /><BusinessFusionAngleReadout action={action} chartModel={chartModel} overview={businessFusionOverview} preferences={preferences} /><div className="mb-5"><BusinessFusionOverviewCard overview={businessFusionOverview} /></div></>}
        {!businessFusionOverview && singleSourceBAOverview && <SingleSourceBAOverviewCard overview={singleSourceBAOverview} preferences={preferences} selectedDataScope={Boolean(filteredScope)} />}
        {brief ? <BADecisionBriefPanel brief={brief} /> : !filteredScope && <div className="rounded-[16px] border border-black/10 bg-white p-6 text-sm text-black/55 shadow-sm">{t('Run the preview first, then LightBI can explain this decision angle in depth.')}</div>}
      </div>
      {onCreateDashboard && <section data-testid="deep-analysis-dashboard-cta" className="mx-5 mb-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/50"><LayoutDashboard className="h-4 w-4" />{t('Next step')}</div>
              <h3 className="mt-2 text-lg font-semibold text-[#202123]">{t('Create a BI dashboard for this perspective')}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">{t('LightBI will combine the primary answer, KPIs and supporting analyses into one governed dashboard.')}</p>
            </div>
            <button type="button" onClick={onCreateDashboard} disabled={!canCreateDashboard} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">
              <LayoutDashboard className="h-4 w-4" />{t('Create perspective dashboard')}
            </button>
          </div>
        </section>}
    </aside>
  </div>
  );
};
