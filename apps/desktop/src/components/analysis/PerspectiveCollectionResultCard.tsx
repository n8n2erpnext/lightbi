import React from "react";
import ReactECharts from "echarts-for-react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronRight, Lightbulb, ShieldCheck } from "lucide-react";

type Row = Record<string, string | number>;

const metricLabel = (value: string) =>
  value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

const format = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);

export const PerspectiveCollectionResultCard: React.FC<{
  perspectiveId: string;
  rows: Row[];
  sourceCount: number;
  onExplore?: (question: string) => void;
}> = ({ perspectiveId, rows, sourceCount, onExplore }) => {
  if (rows.length === 0) return null;
  const metricIds = [...new Set(rows.flatMap((row) =>
    Object.keys(row).filter((key) => key !== "reporting_period")))];
  const movements = metricIds.map((metricId) => {
    const first = Number(rows[0]?.[metricId] ?? 0);
    const last = Number(rows[rows.length - 1]?.[metricId] ?? 0);
    const delta = last - first;
    return {
      metricId,
      first,
      last,
      delta,
      percent: first === 0 ? null : delta / Math.abs(first),
    };
  });
  const largestMovement = [...movements].sort((left, right) =>
    Math.abs(right.percent ?? 0) - Math.abs(left.percent ?? 0))[0];
  const firstPeriod = String(rows[0]?.reporting_period ?? "the first period");
  const lastPeriod = String(rows[rows.length - 1]?.reporting_period ?? "the latest period");
  const questions = largestMovement ? [
    `What drove the change in ${metricLabel(largestMovement.metricId)} from ${firstPeriod} to ${lastPeriod}?`,
    `Break down ${metricLabel(largestMovement.metricId)} by the most useful business dimensions.`,
    `Which segments should I investigate first for ${metricLabel(largestMovement.metricId)}?`,
  ] : [];
  const option = {
    animation: false,
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, textStyle: { color: "#475569" } },
    grid: { left: 70, right: 28, top: 25, bottom: 58 },
    xAxis: {
      type: "category",
      data: rows.map((row) => String(row.reporting_period)),
      axisLabel: { color: "#475569" },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b", formatter: (value: number) => format(value) },
      splitLine: { lineStyle: { color: "#e2e8f0" } },
    },
    series: metricIds.map((metricId, index) => ({
      name: metricLabel(metricId),
      type: "line",
      smooth: true,
      symbolSize: 8,
      data: rows.map((row) => Number(row[metricId] ?? 0)),
      lineStyle: { width: 3 },
      itemStyle: { color: ["#2563eb", "#059669", "#d97706"][index % 3] },
    })),
  };

  return (
    <section data-testid="perspective-collection-result" className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-slate-900 px-5 py-5 text-white md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300">
              <CheckCircle2 className="h-4 w-4" />
              Analysis ready
            </div>
            <h3 className="mt-2 text-[21px] font-semibold">{metricLabel(perspectiveId)}</h3>
            <p className="mt-1 text-[12px] text-slate-300">
              LightBI analyzed {sourceCount} complete sources across {rows.length} reporting period{rows.length === 1 ? "" : "s"}.
            </p>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-200">
            Full-file governed
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1.25fr_0.75fr] md:p-6">
        <div className="h-[320px] min-w-0 rounded-xl border border-slate-100 bg-slate-50/40 p-2">
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
        </div>
        <div className="space-y-3">
          {movements.map((movement) => {
            const Icon = movement.delta >= 0 ? ArrowUpRight : ArrowDownRight;
            return (
              <article key={movement.metricId} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{metricLabel(movement.metricId)}</p>
                  <Icon className={`h-4 w-4 ${movement.delta >= 0 ? "text-emerald-600" : "text-red-600"}`} />
                </div>
                <p className="mt-2 text-[22px] font-semibold text-slate-950">{format(movement.last)}</p>
                <p className={`mt-1 text-[11px] ${movement.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {movement.delta >= 0 ? "+" : "−"}{format(Math.abs(movement.delta))}
                  {movement.percent === null ? "" : ` (${Math.abs(movement.percent * 100).toFixed(1)}%)`} vs first period
                </p>
              </article>
            );
          })}
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-800">
              <Lightbulb className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-wide">BA focus</p>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-amber-900/80">
              {largestMovement
                ? `${metricLabel(largestMovement.metricId)} has the largest relative movement (${Math.abs((largestMovement.percent ?? 0) * 100).toFixed(1)}%). This is the strongest place to begin; it is an observation, not yet a cause.`
                : "No measurable period movement was found. Review mix, segments, and data coverage before drawing a conclusion."}
            </p>
            {questions.length > 0 && (
              <div className="mt-3 space-y-2">
                {questions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onExplore?.(question)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-left text-[11px] font-medium leading-4 text-slate-700 transition hover:border-amber-400 hover:text-slate-950 disabled:cursor-default"
                    disabled={!onExplore}
                  >
                    <span>{question}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] leading-5 text-blue-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Results were computed per governed source relationship and period. LightBI combined metrics, not unrelated raw rows.
          </div>
        </div>
      </div>
    </section>
  );
};
