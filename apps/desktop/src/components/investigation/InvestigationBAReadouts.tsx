import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';
import type { BADecisionBrief } from '../../lib/ba-decision-engine';
import type { BusinessFusionOverview, FusionMetricDelta } from '../../lib/business-fusion-overview';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';
import { formatValue } from '../../lib/display-formatter';
import type { DisplayPreferences } from '../../stores/display-preferences-store';
import { pickUiText, useUiLanguage, type UiLanguage } from '../../lib/ui-language';

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

function formatMetricDelta(metric: FusionMetricDelta | undefined, preferences: DisplayPreferences, language: UiLanguage): string {
  if (!metric) return pickUiText(language, 'Not enough evidence in the current files.', 'Các file hiện tại chưa có đủ bằng chứng.');
  const direction = metric.delta >= 0 ? 'increased' : 'decreased';
  const value = formatValue(Math.abs(metric.delta), 'currency', preferences, { compact: true });
  const percent = metric.deltaPercent === null ? 'n/a' : `${Math.round(metric.deltaPercent * 100)}%`;
  return pickUiText(language, `${metric.label} ${direction} ${value} (${percent}) versus the previous period.`, `${metric.label} ${metric.delta >= 0 ? 'tăng' : 'giảm'} ${value} (${percent}) so với kỳ trước.`);
}

