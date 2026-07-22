import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';
import type { BADecisionBrief } from '../../lib/ba-decision-engine';
import type { BusinessFusionOverview, FusionMetricDelta } from '../../lib/business-fusion-overview';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';
import { formatValue } from '../../lib/display-formatter';
import type { DisplayPreferences } from '../../stores/display-preferences-store';

function normalizeText(value: string | undefined): string {
  return (value || '').toLowerCase().replace(/[_-]+/g, ' ');
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const direct = Number(value);
    if (Number.isFinite(direct)) return direct;
    const cleaned = value.replace(/[^0-9,.-]/g, '').replace(/,/g, '');
    if (cleaned && cleaned !== '-' && cleaned !== '.' && Number.isFinite(Number(cleaned))) return Number(cleaned);
  }
  return null;
}

function metricIntent(action: AnalysisAction, chartModel: ChartPreviewModel | null): 'money' | 'profitability' | 'product' | 'operations' | 'general' {
  const text = normalizeText([
    action.opportunityName,
    action.label,
    action.description,
    ...action.dimensions,
    ...action.measures,
    chartModel?.title,
    chartModel?.xField,
    chartModel?.yField,
    ...(chartModel?.seriesFields || [])
  ].filter(Boolean).join(' '));

  if (/(profit|margin|gross profit|loi nhuan|lợi nhuận|cash|receivable|payable|dòng tiền|dong tien)/.test(text)) return 'profitability';
  if (/(product|item|sku|hang hoa|hàng hoá|hàng hóa|san pham|sản phẩm)/.test(text)) return 'product';
  if (/(quantity|stock|inventory|delivery|shipment|logistics|operation|status|warehouse)/.test(text)) return 'operations';
  if (/(money|revenue|sales|amount|invoice|trend|doanh thu|total)/.test(text)) return 'money';
  return 'general';
}

function findOverviewMetric(overview: BusinessFusionOverview | undefined, candidates: string[]): FusionMetricDelta | undefined {
  if (!overview) return undefined;
  return overview.metrics.find(metric => candidates.some(candidate => normalizeText(metric.metricId).includes(candidate) || normalizeText(metric.label).includes(candidate)));
}

function formatMetricDelta(metric: FusionMetricDelta | undefined, preferences: DisplayPreferences): string {
  if (!metric) return 'Not enough evidence in the current files.';
  const direction = metric.delta >= 0 ? 'increased' : 'decreased';
  return `${metric.label} ${direction} ${formatValue(Math.abs(metric.delta), 'currency', preferences, { compact: true })} (${metric.deltaPercent === null ? 'n/a' : `${Math.round(metric.deltaPercent * 100)}%`}) versus the previous period.`;
}

function buildChartTrendStatement(chartModel: ChartPreviewModel | null, preferences: DisplayPreferences): string | null {
  if (!chartModel?.xField || !chartModel.yField || chartModel.rows.length < 2) return null;
  const first = chartModel.rows[0];
  const last = chartModel.rows[chartModel.rows.length - 1];
  const firstValue = numberValue(first[chartModel.yField]);
  const lastValue = numberValue(last[chartModel.yField]);
  if (firstValue === null || lastValue === null) return null;
  const delta = lastValue - firstValue;
  const direction = delta >= 0 ? 'increased' : 'decreased';
  const percent = firstValue === 0 ? null : delta / Math.abs(firstValue);
  return `${chartModel.yField} ${direction} from ${formatValue(firstValue, 'currency', preferences, { compact: true })} at ${String(first[chartModel.xField])} to ${formatValue(lastValue, 'currency', preferences, { compact: true })} at ${String(last[chartModel.xField])}${percent === null ? '' : ` (${Math.round(percent * 100)}%)`}.`;
}

