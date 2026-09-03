import React from 'react';
import { Target } from 'lucide-react';
import type { FocusComparisonState } from '../../hooks/useFocusSubjectComparison';

function number(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export const FocusSubjectComparisonCard: React.FC<{ state: FocusComparisonState }> = ({ state }) => {
  if (state.status === 'idle') return null;
  if (state.status === 'loading') return <section data-testid="focus-subject-comparison-loading" className="rounded-[18px] border border-violet-100 bg-violet-50/50 p-5 text-sm text-violet-800">Preparing full-source comparison for the selected focus…</section>;
  if (state.status === 'unavailable') return <section data-testid="focus-subject-comparison-unavailable" className="rounded-[18px] border border-amber-200 bg-amber-50 p-5"><div className="font-semibold text-amber-900">Focus comparison unavailable</div><p className="mt-1 text-xs leading-5 text-amber-800/80">{state.error}</p></section>;

  const comparison = state.comparison;
  const primaryMetric = comparison.metrics[0] ?? null;
  const benchmarkBars = primaryMetric ? [
    { label: 'Focus', value: primaryMetric.subjectValue, emphasis: true },
    { label: 'Average', value: primaryMetric.populationAverage, emphasis: false },
    { label: 'Top 10 avg', value: primaryMetric.topAverage, emphasis: false },
    { label: 'Bottom 10 avg', value: primaryMetric.bottomAverage, emphasis: false },
  ] : [];
  const maxBarValue = Math.max(1, ...benchmarkBars.map(item => Math.abs(item.value)));

  return <section data-testid="focus-subject-comparison" className="overflow-hidden rounded-[18px] border border-violet-200 bg-white shadow-sm">
    <div className="border-b border-violet-100 bg-violet-50/70 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-violet-700"><Target className="h-4 w-4" />Primary focus analysis</div>
          <h2 className="mt-1 text-[18px] font-semibold text-slate-950">{comparison.subject.displayLabel}</h2>
          <p className="mt-1 text-[12px] text-slate-500">Compared against the verified full population · {comparison.populationRowCount.toLocaleString()} rows{comparison.matchedSubjectRowCount > 1 ? ` · ${comparison.matchedSubjectRowCount} subject rows` : ''}</p>
        </div>
        {comparison.rankValue && <div className="rounded-xl border border-violet-100 bg-white px-4 py-2 text-right"><div className="text-[10px] uppercase tracking-wider text-slate-400">Recorded rank</div><div className="mt-0.5 text-lg font-semibold text-slate-900">{comparison.rankValue}</div></div>}
      </div>
    </div>

    {primaryMetric && <div data-testid="focus-primary-benchmark" className="border-b border-slate-100 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Primary metric</div><div className="mt-1 text-sm font-semibold text-slate-900">{primaryMetric.field}</div></div>
        <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-slate-400">Focus vs average</div><div className="mt-1 text-sm font-semibold text-violet-700">{primaryMetric.deltaFromAverage >= 0 ? '+' : ''}{number(primaryMetric.deltaFromAverage)}</div></div>
      </div>
      <div className="space-y-3">{benchmarkBars.map(item => <div key={item.label} className="grid grid-cols-[92px_minmax(0,1fr)_100px] items-center gap-3 text-xs">
        <span className={item.emphasis ? 'font-semibold text-violet-700' : 'font-medium text-slate-500'}>{item.label}</span>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={item.emphasis ? 'h-full rounded-full bg-violet-500' : 'h-full rounded-full bg-slate-400'} style={{ width: `${Math.max(2, Math.abs(item.value) / maxBarValue * 100)}%` }} /></div>
        <span className={item.emphasis ? 'text-right font-semibold text-violet-700' : 'text-right font-medium text-slate-600'}>{number(item.value)}</span>
      </div>)}</div>
      <div className="mt-4 text-[11px] text-slate-400">Percentile: {number(primaryMetric.percentile)}% · benchmarked across {primaryMetric.populationCount.toLocaleString()} entities</div>
    </div>}

    {comparison.metrics.length > 0 ? <div className="overflow-x-auto p-5">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="pb-2 pr-4">Metric</th><th className="pb-2 pr-4">Focus</th><th className="pb-2 pr-4">Average</th><th className="pb-2 pr-4">Top 10 avg</th><th className="pb-2 pr-4">Bottom 10 avg</th><th className="pb-2 pr-4">Δ vs avg</th><th className="pb-2">Percentile</th></tr></thead>
        <tbody>{comparison.metrics.map(metric => <tr key={metric.field} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-4 font-medium text-slate-800">{metric.field}</td><td className="py-3 pr-4 font-semibold text-violet-700">{number(metric.subjectValue)}</td><td className="py-3 pr-4 text-slate-600">{number(metric.populationAverage)}</td><td className="py-3 pr-4 text-slate-600">{number(metric.topAverage)}</td><td className="py-3 pr-4 text-slate-600">{number(metric.bottomAverage)}</td><td className="py-3 pr-4 font-medium text-slate-700">{metric.deltaFromAverage >= 0 ? '+' : ''}{number(metric.deltaFromAverage)}</td><td className="py-3 text-slate-600">{number(metric.percentile)}%</td></tr>)}</tbody>
      </table>
      <p className="mt-3 text-[11px] leading-5 text-slate-400">Top/Bottom values describe the metric distribution only; LightBI does not infer that a larger value is inherently better unless the governed metric contract says so.</p>
    </div> : <div className="p-5 text-sm text-slate-500">The focus was found in the full source, but this perspective has no reliable numeric metric for a benchmark yet.</div>}
  </section>;
};
