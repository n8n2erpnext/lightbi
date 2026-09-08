import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Download, FileDown, ShieldAlert, TrendingUp } from 'lucide-react';
import type { DomainComparisonBrief, DriverContribution, NarrativeSection } from '../../lib/ba-comparison-engine';
import { buildComparisonAnalysisNarrativePlan } from '../../lib/analysis-narrative-plan';
import { exportRowsAsCsv, exportRowsAsXlsx } from '../../lib/drill-through-export';
import { useUiLanguage } from '../../lib/ui-language';
import { useDisplayPreferences } from '../../stores/display-preferences-store';

interface BusinessComparisonBriefCardProps {
  brief: DomainComparisonBrief;
  onApplyPeriodLabels?: (labelsBySource: Record<string, string>) => void;
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function safeFilePart(value: string): string {
  return value.trim().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'evidence';
}

function columnsForRows(rows: Record<string, unknown>[]): string[] {
  return Array.from(new Set(rows.flatMap(row => Object.keys(row))));
}

function DriverList({ title, drivers, mode, locale, t }: { title: string; drivers: DriverContribution[]; mode: 'growth' | 'decline' | 'profit'; locale: string; t: (value: string) => string }) {
  const Icon = mode === 'decline' ? ArrowDownRight : ArrowUpRight;
  const accent = mode === 'decline' ? 'text-red-600' : mode === 'profit' ? 'text-violet-600' : 'text-emerald-600';
  return <section className="py-3">
    <div className="mb-2 flex items-center gap-2"><Icon className={`h-4 w-4 ${accent}`} /><h4 className="text-[12px] font-semibold uppercase tracking-wide text-black/55">{title}</h4></div>
    {drivers.length === 0 ? <p className="text-[12px] text-black/45">{t('No reliable drivers found.')}</p> : <div className="divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">
      {drivers.slice(0, 10).map((driver, index) => <div key={`${title}:${driver.key}`} className="flex items-start justify-between gap-3 py-2.5">
        <div className="min-w-0"><p className="truncate text-[13px] font-medium text-[#202123]">{index + 1}. {driver.key}</p><p className="text-[11px] text-black/45">{t('Revenue Δ')} {formatNumber(driver.revenueDelta, locale)} · {formatPercent(driver.revenueDeltaPercent)}</p></div>
        {driver.currentProfit !== undefined && <div className="shrink-0 text-right"><p className="text-[12px] font-semibold text-black/70">{formatNumber(driver.currentProfit, locale)}</p><p className="text-[10px] uppercase text-black/35">{t('profit')}</p></div>}
      </div>)}
    </div>}
  </section>;
}

function NarrativeSectionCard({ section, t }: { section: NarrativeSection; t: (value: string) => string }) {
  const accent = section.severity === 'positive' ? 'border-emerald-300' : section.severity === 'critical' ? 'border-red-300' : section.severity === 'warning' ? 'border-amber-300' : 'border-slate-200';
  return <section className={`border-l-2 py-3 pl-3 ${accent}`}>
    <p className="text-[13px] font-semibold text-[#202123]">{t(section.title)}</p><p className="mt-1 text-[12px] leading-5 text-black/65">{t(section.summary)}</p>
    {section.bullets.length > 0 && <ul className="mt-2 space-y-1 text-[12px] leading-5 text-black/60">{section.bullets.slice(0, 22).map(bullet => <li key={bullet}>- {t(bullet)}</li>)}</ul>}
  </section>;
}

export const BusinessComparisonBriefCard: React.FC<BusinessComparisonBriefCardProps> = ({ brief, onApplyPeriodLabels }) => {
  const { t } = useUiLanguage();
  const locale = useDisplayPreferences(state => state.preferences.locale);
  const initialLabels = useMemo(
    () => Object.fromEntries(brief.periodMapping.map(period => [period.periodId, period.label])),
    [brief.periodMapping]
  );
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>(initialLabels);
  useEffect(() => {
    setDraftLabels(initialLabels);
  }, [initialLabels]);
  const narrativePlan = useMemo(() => buildComparisonAnalysisNarrativePlan(brief), [brief]);
  const criticalReason = brief.reasonCodes.find(reason => reason.severity === 'critical');
  return (
    <section data-testid="comparison-management-document" data-layout="management-document" className="py-1">
      <section data-testid="comparison-management-section-01" data-section-number="01" className="grid gap-3 border-y border-[var(--lb-divider)] py-5 md:grid-cols-[44px_minmax(0,1fr)]">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">01</div>
        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><TrendingUp className="h-5 w-5 text-slate-500" /><h3 className="text-[15px] font-semibold text-slate-950">{t('Business comparison brief')}</h3><span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{t(brief.domainLabel)}</span></div>
              <p data-testid="comparison-narrative-primary" className="mt-2 max-w-4xl text-[14px] font-medium leading-6 text-slate-800">{t(narrativePlan.primaryAnswer)}</p>
              {brief.periods.length >= 2 && <p className="mt-1 text-[12px] text-slate-500">{brief.periods[0]} → {brief.periods[brief.periods.length - 1]}</p>}
              <p className="mt-1 text-[12px] text-slate-500">{t(brief.businessQuestion)}</p>
            </div>
            <div className="grid shrink-0 grid-cols-2 divide-x divide-[var(--lb-divider)] border-y border-[var(--lb-divider)] text-center">
              <div className="px-4 py-2"><div className="text-xl font-semibold text-slate-950">{brief.decisionReadinessScore}</div><div className="text-[10px] font-semibold uppercase text-slate-400">{t('ready')}</div></div>
              <div className="px-4 py-2"><div className="text-xl font-semibold text-slate-950">{brief.trustScore}</div><div className="text-[10px] font-semibold uppercase text-slate-400">{t('trust')}</div></div>
            </div>
          </div>
        </div>
      </section>

      {brief.metricDeltas.length > 0 && <section data-testid="comparison-management-section-02" data-section-number="02" className="grid gap-3 border-b border-[var(--lb-divider)] py-4 md:grid-cols-[44px_minmax(0,1fr)]">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">02</div><div><h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{t('Key metrics')}</h4><div className="mt-2 divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">{brief.metricDeltas.map(metric => <div key={metric.metricId} className="flex items-center justify-between gap-4 py-3"><div><p className="text-[12px] font-semibold uppercase text-slate-500">{t(metric.label)}</p><p className="mt-0.5 text-[11px] text-slate-400">{formatNumber(metric.previousValue, locale)} → {formatNumber(metric.currentValue, locale)}</p></div><div className={`text-right ${metric.delta > 0 ? 'text-emerald-700' : metric.delta < 0 ? 'text-red-700' : 'text-slate-700'}`}><p className="text-[16px] font-semibold">{formatNumber(metric.delta, locale)}</p><p className="text-[11px]">{formatPercent(metric.deltaPercent)}</p></div></div>)}</div></div>
      </section>}

      {narrativePlan.narrativeSections.length > 0 && <section data-testid="comparison-management-section-03" data-section-number="03" className="grid gap-3 border-b border-[var(--lb-divider)] py-4 md:grid-cols-[44px_minmax(0,1fr)]">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">03</div><div><h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{t('Analysis narrative')}</h4><div className="mt-2 divide-y divide-[var(--lb-divider)]">{narrativePlan.narrativeSections.map(section => <NarrativeSectionCard key={section.id} section={section} t={t} />)}</div></div>
      </section>}

      {narrativePlan.driverPanels.length > 0 && <section data-testid="comparison-management-section-04" data-section-number="04" className="grid gap-3 border-b border-[var(--lb-divider)] py-4 md:grid-cols-[44px_minmax(0,1fr)]">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">04</div><div data-testid="comparison-narrative-contributors"><h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{t('Main observed contributors')}</h4><div className="mt-2 divide-y divide-[var(--lb-divider)]">{narrativePlan.driverPanels.includes('growth') && <DriverList title={t('Largest observed increases')} drivers={brief.topGrowthDrivers} mode="growth" locale={locale} t={t} />}{narrativePlan.driverPanels.includes('decline') && <DriverList title={t('Largest observed decreases')} drivers={brief.topDeclineDrivers} mode="decline" locale={locale} t={t} />}{narrativePlan.driverPanels.includes('profit') && <DriverList title={t('Highest observed profit values')} drivers={brief.topProfitDrivers} mode="profit" locale={locale} t={t} />}</div></div>
      </section>}

      <section data-testid="comparison-management-section-05" data-section-number="05" className="grid gap-3 py-4 md:grid-cols-[44px_minmax(0,1fr)]">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">05</div>
        <div><h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{t('Supporting context & evidence')}</h4>
          <details data-testid="comparison-supporting-context" className="mt-2 border-y border-[var(--lb-divider)] py-3"><summary className="cursor-pointer text-[12px] font-semibold text-slate-700">{t('Supporting context & evidence')}</summary><div className="mt-3 grid gap-5 lg:grid-cols-2">
            <div><div className="mb-2 flex items-center gap-2">{brief.periodMappingNeedsReview ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}<h4 className="text-[12px] font-semibold uppercase tracking-wide text-black/55">{t('Period mapping')}</h4></div><div className="flex flex-wrap gap-2">{brief.periodMapping.map(period => <span key={period.periodId} className="rounded border border-black/10 bg-white px-2 py-1 text-[11px] text-black/60" title={period.reason}>{period.label} · {period.confidence}</span>)}</div>{brief.periodMappingNeedsReview && <p className="mt-2 text-[12px] leading-5 text-amber-800">{t('Review period labels if filenames do not clearly represent the reporting months.')}</p>}{onApplyPeriodLabels && <div className="mt-3 border-t border-[var(--lb-divider)] pt-3"><div className="grid gap-2 md:grid-cols-2">{brief.periodMapping.map(period => <label key={period.periodId} className="text-[11px] font-medium text-black/55"><span className="mb-1 block truncate">{period.sourceName ?? period.periodId}</span><input value={draftLabels[period.periodId] ?? period.label} onChange={event => setDraftLabels(current => ({ ...current, [period.periodId]: event.target.value }))} className="w-full rounded border border-black/10 px-2 py-1.5 text-[12px] text-[#202123] outline-none focus:border-blue-400" placeholder={t('Month / period label')} /></label>)}</div><button type="button" onClick={() => onApplyPeriodLabels(draftLabels)} className="mt-2 rounded-md bg-[#202123] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-black">{t('Apply period labels')}</button></div>}</div>
            <div><h4 className="text-[12px] font-semibold uppercase tracking-wide text-black/55">{t('Profit evidence')}</h4><p className="mt-1 text-[13px] font-semibold text-[#202123]">{brief.profitEvidenceStatus === 'available' ? t('Direct profit / margin available') : brief.profitEvidenceStatus === 'estimated_from_cost' ? t('Estimated from cost-like fields') : t('Missing cost / profit evidence')}</p><p className="mt-1 text-[12px] leading-5 text-black/55">{t('Revenue')}: {brief.signalCoverage.revenueField ?? t('missing')} · {t('Cost')}: {brief.signalCoverage.costFields.length ? brief.signalCoverage.costFields.join(', ') : t('missing')} · {t('Dimension')}: {brief.signalCoverage.dimensionField ?? t('missing')}</p></div>
          </div></details>

          <details data-testid="comparison-supporting-reasons" className="border-b border-[var(--lb-divider)] py-3"><summary className="flex cursor-pointer list-none items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600" /><span className="text-[12px] font-semibold uppercase tracking-wide text-black/55">{t('Supporting reason codes')}</span></summary><div className="mt-3 divide-y divide-[var(--lb-divider)]">{narrativePlan.reasonCodes.length === 0 ? <p className="py-2 text-[12px] text-black/45">{t('No additional reason code remains after narrative deduplication.')}</p> : narrativePlan.reasonCodes.map(reason => <div key={reason.id} className="py-2"><p className="text-[13px] font-medium text-[#202123]">{t(reason.label)}</p><p className="mt-0.5 text-[12px] leading-5 text-black/55">{t(reason.statement)}</p></div>)}</div></details>

          <section className="border-b border-[var(--lb-divider)] py-3"><div className="mb-2 flex items-center gap-2"><FileDown className="h-4 w-4 text-emerald-600" /><h4 className="text-[12px] font-semibold uppercase tracking-wide text-black/55">{t('Exportable evidence')}</h4></div>{brief.exportableEvidence.length === 0 ? <p className="text-[12px] text-black/45">{t('No row evidence available for export yet.')}</p> : <div className="divide-y divide-[var(--lb-divider)]">{brief.exportableEvidence.slice(0, 10).map(evidence => <div key={evidence.id} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><p className="truncate text-[12px] font-medium text-[#202123]">{evidence.label}</p><p className="text-[11px] text-black/45">{formatNumber(evidence.rowCount, locale)} {t('rows')}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => exportRowsAsCsv(`${safeFilePart(evidence.label)}.csv`, columnsForRows(evidence.rows), evidence.rows)} className="inline-flex items-center gap-1 rounded border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-black/60 hover:bg-black/[0.035]"><Download className="h-3 w-3" /> CSV</button><button type="button" onClick={() => exportRowsAsXlsx(`${safeFilePart(evidence.label)}.xlsx`, columnsForRows(evidence.rows), evidence.rows)} className="inline-flex items-center gap-1 rounded border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-black/60 hover:bg-black/[0.035]"><Download className="h-3 w-3" /> Excel</button></div></div>)}</div>}</section>

          {(criticalReason || brief.caveats.length > 0) && <div className="border-l-2 border-amber-300 py-3 pl-3"><div className="flex items-start gap-2">{criticalReason ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}<div><p className="text-[13px] font-semibold text-[#202123]">{t(criticalReason ? 'Decision caveat' : 'Review before deciding')}</p><div className="mt-1 space-y-1 text-[12px] leading-5 text-black/60">{criticalReason && <p>{t(criticalReason.statement)}</p>}{brief.caveats.map(caveat => <p key={caveat}>- {t(caveat)}</p>)}</div></div></div></div>}
        </div>
      </section>
    </section>
  );

};