function topChartRows(chartModel: ChartPreviewModel | null, limit = 5): Array<{ label: string; value: number; field: string }> {
  if (!chartModel?.xField || !chartModel.yField) return [];
  const candidateFields = [
    chartModel.yField,
    ...chartModel.seriesFields,
    ...Object.keys(chartModel.rows[0] || {}).filter(field => field !== chartModel.xField)
  ].filter((field, index, fields) => Boolean(field) && fields.indexOf(field) === index);
  const valueField = candidateFields.find(field => chartModel.rows.some(row => numberValue(row[field]) !== null));
  if (!valueField) return [];
  return chartModel.rows
    .map(row => ({ label: String(row[chartModel.xField!] ?? '(empty)'), value: numberValue(row[valueField]), field: valueField }))
    .filter((item): item is { label: string; value: number; field: string } => item.value !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export const BusinessFusionAngleReadout: React.FC<{
  action: AnalysisAction;
  chartModel: ChartPreviewModel | null;
  overview?: BusinessFusionOverview;
  preferences: DisplayPreferences;
}> = ({ action, chartModel, overview, preferences }) => {
  const intent = metricIntent(action, chartModel);
  const revenue = findOverviewMetric(overview, ['revenue', 'sales']);
  const profit = findOverviewMetric(overview, ['profit', 'gross profit', 'margin']);
  const quantity = findOverviewMetric(overview, ['quantity']);
  const delivery = findOverviewMetric(overview, ['delivery']);
  const trendStatement = buildChartTrendStatement(chartModel, preferences);
  const rankedRows = topChartRows(chartModel);
  const topRow = rankedRows[0];
  const bottomRow = [...rankedRows].sort((a, b) => a.value - b.value)[0];
  const productFallback = overview?.topGrowthDrivers[0] || overview?.topProfitDrivers[0];
  const focusTitle = intent === 'profitability' ? 'Profit and cash-flow focus' : intent === 'product' ? 'Product performance focus' : intent === 'operations' ? 'Operational movement focus' : intent === 'money' ? 'Money trend focus' : 'Selected decision angle focus';
  const mainAnswer = intent === 'product' && (topRow || productFallback)
    ? topRow
      ? `${topRow.label} is the strongest item in this chart for ${topRow.field}, contributing ${formatValue(topRow.value, 'currency', preferences, { compact: true })}.`
      : `${productFallback!.key} is the strongest product signal LightBI could safely rank for this angle, moving ${formatValue(productFallback!.delta, 'currency', preferences, { compact: true })}.`
    : intent === 'profitability' ? formatMetricDelta(profit || revenue, preferences) : trendStatement || formatMetricDelta(revenue || profit, preferences);
  const overviewLines = intent === 'profitability'
    ? [formatMetricDelta(profit, preferences), formatMetricDelta(revenue, preferences), quantity ? formatMetricDelta(quantity, preferences) : null].filter(Boolean) as string[]
    : intent === 'product'
      ? [
          topRow ? `Top chart item: ${topRow.label} at ${formatValue(topRow.value, 'currency', preferences, { compact: true })} for ${topRow.field}.` : 'Top product signal is ranked from the fused Sales, Accounting, and Logistics evidence for this same angle.',
          bottomRow && bottomRow.label !== topRow?.label ? `Weakest visible item: ${bottomRow.label} at ${formatValue(bottomRow.value, 'currency', preferences, { compact: true })}.` : null,
          productFallback && !topRow ? `Fallback product driver: ${productFallback.key} moved ${formatValue(productFallback.delta, 'currency', preferences, { compact: true })}.` : null,
          overview?.topProfitDrivers[0] ? `Profit leader for context: ${overview.topProfitDrivers[0].key} at ${formatValue(overview.topProfitDrivers[0].currentValue, 'currency', preferences, { compact: true })}.` : null,
        ].filter(Boolean) as string[]
      : [trendStatement || formatMetricDelta(revenue, preferences), profit ? formatMetricDelta(profit, preferences) : null, delivery ? formatMetricDelta(delivery, preferences) : null].filter(Boolean) as string[];
  const detailDrivers = intent === 'product'
    ? (rankedRows.length > 0
        ? rankedRows.map((row, index) => `#${index + 1} ${row.label}: ${formatValue(row.value, 'currency', preferences, { compact: true })} (${row.field}).`)
        : (overview?.topGrowthDrivers || []).slice(0, 5).map((driver, index) => `Product driver #${index + 1}: ${driver.key}, movement ${formatValue(driver.delta, 'currency', preferences, { compact: true })}.`))
    : intent === 'profitability'
      ? (overview?.topProfitDrivers || []).slice(0, 5).map((driver, index) => `Profit #${index + 1}: ${driver.key} at ${formatValue(driver.currentValue, 'currency', preferences, { compact: true })}, movement ${formatValue(driver.delta, 'currency', preferences, { compact: true })}.`)
      : [...(overview?.topGrowthDrivers || []).slice(0, 3).map((driver, index) => `Growth #${index + 1}: ${driver.key}, ${formatValue(driver.delta, 'currency', preferences, { compact: true })}.`), ...(overview?.topDeclineDrivers || []).slice(0, 3).map((driver, index) => `Decline #${index + 1}: ${driver.key}, ${formatValue(driver.delta, 'currency', preferences, { compact: true })}.`)];
  const riskLines = [...(overview?.caveats || []).slice(0, 2), ...(overview?.crossChecks || []).slice(0, 1), chartModel?.warnings[0]].filter(Boolean);

  return (
    <section className="mb-5 rounded-xl border border-violet-100 bg-white shadow-sm">
      <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Selected angle BA readout</p>
        <h3 className="mt-1 text-lg font-semibold text-[#202123]">{focusTitle}</h3>
        <p className="mt-1 text-[12px] leading-5 text-black/55">Angle: {action.opportunityName} · Chart: {chartModel?.title || action.label} · Main measure: {chartModel?.yField || action.measures[0] || 'detected metric'}</p>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-950"><p className="text-[13px] font-semibold">Main answer</p><p className="mt-1 text-[13px] leading-6">{mainAnswer}</p></div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-950"><p className="text-[13px] font-semibold">Why this chart exists</p><p className="mt-1 text-[13px] leading-6">LightBI selected {chartModel?.chartType || 'this chart'} because the active angle combines {action.dimensions.join(', ') || chartModel?.xField || 'a business dimension'} with {action.measures.join(', ') || chartModel?.yField || 'a measurable outcome'}.</p></div>
        <div className="rounded-lg border border-black/10 bg-white p-3"><p className="text-[13px] font-semibold text-[#202123]">Overview analysis</p><ul className="mt-2 space-y-1 text-[12px] leading-5 text-black/65">{overviewLines.length > 0 ? overviewLines.map(line => <li key={line}>- {line}</li>) : <li>No overview line could be safely generated for this angle.</li>}</ul></div>
        <div className="rounded-lg border border-black/10 bg-white p-3"><p className="text-[13px] font-semibold text-[#202123]">Details and drivers</p><ul className="mt-2 space-y-1 text-[12px] leading-5 text-black/65">{detailDrivers.length > 0 ? detailDrivers.slice(0, 6).map(line => <li key={line}>- {line}</li>) : <li>No ranked driver was available for this chart.</li>}</ul></div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-amber-950 lg:col-span-2"><p className="text-[13px] font-semibold">Risk and caveat</p><ul className="mt-2 space-y-1 text-[12px] leading-5 opacity-80">{riskLines.length > 0 ? riskLines.map(line => <li key={line}>- {line}</li>) : <li>Use this as directional analysis until reconciliation, margin, and source-quality checks are reviewed.</li>}</ul></div>
      </div>
    </section>
  );
};

export const BasicBAAnswerCard: React.FC<{
  brief: BADecisionBrief;
  onAnalyzeDeeper: () => void;
  canAnalyzeDeeper: boolean;
}> = ({ brief, onAnalyzeDeeper, canAnalyzeDeeper }) => {
  const primaryInsights = brief.insights.slice(0, 2);
  const trustClass = brief.decisionReadinessScore >= 70 ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : brief.decisionReadinessScore >= 45 ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-red-100 bg-red-50 text-red-800';
  return (
    <section className="mt-5 rounded-[16px] border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-violet-50 text-violet-600"><ClipboardCheck className="h-4 w-4" /></div><div><h3 className="text-sm font-semibold text-[#202123]">BA answer</h3><p className="text-xs text-black/45">Basic answer for this selected decision angle.</p></div></div><p className="text-sm leading-6 text-slate-700">{brief.executiveSummary}</p></div>
        <div className="grid min-w-[220px] grid-cols-2 gap-2"><div className="rounded-[12px] border border-black/10 bg-[#f7f7f6] p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Data trust</div><div className="mt-1 text-xl font-semibold text-[#202123]">{brief.dataTrustScore}</div></div><div className={`rounded-[12px] border p-3 ${trustClass}`}><div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Readiness</div><div className="mt-1 text-xl font-semibold">{brief.decisionReadinessScore}</div></div></div>
      </div>
      <div className="grid gap-3 border-t border-black/5 px-5 py-4 md:grid-cols-[1fr_220px]">
        <div className="grid gap-3 md:grid-cols-2">{primaryInsights.length > 0 ? primaryInsights.map(insight => <div key={insight.id} className="rounded-[12px] border border-amber-100 bg-amber-50 p-3 text-amber-900"><div className="mb-1 text-xs font-semibold">{insight.title}</div><p className="text-xs leading-5 opacity-90">{insight.statement}</p></div>) : <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">No immediate insight was produced. Open the deeper analysis panel for caveats and diagnostics.</div>}</div>
        <div className="flex flex-col justify-between gap-3 rounded-[12px] border border-black/5 bg-[#fbfbfa] p-3"><div><div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Decision caveat</div><p className="mt-1 line-clamp-3 text-xs leading-5 text-black/60">{brief.caveats[0] ?? 'Review the chart and evidence rows before using this result for an operational decision.'}</p></div><button onClick={onAnalyzeDeeper} disabled={!canAnalyzeDeeper} title={!canAnalyzeDeeper ? 'Run the governed analysis successfully before opening the deeper explanation.' : undefined} className="rounded-[10px] bg-[#202123] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">Analyze deeper</button></div>
      </div>
    </section>
  );
};
