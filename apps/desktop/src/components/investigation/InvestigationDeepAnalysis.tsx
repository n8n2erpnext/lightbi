import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ClipboardCheck, Download, FileImage, FileSpreadsheet, FileText, LayoutDashboard, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
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
import { saveAnalysisReportPdf, saveAnalysisReportPngPages } from '../../lib/analysis-report-export';
import type { FocusSubjectComparison } from '../../lib/focus-subject-analysis';
import { FocusSubjectDeepAnalysisPanel } from './FocusSubjectDeepAnalysisPanel';
import { BAAnalysisAuthorityBanner } from './BAAnalysisAuthorityBanner';
import type { BAAnalysisAuthorityContextV1 } from '../../lib/understanding-core/ba-analysis-authority-context';
import { buildSelectedSubjectInvestigationPlan } from '../../lib/selected-subject-investigation';
import { SelectedSubjectInvestigationBoard } from './SelectedSubjectInvestigationBoard';
import type { AnalysisPresentationMode } from '../../lib/analysis-presentation-mode';

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
  focusComparison?: FocusSubjectComparison | null;
  filteredFocusComparison?: FocusSubjectComparison | null;
  analysisAuthority?: BAAnalysisAuthorityContextV1 | null;
  onClose: () => void;
  onCreateDashboard?: () => void;
  canCreateDashboard?: boolean;
  presentationMode?: AnalysisPresentationMode;
  onPresentationModeChange?: (mode: AnalysisPresentationMode) => void;
  preferences: DisplayPreferences;
}