function buildChartTrendStatement(chartModel: ChartPreviewModel | null, preferences: DisplayPreferences, language: UiLanguage): string | null {
  if (!chartModel?.xField || !chartModel.yField || chartModel.rows.length < 2) return null;
  const first = chartModel.rows[0];
  const last = chartModel.rows[chartModel.rows.length - 1];
  const firstValue = numberValue(first[chartModel.yField]);
  const lastValue = numberValue(last[chartModel.yField]);
  if (firstValue === null || lastValue === null) return null;
  const delta = lastValue - firstValue;
  const direction = delta >= 0 ? 'increased' : 'decreased';
  const percent = firstValue === 0 ? null : delta / Math.abs(firstValue);
  const firstText = formatValue(firstValue, 'currency', preferences, { compact: true });
  const lastText = formatValue(lastValue, 'currency', preferences, { compact: true });
  const suffix = percent === null ? '' : ` (${Math.round(percent * 100)}%)`;
  return pickUiText(language, `${chartModel.yField} ${direction} from ${firstText} at ${String(first[chartModel.xField])} to ${lastText} at ${String(last[chartModel.xField])}${suffix}.`, `${chartModel.yField} ${delta >= 0 ? 'tăng' : 'giảm'} từ ${firstText} tại ${String(first[chartModel.xField])} xuống ${lastText} tại ${String(last[chartModel.xField])}${suffix}.`);
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
  const { language, t, localize } = useUiLanguage();
  const intent = metricIntent(action, chartModel);
  const revenue = findOverviewMetric(overview, ['revenue', 'sales']);
  const profit = findOverviewMetric(overview, ['profit', 'gross profit', 'margin']);
  const quantity = findOverviewMetric(overview, ['quantity']);
  const delivery = findOverviewMetric(overview, ['delivery']);
  const trendStatement = buildChartTrendStatement(chartModel, preferences, language);
  const rankedRows = topChartRows(chartModel);
  const topRow = rankedRows[0];
  const bottomRow = [...rankedRows].sort((a, b) => a.value - b.value)[0];
  const productFallback = overview?.topGrowthDrivers[0] || overview?.topProfitDrivers[0];
  const focusTitle = intent === 'profitability' ? t('Profit and cash-flow focus', 'Trọng tâm lợi nhuận và dòng tiền') : intent === 'product' ? t('Product performance focus', 'Trọng tâm hiệu quả sản phẩm') : intent === 'operations' ? t('Operational movement focus', 'Trọng tâm biến động vận hành') : intent === 'money' ? t('Money trend focus', 'Trọng tâm xu hướng tài chính') : t('Selected decision angle focus', 'Trọng tâm góc nhìn đã chọn');
  const mainAnswer = intent === 'product' && (topRow || productFallback)
    ? topRow
      ? t(`${topRow.label} is the strongest item in this chart for ${topRow.field}, contributing ${formatValue(topRow.value, 'currency', preferences, { compact: true })}.`, `${topRow.label} là nhóm mạnh nhất trên biểu đồ theo ${topRow.field}, đóng góp ${formatValue(topRow.value, 'currency', preferences, { compact: true })}.`)
      : t(`${productFallback!.key} is the strongest product signal LightBI could safely rank for this angle, moving ${formatValue(productFallback!.delta, 'currency', preferences, { compact: true })}.`, `${productFallback!.key} là tín hiệu sản phẩm mạnh nhất LightBI có thể xếp hạng an toàn cho góc nhìn này, biến động ${formatValue(productFallback!.delta, 'currency', preferences, { compact: true })}.`)
    : intent === 'profitability' ? formatMetricDelta(profit || revenue, preferences, language) : trendStatement || formatMetricDelta(revenue || profit, preferences, language);
  const overviewLines = intent === 'profitability'
    ? [formatMetricDelta(profit, preferences, language), formatMetricDelta(revenue, preferences, language), quantity ? formatMetricDelta(quantity, preferences, language) : null].filter(Boolean) as string[]
    : intent === 'product'
      ? [
          topRow ? `Top chart item: ${topRow.label} at ${formatValue(topRow.value, 'currency', preferences, { compact: true })} for ${topRow.field}.` : 'Top product signal is ranked from the fused Sales, Accounting, and Logistics evidence for this same angle.',
          bottomRow && bottomRow.label !== topRow?.label ? `Weakest visible item: ${bottomRow.label} at ${formatValue(bottomRow.value, 'currency', preferences, { compact: true })}.` : null,
          productFallback && !topRow ? `Fallback product driver: ${productFallback.key} moved ${formatValue(productFallback.delta, 'currency', preferences, { compact: true })}.` : null,
          overview?.topProfitDrivers[0] ? `Profit leader for context: ${overview.topProfitDrivers[0].key} at ${formatValue(overview.topProfitDrivers[0].currentValue, 'currency', preferences, { compact: true })}.` : null,
        ].filter(Boolean) as string[]
      : [trendStatement || formatMetricDelta(revenue, preferences, language), profit ? formatMetricDelta(profit, preferences, language) : null, delivery ? formatMetricDelta(delivery, preferences, language) : null].filter(Boolean) as string[];
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">{t('Selected angle BA readout', 'Phân tích BA theo góc nhìn đã chọn')}</p>
        <h3 className="mt-1 text-lg font-semibold text-[#202123]">{focusTitle}</h3>
        <p className="mt-1 text-[12px] leading-5 text-black/55">{t('Angle', 'Góc nhìn')}: {localize(action.opportunityName)} · {t('Chart', 'Biểu đồ')}: {localize(chartModel?.title || action.label)} · {t('Main measure', 'Chỉ số chính')}: {chartModel?.yField || action.measures[0] || t('detected metric', 'chỉ số đã nhận diện')}</p>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-950"><p className="text-[13px] font-semibold">{t('Main answer', 'Câu trả lời chính')}</p><p className="mt-1 text-[13px] leading-6">{localize(mainAnswer)}</p></div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-950"><p className="text-[13px] font-semibold">{t('Why this chart exists', 'Vì sao dùng biểu đồ này')}</p><p className="mt-1 text-[13px] leading-6">{t(`LightBI selected ${chartModel?.chartType || 'this chart'} because the active angle combines ${action.dimensions.join(', ') || chartModel?.xField || 'a business dimension'} with ${action.measures.join(', ') || chartModel?.yField || 'a measurable outcome'}.`, `LightBI chọn ${chartModel?.chartType || 'biểu đồ này'} vì góc nhìn đang xét kết hợp ${action.dimensions.join(', ') || chartModel?.xField || 'một chiều kinh doanh'} với ${action.measures.join(', ') || chartModel?.yField || 'một kết quả có thể đo lường'}.`)}</p></div>
        <div className="rounded-lg border border-black/10 bg-white p-3"><p className="text-[13px] font-semibold text-[#202123]">{t('Overview analysis', 'Phân tích tổng quan')}</p><ul className="mt-2 space-y-1 text-[12px] leading-5 text-black/65">{overviewLines.length > 0 ? overviewLines.map(line => <li key={line}>- {localize(line)}</li>) : <li>{t('No overview line could be safely generated for this angle.', 'Chưa thể tạo nhận định tổng quan an toàn cho góc nhìn này.')}</li>}</ul></div>
        <div className="rounded-lg border border-black/10 bg-white p-3"><p className="text-[13px] font-semibold text-[#202123]">{t('Details and drivers', 'Chi tiết và tác nhân')}</p><ul className="mt-2 space-y-1 text-[12px] leading-5 text-black/65">{detailDrivers.length > 0 ? detailDrivers.slice(0, 6).map(line => <li key={line}>- {localize(line)}</li>) : <li>{t('No ranked driver was available for this chart.', 'Biểu đồ này chưa có tác nhân đủ bằng chứng để xếp hạng.')}</li>}</ul></div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-amber-950 lg:col-span-2"><p className="text-[13px] font-semibold">{t('Risk and caveat', 'Rủi ro và lưu ý')}</p><ul className="mt-2 space-y-1 text-[12px] leading-5 opacity-80">{riskLines.length > 0 ? riskLines.map(line => <li key={line}>- {localize(line)}</li>) : <li>{t('Use this as directional analysis until reconciliation, margin, and source-quality checks are reviewed.', 'Chỉ nên dùng kết quả này để định hướng cho đến khi hoàn tất đối soát, kiểm tra biên lợi nhuận và chất lượng nguồn.')}</li>}</ul></div>
      </div>
    </section>
  );
};

