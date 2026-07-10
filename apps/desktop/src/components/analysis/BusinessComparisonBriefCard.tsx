import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Download, FileDown, ShieldAlert, TrendingUp } from 'lucide-react';
import type { DomainComparisonBrief, DriverContribution, MetricDelta, NarrativeSection } from '../../lib/ba-comparison-engine';
import { exportRowsAsCsv, exportRowsAsXlsx } from '../../lib/drill-through-export';

interface BusinessComparisonBriefCardProps {
  brief: DomainComparisonBrief;
  onApplyPeriodLabels?: (labelsBySource: Record<string, string>) => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
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

function metricTone(metric: MetricDelta): string {
  if (metric.delta > 0) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (metric.delta < 0) return 'text-red-700 bg-red-50 border-red-100';
  return 'text-slate-700 bg-slate-50 border-slate-100';
}

function DriverList({ title, drivers, mode }: { title: string; drivers: DriverContribution[]; mode: 'growth' | 'decline' | 'profit' }) {
  const Icon = mode === 'decline' ? ArrowDownRight : ArrowUpRight;
  const accent = mode === 'decline' ? 'text-red-600' : mode === 'profit' ? 'text-violet-600' : 'text-emerald-600';
  return (
    <div className="rounded-lg border border-black/10 bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent}`} />
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-black/55">{title}</h4>
      </div>
      {drivers.length === 0 ? (
        <p className="text-[12px] text-black/45">No reliable drivers found.</p>
      ) : (
        <div className="space-y-2">
          {drivers.slice(0, 10).map((driver, index) => (
            <div key={`${title}:${driver.key}`} className="flex items-start justify-between gap-3 border-t border-black/5 pt-2 first:border-t-0 first:pt-0">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#202123]">{index + 1}. {driver.key}</p>
                <p className="text-[11px] text-black/45">
                  Revenue Δ {formatNumber(driver.revenueDelta)} · {formatPercent(driver.revenueDeltaPercent)}
                </p>
              </div>
              {driver.currentProfit !== undefined && (
                <div className="shrink-0 text-right">
                  <p className="text-[12px] font-semibold text-black/70">{formatNumber(driver.currentProfit)}</p>
                  <p className="text-[10px] uppercase text-black/35">profit</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NarrativeSectionCard({ section }: { section: NarrativeSection }) {
  const tone = section.severity === 'positive'
    ? 'border-emerald-100 bg-emerald-50'
    : section.severity === 'critical'
      ? 'border-red-100 bg-red-50'
      : section.severity === 'warning'
        ? 'border-amber-100 bg-amber-50'
        : 'border-black/10 bg-white';
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <p className="text-[13px] font-semibold text-[#202123]">{section.title}</p>
      <p className="mt-1 text-[12px] leading-5 text-black/65">{section.summary}</p>
      {section.bullets.length > 0 && (
        <ul className="mt-2 space-y-1 text-[12px] leading-5 text-black/60">
          {section.bullets.slice(0, 22).map(bullet => (
            <li key={bullet}>- {bullet}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const BusinessComparisonBriefCard: React.FC<BusinessComparisonBriefCardProps> = ({ brief, onApplyPeriodLabels }) => {
  const initialLabels = useMemo(
    () => Object.fromEntries(brief.periodMapping.map(period => [period.periodId, period.label])),
    [brief.periodMapping]
  );
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>(initialLabels);
  useEffect(() => {
    setDraftLabels(initialLabels);
  }, [initialLabels]);
  const criticalReason = brief.reasonCodes.find(reason => reason.severity === 'critical');
  const trustTone = brief.decisionReadinessScore >= 70
    ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
    : brief.decisionReadinessScore >= 45
      ? 'border-amber-100 bg-amber-50 text-amber-900'
      : 'border-red-100 bg-red-50 text-red-900';

  return (
    <section className={`rounded-xl border p-4 shadow-sm ${trustTone}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <h3 className="text-[15px] font-semibold">Business comparison brief</h3>
            <span className="rounded border border-white/70 bg-white/70 px-2 py-0.5 text-[11px] font-semibold">{brief.domainLabel}</span>
          </div>
          <p className="mt-1 text-[13px] leading-5 opacity-85">{brief.headline}</p>
          {brief.periods.length >= 2 && (
            <p className="mt-1 text-[12px] opacity-70">{brief.periods[0]} → {brief.periods[brief.periods.length - 1]}</p>
          )}
          <p className="mt-1 text-[12px] opacity-70">{brief.businessQuestion}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border border-white/70 bg-white/70">
            <div className="text-center">
              <div className="text-2xl font-semibold leading-none">{brief.decisionReadinessScore}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase opacity-60">ready</div>
            </div>
          </div>
          <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border border-white/70 bg-white/70">
            <div className="text-center">
              <div className="text-2xl font-semibold leading-none">{brief.trustScore}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase opacity-60">trust</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-white/70 bg-white/70 p-3">
          <div className="mb-2 flex items-center gap-2">
            {brief.periodMappingNeedsReview ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-black/55">Period mapping</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {brief.periodMapping.map(period => (
              <span key={period.periodId} className="rounded border border-black/10 bg-white px-2 py-1 text-[11px] text-black/60" title={period.reason}>
                {period.label} · {period.confidence}
              </span>
            ))}
          </div>
          {brief.periodMappingNeedsReview && (
            <p className="mt-2 text-[12px] leading-5 text-amber-800">
              Review period labels if filenames do not clearly represent the reporting months.
            </p>
          )}
          {onApplyPeriodLabels && (
            <div className="mt-3 rounded-md border border-black/10 bg-white p-2">
              <div className="grid gap-2 md:grid-cols-2">
                {brief.periodMapping.map(period => (
                  <label key={period.periodId} className="text-[11px] font-medium text-black/55">
                    <span className="mb-1 block truncate">{period.sourceName ?? period.periodId}</span>
                    <input
                      value={draftLabels[period.periodId] ?? period.label}
                      onChange={event => setDraftLabels(current => ({ ...current, [period.periodId]: event.target.value }))}
                      className="w-full rounded border border-black/10 px-2 py-1.5 text-[12px] text-[#202123] outline-none focus:border-blue-400"
                      placeholder="Month / period label"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onApplyPeriodLabels(draftLabels)}
                className="mt-2 rounded-md bg-[#202123] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-black"
              >
                Apply period labels
              </button>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-white/70 bg-white/70 p-3">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-black/55">Profit evidence</h4>
          <p className="mt-1 text-[13px] font-semibold text-[#202123]">
            {brief.profitEvidenceStatus === 'available'
              ? 'Direct profit / margin available'
              : brief.profitEvidenceStatus === 'estimated_from_cost'
                ? 'Estimated from cost-like fields'
                : 'Missing cost / profit evidence'}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-black/55">
            Revenue: {brief.signalCoverage.revenueField ?? 'missing'} · Cost: {brief.signalCoverage.costFields.length ? brief.signalCoverage.costFields.join(', ') : 'missing'} · Dimension: {brief.signalCoverage.dimensionField ?? 'missing'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {brief.metricDeltas.map(metric => (
          <div key={metric.metricId} className={`rounded-lg border p-3 ${metricTone(metric)}`}>
            <p className="text-[12px] font-semibold uppercase opacity-70">{metric.label}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-xl font-semibold">{formatNumber(metric.delta)}</p>
              <p className="text-[12px] font-medium">{formatPercent(metric.deltaPercent)}</p>
            </div>
            <p className="mt-1 text-[11px] opacity-65">
              {formatNumber(metric.previousValue)} → {formatNumber(metric.currentValue)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {brief.narrativeSections.map(section => (
          <NarrativeSectionCard key={section.id} section={section} />
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <DriverList title="Top growth" drivers={brief.topGrowthDrivers} mode="growth" />
        <DriverList title="Top decline" drivers={brief.topDeclineDrivers} mode="decline" />
        <DriverList title="Top profit" drivers={brief.topProfitDrivers} mode="profit" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-black/10 bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-black/55">Why it changed</h4>
          </div>
          <div className="space-y-2">
            {brief.reasonCodes.map(reason => (
              <div key={reason.id} className="rounded-md bg-black/[0.025] p-2">
                <p className="text-[13px] font-medium text-[#202123]">{reason.label}</p>
                <p className="mt-0.5 text-[12px] leading-5 text-black/55">{reason.statement}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <FileDown className="h-4 w-4 text-emerald-600" />
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-black/55">Exportable evidence</h4>
          </div>
          {brief.exportableEvidence.length === 0 ? (
            <p className="text-[12px] text-black/45">No row evidence available for export yet.</p>
          ) : (
            <div className="space-y-2">
              {brief.exportableEvidence.slice(0, 10).map(evidence => (
                <div key={evidence.id} className="flex items-center justify-between gap-3 rounded-md bg-black/[0.025] p-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-[#202123]">{evidence.label}</p>
                    <p className="text-[11px] text-black/45">{formatNumber(evidence.rowCount)} rows</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => exportRowsAsCsv(`${safeFilePart(evidence.label)}.csv`, columnsForRows(evidence.rows), evidence.rows)}
                      className="inline-flex items-center gap-1 rounded border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-black/60 hover:bg-black/[0.035]"
                    >
                      <Download className="h-3 w-3" /> CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => exportRowsAsXlsx(`${safeFilePart(evidence.label)}.xlsx`, columnsForRows(evidence.rows), evidence.rows)}
                      className="inline-flex items-center gap-1 rounded border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-black/60 hover:bg-black/[0.035]"
                    >
                      <Download className="h-3 w-3" /> Excel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(criticalReason || brief.caveats.length > 0) && (
        <div className="mt-4 rounded-lg border border-white/70 bg-white/70 p-3">
          <div className="flex items-start gap-2">
            {criticalReason ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
            <div>
              <p className="text-[13px] font-semibold text-[#202123]">{criticalReason ? 'Decision caveat' : 'Review before deciding'}</p>
              <div className="mt-1 space-y-1 text-[12px] leading-5 text-black/60">
                {criticalReason && <p>{criticalReason.statement}</p>}
                {brief.caveats.map(caveat => <p key={caveat}>- {caveat}</p>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
