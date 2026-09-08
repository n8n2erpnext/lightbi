import React, { useMemo } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';
import type { SingleSourceBAOverview, SingleSourceKpi } from '../../lib/single-source-ba-overview';
import type { DisplayPreferences } from '../../stores/display-preferences-store';
import { pickUiText, useUiLanguage, type UiLanguage } from '../../lib/ui-language';
import { buildSingleSourceAnalysisNarrativePlan } from '../../lib/analysis-narrative-plan';
import { AnalysisNarrativeBoard } from './AnalysisNarrativeBoard';

function overviewText(language: UiLanguage, value: string): string {
  return pickUiText(language, value);
}

function formatKpi(kpi: SingleSourceKpi, preferences: DisplayPreferences): string {
  if (kpi.kind === 'money') return new Intl.NumberFormat(preferences.locale, {
    style: preferences.currencyDisplay === 'none' ? 'decimal' : 'currency',
    currency: preferences.currencyCode,
    currencyDisplay: preferences.currencyDisplay === 'code' ? 'code' : 'symbol',
    maximumFractionDigits: 0,
  }).format(kpi.value);
  if (kpi.kind === 'percent') return new Intl.NumberFormat(preferences.locale, { style: 'percent', maximumFractionDigits: 1 }).format(kpi.value);
  return new Intl.NumberFormat(preferences.locale, { maximumFractionDigits: 2 }).format(kpi.value);
}

function formatMoney(value: number, preferences: DisplayPreferences): string {
  return formatKpi({ id: '', label: '', value, kind: 'money' }, preferences);
}