export const BasicBAAnswerCard: React.FC<{
  brief: BADecisionBrief;
  onAnalyzeDeeper: () => void;
  canAnalyzeDeeper: boolean;
}> = ({ brief, onAnalyzeDeeper, canAnalyzeDeeper }) => {
  const { t, localize } = useUiLanguage();
  const primaryInsights = brief.insights.slice(0, 2);
  return (
    <section className="mt-5 rounded-[16px] border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-violet-50 text-violet-600"><ClipboardCheck className="h-4 w-4" /></div><div><h3 className="text-sm font-semibold text-[#202123]">{t('BA answer', 'Câu trả lời BA')}</h3><p className="text-xs text-black/45">{t('Basic answer for this selected decision angle.', 'Câu trả lời cơ bản cho góc nhìn quyết định đã chọn.')}</p></div></div><p className="text-sm leading-6 text-slate-700">{localize(brief.executiveSummary)}</p></div>
      </div>
      <div className="grid gap-3 border-t border-black/5 px-5 py-4 md:grid-cols-[1fr_220px]">
        <div className="grid gap-3 md:grid-cols-2">{primaryInsights.length > 0 ? primaryInsights.map(insight => <div key={insight.id} className="rounded-[12px] border border-amber-100 bg-amber-50 p-3 text-amber-900"><div className="mb-1 text-xs font-semibold">{localize(insight.title)}</div><p className="text-xs leading-5 opacity-90">{localize(insight.statement)}</p></div>) : <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">{t('No immediate insight was produced. Open the deeper analysis panel for caveats and diagnostics.', 'Chưa có phát hiện tức thời. Mở phân tích sâu để xem lưu ý và chẩn đoán.')}</div>}</div>
        <div className="flex flex-col justify-between gap-3 rounded-[12px] border border-black/5 bg-[#fbfbfa] p-3"><div><div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">{t('Decision caveat', 'Lưu ý quyết định')}</div><p className="mt-1 line-clamp-3 text-xs leading-5 text-black/60">{localize(brief.caveats[0] ?? t('Review the chart and evidence rows before using this result for an operational decision.', 'Xem lại biểu đồ và các dòng bằng chứng trước khi dùng kết quả cho quyết định vận hành.'))}</p></div><button onClick={onAnalyzeDeeper} disabled={!canAnalyzeDeeper} title={!canAnalyzeDeeper ? t('Run the governed analysis successfully before opening the deeper explanation.', 'Cần chạy phân tích có quản trị thành công trước khi mở giải thích sâu.') : undefined} className="rounded-[10px] bg-[#202123] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">{t('Analyze deeper', 'Phân tích sâu')}</button></div>
      </div>
    </section>
  );
};
