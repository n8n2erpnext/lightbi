import React from "react";
import ReactECharts from "echarts-for-react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react";
import type {
  CanonicalPeriodPartitionExecutionResultV1,
  CanonicalPeriodPartitionWorkspaceV1,
} from "../../lib/understanding-core/canonical-period-partition-boundary";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function metricLabel(metricId: string): string {
  return metricId.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export const PeriodPartitionResultCard: React.FC<{
  workspace: CanonicalPeriodPartitionWorkspaceV1;
  result: CanonicalPeriodPartitionExecutionResultV1;
}> = ({ workspace, result }) => {
  if (result.status !== "executed" || result.rows.length < 2) return null;
  const values = result.rows.map((row) => Number(row[workspace.metricId] ?? 0));
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const deltaPercent = first === 0 ? null : delta / Math.abs(first);
  const DirectionIcon = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  const direction = delta > 0 ? "increased" : delta < 0 ? "decreased" : "was unchanged";
  const strongestIndex = values.reduce((best, value, index) => value > values[best] ? index : best, 0);
  const option = {
    animation: false,
    tooltip: { trigger: "axis" },
    grid: { left: 72, right: 28, top: 28, bottom: 48 },
    xAxis: {
      type: "category",
      data: result.rows.map((row) => String(row.reporting_period)),
      axisLabel: { color: "#475569" },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "#64748b",
        formatter: (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value),
      },
      splitLine: { lineStyle: { color: "#e2e8f0" } },
    },
    series: [{
      name: metricLabel(workspace.metricId),
      type: "line",
      smooth: true,
      symbolSize: 9,
      data: values,
      lineStyle: { width: 3, color: "#2563eb" },
      itemStyle: { color: "#2563eb" },
      areaStyle: { color: "rgba(37, 99, 235, 0.10)" },
    }],
  };

  return (
    <section data-testid="period-partition-result" className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-[15px] font-semibold text-slate-950">Governed period comparison</h3>
          </div>
          <p className="mt-1 text-[12px] text-slate-500">
            {workspace.periodMembers.length} full-file {workspace.sourceRole} partitions · {metricLabel(workspace.metricId)}
          </p>
        </div>
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
          Full-file executed
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="h-[300px] min-w-0 rounded-lg border border-slate-100 bg-slate-50/40 p-2">
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
        </div>
        <div className="space-y-3">
          <div className={`rounded-lg border p-3 ${delta >= 0 ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50"}`}>
            <div className="flex items-center gap-2">
              <DirectionIcon className={`h-4 w-4 ${delta >= 0 ? "text-emerald-700" : "text-red-700"}`} />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">BA movement</p>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-slate-800">
              {metricLabel(workspace.metricId)} {direction} by {formatNumber(Math.abs(delta))}
              {deltaPercent === null ? "" : ` (${Math.abs(deltaPercent * 100).toFixed(1)}%)`} from {String(result.rows[0].reporting_period)} to {String(result.rows[result.rows.length - 1].reporting_period)}.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">Strongest period</p>
            <p className="mt-2 text-[13px] text-slate-800">
              {String(result.rows[strongestIndex].reporting_period)} contributes the highest governed result: <strong>{formatNumber(values[strongestIndex])}</strong>.
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-800">Truth boundary</p>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-blue-800/80">
              Every period was executed against its complete source with the same governed metric. LightBI combined metric results only; source rows were not joined across periods.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
