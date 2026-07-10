import React from 'react';
import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, Link2, ShieldCheck } from 'lucide-react';
import type { BusinessFusionOverview } from '../../lib/business-fusion-overview';

interface BusinessFusionOpportunityCardProps {
  overview: BusinessFusionOverview;
  onUseFusedDataset?: () => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function buildDecisionAngles(overview: BusinessFusionOverview): string[] {
  const metricIds = new Set(overview.metrics.map(metric => metric.metricId));
  const angles = new Set<string>();

  if (metricIds.has('revenue')) angles.add('Compare revenue between periods');
  if (overview.topGrowthDrivers.length > 0 || overview.topDeclineDrivers.length > 0) angles.add('Find Top 10 growth and decline drivers');
  if (metricIds.has('gross_profit') || overview.topProfitDrivers.length > 0) {
    angles.add('Compare revenue leaders vs profit leaders');
  } else {
    angles.add('Check whether profit evidence is available');
  }
  if (metricIds.has('quantity') || metricIds.has('delivery_fee')) angles.add('Explain operational movement from logistics signals');
  if (overview.reconciliationChecks.length > 0 || overview.sources.some(source => source.role === 'accounting')) {
    angles.add('Reconcile Sales and Accounting evidence');
  }

  return Array.from(angles).slice(0, 5);
}

export const BusinessFusionOpportunityCard: React.FC<BusinessFusionOpportunityCardProps> = ({ overview, onUseFusedDataset }) => {
  const angles = buildDecisionAngles(overview);
  const statusTone = overview.status === 'ready'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : overview.status === 'partial'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-red-200 bg-red-50 text-red-800';

  return (
    <section className="rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-violet-600" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Cross-domain data map</p>
          </div>
          <h3 className="mt-1 text-[17px] font-semibold text-[#202123]">LightBI found related business datasets</h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-black/60">
            These files can be fused after you choose a decision angle. The full BA overview will run in the next step.
          </p>
        </div>
        <div className={`rounded-lg border px-4 py-3 text-center ${statusTone}`}>
          <p className="text-2xl font-semibold">{overview.readinessScore}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide">fusion ready</p>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-black/10 bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <p className="text-[12px] font-semibold uppercase tracking-wide text-black/50">Detected sources</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {overview.sources.map(source => (
              <div key={source.familyId} className="rounded-md border border-black/5 bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[12px] font-semibold capitalize text-[#202123]">{source.role}</p>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-black/50">
                    {source.files.length} file{source.files.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-black/45">{source.familyName}</p>
                <p className="mt-1 text-[11px] text-black/40">{formatNumber(source.rows)} rows</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            <p className="text-[12px] font-semibold uppercase tracking-wide text-black/50">Shared business keys</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {overview.objectKeys.length === 0 ? (
              <span className="text-[12px] text-black/45">No shared key detected yet.</span>
            ) : overview.objectKeys.slice(0, 8).map(match => (
              <span key={match.key} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-700">
                {match.key} · {Math.round(match.coverage * 100)}%
              </span>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-black/50">Decision angles available next</p>
            <div className="mt-2 grid gap-2">
              {angles.map(angle => (
                <div key={angle} className="flex items-center gap-2 rounded-md border border-black/5 bg-white px-3 py-2 text-[12px] text-[#202123]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>{angle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {overview.caveats.length > 0 && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 lg:col-span-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-800">Before full analysis</p>
            </div>
            <ul className="mt-2 grid gap-1 text-[12px] leading-5 text-amber-900/80 md:grid-cols-2">
              {overview.caveats.slice(0, 4).map(item => <li key={item}>- {item}</li>)}
            </ul>
          </div>
        )}

        {onUseFusedDataset && (
          <div className="flex flex-col gap-2 rounded-lg border border-violet-100 bg-violet-50 p-3 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
            <div>
              <p className="text-[13px] font-semibold text-violet-950">Move to cross-domain BA workspace</p>
              <p className="text-[12px] leading-5 text-violet-900/70">Create one fused dataset first. Then LightBI will show the full BA overview, chart, Top 10 drivers, caveats, and exportable evidence.</p>
            </div>
            <button
              onClick={onUseFusedDataset}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
            >
              Use fused dataset
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