export const SingleSourceBAOverviewCard: React.FC<{
  overview: SingleSourceBAOverview;
  preferences: DisplayPreferences;
  selectedDataScope?: boolean;
}> = ({ overview, preferences, selectedDataScope = false }) => {
  const { language, t } = useUiLanguage();
  const positiveTrend = (overview.trendChange ?? 0) >= 0;
  const selectedMeasure = overview.bindings.selectedMeasure;
  const selectedDimensions = Object.entries(overview.bindings)
    .filter(([key]) => /^selectedDimension\d+$/.test(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, column]) => column);
  const narrativePlan = useMemo(() => buildSingleSourceAnalysisNarrativePlan(overview), [overview]);
  return <div className="mb-5 overflow-hidden rounded-[20px] border border-emerald-200 bg-emerald-50/50 shadow-sm" data-testid="single-source-ba-overview">
    <header className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-blue-50 px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700"><CheckCircle2 className="h-4 w-4" />{overviewText(language, overview.analysisLabel)}</div>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">{overview.isRepresentativeSample ? t(`Business analysis from a representative sample of ${overview.rowCount.toLocaleString(preferences.locale)} / ${overview.sourceRowCount.toLocaleString(preferences.locale)} rows`) : t(`Business analysis from ${overview.rowCount.toLocaleString(preferences.locale)} data rows`)}</h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-600">{selectedDataScope ? t('LightBI recalculated this existing BA analysis from the rows selected in step 2; it does not describe the full source.') : overview.isRepresentativeSample ? t('The segments and exceptions below are inferred from a representative sample; chart metrics are still calculated by the governed engine over the full source.') : t('LightBI summarized metrics, trends, contribution, and exceptions from the full file—not only the points visible in the chart.')}</p>
        </div>
        {overview.trendChange !== null && <div className={`flex min-w-[170px] items-center gap-3 rounded-xl border bg-white px-4 py-3 ${positiveTrend ? 'border-emerald-200' : 'border-red-200'}`}>
          {positiveTrend ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
          <div><div className="text-[10px] uppercase text-slate-400">{t('Final vs first period')}</div><div className={`text-lg font-bold ${positiveTrend ? 'text-emerald-700' : 'text-red-700'}`}>{positiveTrend ? '+' : ''}{(overview.trendChange * 100).toFixed(1)}%</div></div>
        </div>}
      </div>
    </header>

    <div className="space-y-5 p-5">
      {(selectedMeasure || selectedDimensions.length > 0) && <section data-testid="deep-ba-selected-scope" className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('Selected analysis scope')}</div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {selectedMeasure && <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-800">{t('Measure')}: {selectedMeasure}</span>}
          {selectedDimensions.map(column => <span key={column} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">{t('Dimension')}: {column}</span>)}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{t('The KPI, trend and ranked groups below are calculated for this selected measure and these dimensions. Other domain metrics are supporting context only.')}</p>
      </section>}

      {overview.investigation && <AnalysisNarrativeBoard overview={overview} plan={narrativePlan} />}

      {narrativePlan.supporting.showKpis && <section>
        <h4 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600"><BarChart3 className="h-4 w-4 text-blue-600" />{t('Key metrics')}</h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overview.kpis.map(kpi => <div key={kpi.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase text-slate-400">{overviewText(language, kpi.label)}</div>
            <div className="mt-1 break-words text-xl font-bold text-slate-950">{formatKpi(kpi, preferences)}</div>
          </div>)}
        </div>
      </section>}

      {narrativePlan.supporting.showLegacyFindings && overview.findings.length > 0 && <section className="grid gap-3 lg:grid-cols-3">
        {overview.findings.map((finding, index) => <div key={finding} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-amber-700"><Lightbulb className="h-4 w-4" />{t('Finding')} {index + 1}</div>
          <p className="mt-2 text-[13px] leading-5 text-amber-950">{overviewText(language, finding)}</p>
        </div>)}
      </section>}

      {narrativePlan.supporting.showDiagnostics && <section data-testid="deep-ba-decision-diagnostics">
        <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-600">{t('Decision diagnostics')}</h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {overview.concentration && <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase text-slate-400">{t('Largest group concentration')}</div>
            <div className="mt-1 text-lg font-bold text-slate-950">{overview.concentration.label}</div>
            <div className="mt-1 text-sm text-slate-600">{(overview.concentration.share * 100).toFixed(1)}%</div>
          </div>}
          {overview.trend.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase text-slate-400">{t('Observed time coverage')}</div>
            <div className="mt-1 text-lg font-bold text-slate-950">{overview.trend.length.toLocaleString(preferences.locale)} {t('periods')}</div>
            <div className="mt-1 text-xs text-slate-500">{overview.trend[0]?.period} → {overview.trend.at(-1)?.period}</div>
          </div>}
          {overview.outlierCount > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-[11px] font-semibold uppercase text-amber-700">{t('Rows above the IQR threshold')}</div>
            <div className="mt-1 text-lg font-bold text-amber-950">{overview.outlierCount.toLocaleString(preferences.locale)}</div>
            <div className="mt-1 text-xs text-amber-800">{t('Review these source rows before acting on the aggregate result.')}</div>
          </div>}
        </div>
      </section>}

      {narrativePlan.supporting.breakdownIds.length > 0 && <section>
        <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-600">{overviewText(language, overview.breakdownHeading)}</h4>
        <div className="grid gap-4 lg:grid-cols-2">
          {overview.breakdowns.filter(breakdown => narrativePlan.supporting.breakdownIds.includes(breakdown.id)).map(breakdown => <article key={breakdown.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3"><h5 className="text-[14px] font-semibold text-slate-900">{t('By')} {overviewText(language, breakdown.label).toLocaleLowerCase(preferences.locale)}</h5><span className="text-[10px] text-slate-400">{breakdown.physicalColumn}</span></div>
            <div className="mt-3 space-y-3">
              {breakdown.top.map((entry, index) => <div key={entry.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-[12px]"><span className="min-w-0 truncate font-medium text-slate-700">{index + 1}. {entry.label}</span><span className="shrink-0 text-slate-500">{breakdown.valueKind === 'money' ? formatMoney(entry.value, preferences) : formatKpi({ id: '', label: '', value: entry.value, kind: breakdown.valueKind === 'percent' ? 'percent' : 'number' }, preferences)} · {breakdown.valueKind === 'percent' ? `n=${entry.rowCount.toLocaleString(preferences.locale)}` : `${(entry.share * 100).toFixed(1)}%`}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(2, entry.share * 100)}%` }} /></div>
              </div>)}
            </div>
            {breakdown.bottom.length > 0 && <div data-testid={`deep-ba-low-groups-${breakdown.id}`} className="mt-4 border-t border-slate-100 pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('Lowest groups to inspect')}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {breakdown.bottom.slice(0, 2).map(entry => <div key={`bottom-${entry.label}`} className="rounded-md bg-slate-50 px-3 py-2 text-xs">
                  <div className="truncate font-medium text-slate-700">{entry.label}</div>
                  <div className="mt-0.5 text-slate-500">{breakdown.valueKind === 'money' ? formatMoney(entry.value, preferences) : formatKpi({ id: '', label: '', value: entry.value, kind: breakdown.valueKind === 'percent' ? 'percent' : 'number' }, preferences)} · {t('Rows')}: {entry.rowCount.toLocaleString(preferences.locale)}</div>
                </div>)}
              </div>
            </div>}
          </article>)}
        </div>
      </section>}

      {(narrativePlan.supporting.showLegacyActions || narrativePlan.supporting.showLimitations) && <section className="grid gap-4 lg:grid-cols-2">
        {narrativePlan.supporting.showLegacyActions && <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-emerald-700">{t('What should happen next?')}</h4>
          <ol className="mt-3 space-y-2 text-[13px] leading-5 text-slate-700">{overview.recommendedActions.map((item, index) => <li key={item}>{index + 1}. {overviewText(language, item)}</li>)}</ol>
        </div>}
        {narrativePlan.supporting.showLimitations && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-amber-700"><AlertTriangle className="h-4 w-4" />{t('Evidence limitations')}</h4>
          <ul className="mt-3 space-y-2 text-[12px] leading-5 text-amber-950">{overview.limitations.map(item => <li key={item}>• {overviewText(language, item)}</li>)}</ul>
        </div>}
      </section>}
    </div>
  </div>;
};
