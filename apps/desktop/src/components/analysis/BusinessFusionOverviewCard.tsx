import React from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, Brain, CheckCircle2, Link2, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { BusinessFusionOverview, FusionDriver, FusionMetricDelta, FusionNarrativeSection, FusionRiskSignal } from '../../lib/business-fusion-overview';

interface BusinessFusionOverviewCardProps {
  overview: BusinessFusionOverview;
  onUseFusedDataset?: () => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function MetricCard({ metric }: { metric: FusionMetricDelta }) {
  const positive = metric.delta >= 0;
  return (
    <div className="min-w-0 rounded-lg border border-black/10 bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-black/45" title={metric.label}>{metric.label}</p>
          <p className="mt-1 break-words text-[20px] font-semibold leading-6 text-[#202123]">{formatNumber(metric.currentValue)}</p>
          <div className="mt-2 grid gap-0.5 text-[11px] leading-4 text-black/50">
            <span className="break-words">Previous: {formatNumber(metric.previousValue)}</span>
            <span className="break-words">Current: {formatNumber(metric.currentValue)}</span>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold leading-none ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {formatPercent(metric.deltaPercent)}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-black/40">Source: {metric.sourceRole}</p>
    </div>
  );
}

function DriverList({ title, drivers, tone }: { title: string; drivers: FusionDriver[]; tone: 'growth' | 'decline' | 'profit' }) {
  const toneClass = tone === 'growth'
    ? 'text-emerald-700'
    : tone === 'decline'
      ? 'text-red-700'
      : 'text-violet-700';
  return (
    <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-black/50">{title}</p>
      {drivers.length === 0 ? (
        <p className="mt-3 text-[12px] text-black/45">No reliable drivers found.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {drivers.slice(0, 10).map((driver, index) => (
            <li key={`${driver.metricId}-${driver.key}`} className="flex items-start justify-between gap-3 border-b border-black/5 pb-2 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#202123]">#{index + 1} {driver.key}</p>
                <p className="text-[11px] text-black/45">{driver.dimension} · {driver.metricId}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-[13px] font-semibold ${toneClass}`}>{formatNumber(driver.delta)}</p>
                <p className="text-[11px] text-black/40">{formatPercent(driver.deltaPercent)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NarrativeCard({ section }: { section: FusionNarrativeSection }) {
  const toneClass = section.tone === 'positive'
    ? 'border-emerald-100 bg-emerald-50 text-emerald-950'
    : section.tone === 'negative'
      ? 'border-red-100 bg-red-50 text-red-950'
      : section.tone === 'warning'
        ? 'border-amber-100 bg-amber-50 text-amber-950'
        : 'border-black/10 bg-gray-50 text-[#202123]';

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-[13px] font-semibold">{section.title}</p>
      <p className="mt-1 text-[12px] leading-5 opacity-80">{section.summary}</p>
      {section.bullets.length > 0 && (
        <ul className="mt-3 space-y-1 text-[12px] leading-5 opacity-75">
          {section.bullets.slice(0, 8).map(item => <li key={item}>- {item}</li>)}
        </ul>
      )}
    </div>
  );
}

function RiskSignalList({ signals }: { signals: FusionRiskSignal[] }) {
  if (signals.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-red-700" />
        <p className="text-[12px] font-semibold uppercase tracking-wide text-red-800">Decision risk signals</p>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {signals.slice(0, 6).map(signal => (
          <div key={signal.id} className="rounded-md border border-red-100 bg-white/70 p-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-semibold text-red-950">{signal.title}</p>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">{signal.severity}</span>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-red-900/75">{signal.message}</p>
            {signal.evidence.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] leading-4 text-red-900/60">
                {signal.evidence.map(item => <li key={item}>- {item}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const BusinessFusionOverviewCard: React.FC<BusinessFusionOverviewCardProps> = ({ overview, onUseFusedDataset }) => {
  const statusTone = overview.status === 'ready'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : overview.status === 'partial'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-red-200 bg-red-50 text-red-900';

  return (
    <section className="rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-black/10 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-violet-600" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Cross-domain BA overview</p>
          </div>
          <h3 className="mt-1 text-lg font-semibold text-[#202123]">{overview.title}</h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-black/60">{overview.executiveSummary}</p>
        </div>
        <div className={`rounded-lg border px-4 py-3 text-center ${statusTone}`}>
          <p className="text-2xl font-semibold">{overview.readinessScore}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide">ready</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {overview.metrics.map(metric => (
            <MetricCard key={metric.metricId} metric={metric} />
          ))}
        </div>

        {overview.narrativeSections.length > 0 && (
          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-700" />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-violet-800">Executive BA readout</p>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {overview.narrativeSections.map(section => (
                <NarrativeCard key={section.id} section={section} />
              ))}
            </div>
          </div>
        )}

        <RiskSignalList signals={overview.riskSignals} />

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-black/10 bg-white p-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-600" />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-black/50">Shared business object keys</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {overview.objectKeys.length === 0 ? (
                <span className="text-[12px] text-black/45">No shared key detected.</span>
              ) : overview.objectKeys.map(match => (
                <span key={match.key} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-700">
                  {match.key} · {Math.round(match.coverage * 100)}%
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-black/50">Detected sources</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {overview.sources.map(source => (
                <div key={source.familyId} className="rounded-md bg-gray-50 p-2">
                  <p className="truncate text-[12px] font-semibold text-[#202123]">{source.familyName}</p>
                  <p className="text-[11px] text-black/45">{source.role} · {formatNumber(source.rows)} rows · {source.files.length} file{source.files.length === 1 ? '' : 's'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <DriverList title="Top 10 growth" drivers={overview.topGrowthDrivers} tone="growth" />
          <DriverList title="Top 10 decline" drivers={overview.topDeclineDrivers} tone="decline" />
          <DriverList title="Top 10 profit" drivers={overview.topProfitDrivers} tone="profit" />
        </div>

        {(overview.crossChecks.length > 0 || overview.caveats.length > 0) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {overview.crossChecks.length > 0 && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-emerald-800">Cross-checks</p>
                </div>
                <ul className="mt-2 space-y-1 text-[12px] leading-5 text-emerald-900/80">
                  {overview.crossChecks.map(item => <li key={item}>- {item}</li>)}
                </ul>
              </div>
            )}
            {overview.caveats.length > 0 && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-800">Caveats</p>
                </div>
                <ul className="mt-2 space-y-1 text-[12px] leading-5 text-amber-900/80">
                  {overview.caveats.map(item => <li key={item}>- {item}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {onUseFusedDataset && (
          <div className="flex flex-col gap-2 rounded-lg border border-violet-100 bg-violet-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-violet-950">Use fused business dataset</p>
              <p className="text-[12px] leading-5 text-violet-900/70">Create one analysis surface from shared business keys so charts and exports can use Sales, Accounting, and Logistics together.</p>
            </div>
            <button
              onClick={onUseFusedDataset}
              className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
            >
              Use fused dataset
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