export const InvestigationDeepAnalysis: React.FC<InvestigationDeepAnalysisProps> = ({ action, brief, businessFusionOverview, singleSourceBAOverview, chartModel, decisionVisualizationPlan = null, canonicalSourceBoundary = null, sourceName, filteredScope, focusComparison = null, filteredFocusComparison = null, analysisAuthority = null, onClose, onCreateDashboard, canCreateDashboard = false, presentationMode = 'primary', onPresentationModeChange, preferences }) => {
  const { t, localize } = useUiLanguage();
  const exportRef = useRef<HTMLDivElement>(null);
  const sidePanel = presentationMode === 'side_panel';
  const [exportState, setExportState] = useState<'idle' | 'image' | 'pdf' | 'excel'>('idle');
  const [exportError, setExportError] = useState('');
  const [pivotMenuOpen, setPivotMenuOpen] = useState(false);
  const [pivotProgress, setPivotProgress] = useState<ExcelPivotExportProgressV1 | null>(null);
  const fileStem = (localize(action.opportunityName) || 'LightBI-BA').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
  const selectedSourceName = sourceName || canonicalSourceBoundary?.datasetId || action.opportunityName;
  const selectedSubjectInvestigationPlan = useMemo(() => {
    if (!filteredScope || !singleSourceBAOverview) return null;
    return buildSelectedSubjectInvestigationPlan({
      dimensionField: filteredScope.point.dimensionField,
      label: filteredScope.point.label,
      metricId: action.measures[0] ?? null,
      focusLabel: filteredFocusComparison?.subject.displayLabel ?? null,
      filters: filteredScope.filters.map(filter => `${filter.column}:${filter.operator}:${filter.value}`),
    }, [{
      sourceKey: canonicalSourceBoundary?.sourceId || `selected:${selectedSourceName}`,
      sourceName: selectedSourceName,
      role: null,
      selectedRowCount: filteredScope.selectedRowCount,
      matchedRowCount: filteredScope.matchedRowCount,
      referenceRowCount: filteredScope.sourceResultRowCount,
      referenceScope: 'chart_group_rows',
      isTruncated: filteredScope.isTruncated,
      overview: singleSourceBAOverview,
    }]);
  }, [action.measures, canonicalSourceBoundary?.sourceId, filteredFocusComparison?.subject.displayLabel, filteredScope, selectedSourceName, singleSourceBAOverview]);

  const exportImage = async () => {
    setExportState('image'); setExportError('');
    try {
      if (!exportRef.current) throw new Error(t('The analysis is not ready to export.'));
      await saveAnalysisReportPngPages(exportRef.current, fileStem);
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : t('Could not export the image.')); }
    finally { setExportState('idle'); }
  };

  const exportPdf = async () => {
    setExportState('pdf'); setExportError('');
    try {
      if (!exportRef.current) throw new Error(t('The analysis is not ready to export.'));
      await saveAnalysisReportPdf(exportRef.current, fileStem);
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
  <div data-testid="deep-analysis-shell" data-presentation-mode={presentationMode} className={sidePanel ? "fixed inset-0 z-40 flex justify-end bg-black/15 backdrop-blur-[1px] xl:relative xl:inset-auto xl:z-auto xl:h-full xl:w-[clamp(420px,36vw,680px)] xl:shrink-0 xl:bg-transparent xl:backdrop-blur-none" : "fixed inset-0 z-40 flex justify-end bg-black/15 backdrop-blur-[1px]"} onClick={onClose}>
    <aside data-testid="deep-analysis-surface" data-docked={sidePanel ? "true" : "false"} data-layout={filteredScope ? 'focused-investigation' : 'management-document'} className={sidePanel ? "h-full w-full max-w-[1120px] overflow-y-auto border-l border-[var(--lb-divider)] bg-white xl:max-w-none" : "h-full w-full max-w-[1120px] overflow-y-auto border-l border-[var(--lb-divider)] bg-white"} onClick={event => event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--lb-divider)] bg-white/95 px-5 py-4 backdrop-blur"><div className="flex items-start gap-3"><button data-testid="deep-analysis-back" onClick={onClose} className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/60 transition-colors hover:bg-black/[0.035] hover:text-black" title={t('Back to chart')}><ArrowLeft className="h-4 w-4" />{t('Back')}</button><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-600"><ClipboardCheck className="h-3.5 w-3.5" />{filteredScope ? t('Selected-subject investigation') : focusComparison ? 'Deep BA analysis · Focus' : t('Deep BA analysis')}</div><h2 className="mt-1 text-xl font-semibold text-[#202123]">{focusComparison && !filteredScope ? `${focusComparison.subject.displayLabel} · ${localize(action.opportunityName)}` : localize(action.opportunityName)}</h2><p className="mt-1 text-xs leading-5 text-black/50">{filteredScope ? t('This investigation is bounded to the selected evidence scope; the governed summary remains unchanged.') : focusComparison ? `Every Deep BA readout remains anchored to ${focusComparison.subject.displayLabel}; the full population is comparison evidence only.` : t('Explanation, governed evidence, caveats, drivers, and recommended actions for the decision angle currently shown in the chart.')}</p></div></div><div className="flex shrink-0 items-center gap-2">{onPresentationModeChange && <button data-testid="deep-analysis-presentation-toggle" type="button" onClick={() => onPresentationModeChange(sidePanel ? 'primary' : 'side_panel')} className="hidden items-center gap-1.5 border border-black/10 bg-white px-2.5 py-2 text-xs font-semibold text-black/60 transition-colors hover:bg-black/[0.035] hover:text-black xl:inline-flex" title={t(sidePanel ? 'Return analysis to full view' : 'Move analysis to side panel')}>{sidePanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}<span>{t(sidePanel ? 'Full view' : 'Side panel')}</span></button>}<button onClick={onClose} className="rounded-full border border-black/10 bg-white p-2 text-black/50 transition-colors hover:bg-black/[0.035] hover:text-black" title={t('Close analysis panel')}><X className="h-4 w-4" /></button></div></div>
      <div data-testid="deep-analysis-export-tools" className="border-b border-[var(--lb-divider)] bg-white px-5 py-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto inline-flex items-center gap-2 text-xs text-black/45"><Download className="h-3.5 w-3.5" />{t(filteredScope ? 'Export this selected-subject investigation' : 'Export this complete perspective analysis')}</span>
          <div className="relative">
            <button data-testid="deep-analysis-export-excel" type="button" onClick={() => setPivotMenuOpen(open => !open)} disabled={exportState !== 'idle' || !canExportExcel} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"><FileSpreadsheet className="h-4 w-4" />{exportState === 'excel' && pivotProgress ? pivotProgressLabel[pivotProgress] : t('Export to Excel Pivot')}<ChevronDown className="h-3.5 w-3.5" /></button>
            {pivotMenuOpen && exportState === 'idle' && <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-xl border border-black/10 bg-white p-1.5 text-left shadow-xl">
              <button data-testid="deep-analysis-export-pivot-full" type="button" onClick={() => void exportExcelPivot('full')} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-emerald-50"><span className="block text-xs font-semibold text-slate-900">{t('Full cleaned data + Pivot')}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{t('All cleaned canonical rows, Pivot preset to this perspective')}</span></button>
              <button data-testid="deep-analysis-export-pivot-selection" type="button" onClick={() => void exportExcelPivot('current_selection')} disabled={!canExportSelection} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"><span className="block text-xs font-semibold text-slate-900">{t('Current selection + Pivot')}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{canExportSelection ? t('Only the rows currently selected in drill-through') : t('Select chart rows first to enable this scope')}</span></button>
            </div>}
          </div>
          <button data-testid="deep-analysis-export-image" type="button" onClick={() => void exportImage()} disabled={exportState !== 'idle'} className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/65 hover:bg-black/[0.035] disabled:opacity-50"><FileImage className="h-4 w-4" />{exportState === 'image' ? t('Exporting…') : t('Export image')}</button>
          <button data-testid="deep-analysis-export-pdf" type="button" onClick={() => void exportPdf()} disabled={exportState !== 'idle'} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"><FileText className="h-4 w-4" />{exportState === 'pdf' ? t('Exporting…') : t('Export PDF')}</button>
        </div>
        {exportError && <p role="alert" className="mt-2 text-xs text-red-600">{exportError}</p>}
      </div>
      <div ref={exportRef} data-testid="deep-analysis-export-surface" data-report-plan="lightbi.analysis-report-plan.v1" data-layout={filteredScope ? 'focused-investigation' : 'management-document'} className="px-5 py-4 md:px-6">
        {analysisAuthority && <section data-report-section="true" data-report-role="executive_summary" data-report-keep-together="true" data-report-id="analysis-authority"><BAAnalysisAuthorityBanner context={analysisAuthority} scopeLabel={filteredScope ? 'Selected-subject investigation · selected rows' : focusComparison ? 'Focus · full source' : 'Deep BA'} /></section>}
        {filteredScope ? <>
          {selectedSubjectInvestigationPlan ? <div data-testid="filtered-deep-analysis-scope" className="mb-5">
            <SelectedSubjectInvestigationBoard
              plan={selectedSubjectInvestigationPlan}
              sourceOverviews={[{ sourceKey: selectedSubjectInvestigationPlan.sources[0].sourceKey, overview: singleSourceBAOverview! }]}
              preferences={preferences}
            />
          </div> : <section data-testid="filtered-deep-analysis-scope" data-report-section="true" data-report-role="answer_overview" data-report-keep-together="true" className="mb-5 border-y border-slate-200 bg-white px-5 py-5 text-sm text-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{t('Selected-subject investigation')}</p>
            <p className="mt-1 font-semibold">{filteredScope.point.dimensionField} = {filteredScope.point.label}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">{formatValue(filteredScope.selectedRowCount, 'number', preferences)} / {formatValue(filteredScope.matchedRowCount, 'number', preferences)} {t('filtered rows selected')}. {t('No evidence-backed selected-scope answer is available yet.')}</p>
            {filteredScope.filters.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{filteredScope.filters.map(filter => <span key={filter.id} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">{filter.column} {filter.operator === 'contains' ? t('contains') : filter.operator === 'not_equals' ? '≠' : '='} {filter.value}</span>)}</div>}
            {filteredScope.isTruncated && <p className="mt-3 text-xs leading-5 text-amber-800">{t('This drill-through reached its row limit. The investigation covers only the retrieved selected evidence, not every possible matching source row.')}</p>}
          </section>}
          {filteredFocusComparison && <details data-testid="selected-focus-comparison-details" data-report-section="true" data-report-role="evidence_appendix" data-report-splittable="true" data-report-break-before="true" data-report-export-expand="true" className="mb-5 border-y border-slate-200 bg-white px-5 py-4">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">{t('Selected Focus comparison details')}</summary>
            <div className="mt-4"><FocusSubjectDeepAnalysisPanel action={action} comparison={filteredFocusComparison} /></div>
          </details>}
        </> : focusComparison ? <>
          <section data-report-section="true" data-report-role="answer_overview" data-report-keep-together="true" data-report-id="focus-analysis"><FocusSubjectDeepAnalysisPanel action={action} comparison={focusComparison} /></section>
          {(brief || singleSourceBAOverview) && <details data-report-section="true" data-report-role="evidence_appendix" data-report-splittable="true" data-report-break-before="true" data-report-export-expand="true" className="mt-5 border-y border-[var(--lb-divider)] py-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">Population perspective evidence</summary>
            <p className="mt-2 text-xs leading-5 text-slate-400">This legacy perspective evidence is retained for auditability; it does not replace the active Focus context.</p>
            <div className="mt-4 space-y-4">
              {singleSourceBAOverview && <SingleSourceBAOverviewCard overview={singleSourceBAOverview} preferences={preferences} selectedDataScope={false} />}
              {brief && <BADecisionBriefPanel brief={brief} />}
            </div>
          </details>}
        </> : <>
          {businessFusionOverview && <><section data-report-section="true" data-report-role="answer_overview" data-report-keep-together="true" data-report-id="business-brain-brief"><BusinessBrainBriefPanel brief={createBusinessBrainBrief({ action, chartModel, overview: businessFusionOverview })} preferences={preferences} /></section><details data-testid="deep-ba-business-fusion-supporting" data-report-section="true" data-report-role="evidence_appendix" data-report-splittable="true" data-report-break-before="true" data-report-export-expand="true" className="mt-5 border-y border-[var(--lb-divider)] py-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">{t('Supporting evidence & checks')}</summary><div className="mt-4 space-y-4"><BusinessFusionAngleReadout action={action} chartModel={chartModel} overview={businessFusionOverview} preferences={preferences} /><BusinessFusionOverviewCard overview={businessFusionOverview} /></div></details></>}
          {!businessFusionOverview && singleSourceBAOverview && <SingleSourceBAOverviewCard overview={singleSourceBAOverview} preferences={preferences} selectedDataScope={false} />}
          {brief && singleSourceBAOverview ? <details data-testid="deep-ba-legacy-brief-details" data-report-section="true" data-report-role="evidence_appendix" data-report-splittable="true" data-report-break-before="true" data-report-export-expand="true" className="mt-5 border-y border-[var(--lb-divider)] py-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">{t('Supporting evidence & checks')}</summary><div className="mt-4"><BADecisionBriefPanel brief={brief} /></div></details> : brief ? <section data-report-section="true" data-report-role="answer_overview" data-report-keep-together="true" data-report-id="legacy-decision-brief"><BADecisionBriefPanel brief={brief} /></section> : !singleSourceBAOverview && !businessFusionOverview ? <div data-report-section="true" data-report-role="answer_overview" data-report-keep-together="true" data-report-id="analysis-not-ready" className="border-y border-[var(--lb-divider)] py-5 text-sm text-black/55">{t('Run the preview first, then LightBI can explain this decision angle in depth.')}</div> : null}
        </>}
      </div>
      {onCreateDashboard && <section data-testid="deep-analysis-dashboard-cta" className="mx-5 mb-5 border-t border-[var(--lb-divider)] py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/50"><LayoutDashboard className="h-4 w-4" />{t('Next step')}</div>
              <h3 className="mt-2 text-lg font-semibold text-[#202123]">{t('Create a BI dashboard for this perspective')}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">{t('LightBI will combine the primary answer, KPIs and supporting analyses into one governed dashboard.')}</p>
            </div>
            <button type="button" onClick={onCreateDashboard} disabled={!canCreateDashboard} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">
              <LayoutDashboard className="h-4 w-4" />{t('Create perspective dashboard')}
            </button>
          </div>
        </section>}
    </aside>
  </div>
  );
};
