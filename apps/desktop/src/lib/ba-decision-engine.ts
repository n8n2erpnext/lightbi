import type { RuntimeIntent } from './analysis-runtime-contract';
import type { AISafeBriefing } from './ai-briefing-contract';
import type { ChartPreviewModel } from './chart-preview-model';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { RuntimeRowScope } from './runtime-dataset-source';

export type BAInsightType =
  | 'top_concentration'
  | 'bottom_group'
  | 'segment_spread'
  | 'trend'
  | 'outlier'
  | 'distribution'
  | 'data_quality'
  | 'key_risk'
  | 'field_gap'
  | 'coverage';

export type BAInsightSeverity = 'positive' | 'neutral' | 'warning' | 'critical';
export type BAChartHint = 'bar' | 'line' | 'scatter' | 'table';

export interface BAInsight {
  id: string;
  type: BAInsightType;
  title: string;
  statement: string;
  severity: BAInsightSeverity;
  confidence: number;
  evidence: string[];
  evidenceRows?: BARowEvidence[];
  chartHint: BAChartHint;
}

export interface BARowEvidence {
  rowIndex: number;
  label: string;
  values: Record<string, unknown>;
}

export interface BAScoreBreakdownItem {
  label: string;
  score: number;
  weight: number;
  reason: string;
}

export interface BAChartRecommendation {
  title: string;
  chartType: BAChartHint;
  reason: string;
  fields: string[];
}

export interface BADecisionSuggestion {
  title: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface BADecisionBrief {
  dataTrustScore: number;
  decisionReadinessScore: number;
  executiveSummary: string;
  scoreBreakdown: BAScoreBreakdownItem[];
  insights: BAInsight[];
  recommendedCharts: BAChartRecommendation[];
  decisionSuggestions: BADecisionSuggestion[];
  caveats: string[];
}

export interface CreateBADecisionBriefInput {
  datasetId: string;
  previewResult: DuckDBPreviewResult | null;
  chartModel: ChartPreviewModel | null;
  aiBriefing?: AISafeBriefing;
  runtimeIntent: RuntimeIntent;
  governedContext?: {
    metricId: string;
    businessPerspectiveIds: string[];
    evidenceIds: string[];
    limitations: string[];
    restrictions: string[];
    fullFileRowCount: number | null;
    decisionUseAuthorized: boolean;
  };
}

export interface CreatePreExecutionBADecisionBriefInput {
  datasetId: string;
  rows?: Record<string, unknown>[];
  aiBriefing?: AISafeBriefing;
  runtimeIntent: RuntimeIntent;
  rowScope?: RuntimeRowScope;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/,/g, '').trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function buildRowEvidence(
  rows: Record<string, unknown>[],
  rowIndexes: number[],
  fields: string[]
): BARowEvidence[] {
  return rowIndexes
    .filter(index => index >= 0 && index < rows.length)
    .slice(0, 5)
    .map(index => ({
      rowIndex: index,
      label: `Row ${index + 1}`,
      values: Object.fromEntries(fields.filter(field => field in rows[index]).map(field => [field, rows[index][field]]))
    }));
}

function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  const position = (sortedValues.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const next = sortedValues[base + 1];
  if (next === undefined) return sortedValues[base] ?? 0;
  return (sortedValues[base] ?? 0) + rest * (next - (sortedValues[base] ?? 0));
}

function normalizedName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function formatGroupLabel(value: unknown, field: string): string {
  if (isEmpty(value)) return '(empty)';
  const normalizedField = normalizedName(field);
  const timeLike = ['date', 'time', 'period', 'month', 'year'].some(token => normalizedField.includes(token));
  if (timeLike) {
    const epoch = typeof value === 'number' ? value : typeof value === 'string' && /^\d{12,13}$/.test(value) ? Number(value) : null;
    if (epoch !== null && Number.isFinite(epoch)) {
      const date = new Date(epoch);
      if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function normalizedLoose(value: string): string {
  return normalizedName(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const DOMAIN_REQUIRED_FIELD_RULES = [
  {
    domain: 'finance',
    label: 'profitability decision',
    requiredAny: [
      ['revenue', 'sales', 'doanh thu', 'amount', 'thanh tien', 'thành tiền'],
      ['cost', 'gia von', 'giá vốn', 'purchase_cost', 'expense', 'chi phi', 'chi phí']
    ]
  },
  {
    domain: 'revenue',
    label: 'revenue performance decision',
    requiredAny: [
      ['revenue', 'sales', 'doanh thu', 'amount', 'thanh tien', 'thành tiền'],
      ['order', 'don hang', 'đơn hàng', 'customer', 'khach hang', 'khách hàng', 'product', 'sku']
    ]
  },
  {
    domain: 'inventory',
    label: 'inventory decision',
    requiredAny: [
      ['sku', 'product', 'ma hang', 'mã hàng', 'item'],
      ['stock', 'ton', 'tồn', 'quantity', 'qty', 'so luong', 'số lượng'],
      ['warehouse', 'kho', 'branch', 'buu cuc', 'bưu cục']
    ]
  },
  {
    domain: 'operations',
    label: 'operations decision',
    requiredAny: [
      ['route', 'tuyen', 'tuyến', 'driver', 'tai xe', 'tài xế', 'warehouse', 'kho'],
      ['status', 'trang thai', 'trạng thái', 'sla', 'delay', 'cham', 'chậm']
    ]
  }
] as const;

function hasAnySignal(
  columns: string[],
  aiBriefing: AISafeBriefing | undefined,
  aliases: readonly string[]
): boolean {
  const normalizedAliases = aliases.map(normalizedName);
  const normalizedColumns = columns.map(normalizedName);
  const normalizedSignals = (aiBriefing?.semanticFields ?? []).map(field => normalizedName(`${field.canonicalId} ${field.label} ${field.domain}`));
  return normalizedAliases.some(alias =>
    normalizedColumns.some(column => column.includes(alias)) ||
    normalizedSignals.some(signal => signal.includes(alias))
  );
}

function detectedDomains(aiBriefing: AISafeBriefing | undefined): string[] {
  const domains = new Set((aiBriefing?.semanticFields ?? [])
    .map(field => field.domain)
    .filter(domain => domain && domain !== 'general'));
  return Array.from(domains);
}

function rowScopeLabel(scope?: RuntimeRowScope): string {
  switch (scope) {
    case 'full_file':
      return 'full file';
    case 'retained_rows':
      return 'retained rows';
    case 'semantic_sample':
      return 'representative sample';
    case 'preview':
      return 'preview rows';
    default:
      return 'available profile rows';
  }
}

function numericCoverage(rows: Record<string, unknown>[], field: string): number {
  if (rows.length === 0) return 0;
  return rows.filter(row => toNumber(row[field]) !== null).length / rows.length;
}

function emptyCoverage(rows: Record<string, unknown>[], field: string): number {
  if (rows.length === 0) return 0;
  return rows.filter(row => isEmpty(row[field])).length / rows.length;
}

function selectNumericField(
  rows: Record<string, unknown>[],
  columns: string[],
  chartModel: ChartPreviewModel | null
): string | null {
  const preferred = chartModel?.yField ?? chartModel?.seriesFields?.[0];
  const isRateLike = (field: string) => /(rate|ratio|share|pct|percent)/.test(normalizedLoose(field));
  if (preferred && numericCoverage(rows, preferred) >= 0.6 && !isRateLike(preferred)) return preferred;
  if (preferred && isRateLike(preferred)) {
    const nonRatePreferred = (chartModel?.seriesFields ?? [])
      .find(field => field !== preferred && !isRateLike(field) && numericCoverage(rows, field) >= 0.6);
    if (nonRatePreferred) return nonRatePreferred;
  }

  const ranked = columns
    .map(field => ({ field, coverage: numericCoverage(rows, field) }))
    .filter(item => item.coverage >= 0.6)
    .sort((a, b) => {
      const aRate = isRateLike(a.field) ? 1 : 0;
      const bRate = isRateLike(b.field) ? 1 : 0;
      if (aRate !== bRate) return aRate - bRate;
      return b.coverage - a.coverage;
    });

  return ranked[0]?.field ?? null;
}

function firstAvailableField(rows: Record<string, unknown>[], candidates: string[]): string | null {
  const rowKeys = new Set(rows.flatMap(row => Object.keys(row)));
  return candidates.find(candidate => rowKeys.has(candidate)) ?? null;
}

function inferColumns(rows: Record<string, unknown>[]): string[] {
  return Array.from(new Set(rows.flatMap(row => Object.keys(row))));
}

function buildPreExecutionRows(
  rows: Record<string, unknown>[],
  runtimeIntent: RuntimeIntent
): { columns: string[]; rows: Record<string, unknown>[] } {
  const sourceRows = rows.slice(0, 1000);
  const columns = inferColumns(sourceRows);
  const dimension = firstAvailableField(sourceRows, runtimeIntent.dimensions) ?? columns.find(column => numericCoverage(sourceRows, column) < 0.6) ?? columns[0];
  const measure = firstAvailableField(sourceRows, runtimeIntent.measures) ?? columns.find(column => numericCoverage(sourceRows, column) >= 0.6);

  if (!dimension) {
    return { columns, rows: sourceRows.slice(0, 100) };
  }

  if (runtimeIntent.type === 'distribution' || !measure || measure === 'record_count') {
    const grouped = new Map<string, Record<string, unknown>>();
    for (const row of sourceRows) {
      const label = isEmpty(row[dimension]) ? '(empty)' : String(row[dimension]);
      const current = grouped.get(label) ?? { [dimension]: label, row_count: 0 };
      current.row_count = Number(current.row_count ?? 0) + 1;
      grouped.set(label, current);
    }
    return {
      columns: [dimension, 'row_count'],
      rows: Array.from(grouped.values())
        .sort((a, b) => Number(b.row_count ?? 0) - Number(a.row_count ?? 0))
        .slice(0, 25)
    };
  }

  if (runtimeIntent.type === 'trend') {
    const grouped = new Map<string, Record<string, unknown>>();
    for (const row of sourceRows) {
      const label = formatGroupLabel(row[dimension], dimension);
      const current = grouped.get(label) ?? { [dimension]: label, [`${measure}_sum`]: 0 };
      current[`${measure}_sum`] = Number(current[`${measure}_sum`] ?? 0) + (toNumber(row[measure]) ?? 0);
      grouped.set(label, current);
    }
    return {
      columns: [dimension, `${measure}_sum`],
      rows: Array.from(grouped.values())
        .sort((a, b) => String(a[dimension] ?? '').localeCompare(String(b[dimension] ?? '')))
        .slice(0, 50)
    };
  }

  if (runtimeIntent.type === 'relationship') {
    const measureFields = runtimeIntent.measures
      .map(field => firstAvailableField(sourceRows, [field]))
      .filter((field): field is string => Boolean(field))
      .slice(0, 2);
    if (measureFields.length >= 2) {
      return {
        columns: measureFields,
        rows: sourceRows
          .filter(row => measureFields.every(field => toNumber(row[field]) !== null))
          .slice(0, 100)
          .map(row => Object.fromEntries(measureFields.map(field => [field, row[field]])))
      };
    }
  }

  const grouped = new Map<string, Record<string, unknown>>();
  for (const row of sourceRows) {
    const label = isEmpty(row[dimension]) ? '(empty)' : String(row[dimension]);
    const current = grouped.get(label) ?? { [dimension]: label, [`${measure}_sum`]: 0 };
    current[`${measure}_sum`] = Number(current[`${measure}_sum`] ?? 0) + (toNumber(row[measure]) ?? 0);
    grouped.set(label, current);
  }
  return {
    columns: [dimension, `${measure}_sum`],
    rows: Array.from(grouped.values())
      .sort((a, b) => Number(b[`${measure}_sum`] ?? 0) - Number(a[`${measure}_sum`] ?? 0))
      .slice(0, 25)
  };
}

function selectCategoryField(
  rows: Record<string, unknown>[],
  columns: string[],
  numericField: string | null,
  chartModel: ChartPreviewModel | null
): string | null {
  if (chartModel?.xField && chartModel.xField !== numericField) return chartModel.xField;

  const ranked = columns
    .filter(field => field !== numericField && numericCoverage(rows, field) < 0.6)
    .map(field => {
      const values = rows
        .map(row => row[field])
        .filter(value => !isEmpty(value))
        .map(value => String(value));
      const distinctCount = new Set(values).size;
      const emptyRatio = emptyCoverage(rows, field);
      const usable = distinctCount >= 2 && distinctCount <= Math.max(12, Math.floor(rows.length * 0.7));
      return {
        field,
        score: usable ? 100 - distinctCount - emptyRatio * 40 : 0
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.field ?? null;
}

function selectKeyRiskField(
  rows: Record<string, unknown>[],
  columns: string[],
  preferredField: string | null
): string | null {
  if (preferredField) return preferredField;

  const idLike = columns
    .map(field => {
      const normalized = normalizedName(field);
      const values = rows.map(row => row[field]).filter(value => !isEmpty(value));
      const distinctRatio = rows.length > 0 ? new Set(values.map(value => String(value))).size / rows.length : 0;
      const nameScore = ['id', 'ma', 'code', 'key', 'so chung tu', 'document', 'order'].some(token => normalized.includes(token)) ? 40 : 0;
      return { field, score: nameScore + distinctRatio * 60 };
    })
    .filter(item => item.score >= 45)
    .sort((a, b) => b.score - a.score);

  return idLike[0]?.field ?? null;
}

function mineTopConcentrationInsight(
  rows: Record<string, unknown>[],
  categoryField: string | null,
  numericField: string | null
): BAInsight | null {
  if (!categoryField || !numericField || rows.length === 0) return null;

  const values = rows
    .map(row => ({
      label: formatGroupLabel(row[categoryField], categoryField),
      value: toNumber(row[numericField]) ?? 0
    }))
    .filter(item => Number.isFinite(item.value));

  if (values.length < 2) return null;

  const sorted = [...values].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const top = sorted[0];
  const top3 = sorted.slice(0, 3);
  const topShare = total > 0 ? Math.max(0, top.value) / total : 0;
  const top3Share = total > 0 ? top3.reduce((sum, item) => sum + Math.max(0, item.value), 0) / total : 0;
  const severity: BAInsightSeverity = topShare >= 0.5 || top3Share >= 0.75 ? 'warning' : 'neutral';

  return {
    id: 'ba_top_concentration',
    type: 'top_concentration',
    title: `Top ${categoryField} drives ${numericField}`,
    statement: `${top.label} is the largest contributor for ${numericField}.`,
    severity,
    confidence: clampScore(70 + Math.min(20, values.length * 2)),
    evidence: [
      `${top.label}: ${formatNumber(top.value)}`,
      total > 0 ? `Top share: ${formatPercent(topShare)}` : 'Total is zero or unavailable',
      total > 0 ? `Top 3 share: ${formatPercent(top3Share)}` : `Compared across ${values.length} groups`
    ],
    chartHint: 'bar'
  };
}

function findFieldByLooseName(columns: string[], target: string): string | null {
  const normalizedTarget = normalizedLoose(target);
  return columns.find(column => normalizedLoose(column) === normalizedTarget)
    ?? columns.find(column => normalizedLoose(column).includes(normalizedTarget) || normalizedTarget.includes(normalizedLoose(column)))
    ?? null;
}

function minePositiveRateInsight(
  rows: Record<string, unknown>[],
  columns: string[],
  categoryField: string | null,
  runtimeIntent: RuntimeIntent
): BAInsight | null {
  const measure = runtimeIntent.derivedMeasures?.find(item => item.type === 'positive_rate');
  if (!measure || !categoryField || rows.length === 0) return null;

  const numeratorField = findFieldByLooseName(columns, measure.numeratorLabel);
  const denominatorField = findFieldByLooseName(columns, measure.denominatorLabel);
  if (!numeratorField || !denominatorField) return null;

  const values = rows
    .map(row => {
      const numerator = toNumber(row[numeratorField]) ?? 0;
      const denominator = toNumber(row[denominatorField]) ?? 0;
      return {
        label: formatGroupLabel(row[categoryField], categoryField),
        numerator,
        denominator,
        rate: denominator > 0 ? numerator / denominator : 0
      };
    })
    .filter(item => item.denominator > 0);
  if (values.length === 0) return null;

  const totalNumerator = values.reduce((sum, item) => sum + item.numerator, 0);
  const totalDenominator = values.reduce((sum, item) => sum + item.denominator, 0);
  if (totalDenominator <= 0) return null;

  const positiveRows = values.filter(item => item.numerator > 0).sort((a, b) => b.numerator - a.numerator);
  const lead = positiveRows[0] ?? values.sort((a, b) => b.denominator - a.denominator)[0];
  const overallRate = totalNumerator / totalDenominator;
  const severity: BAInsightSeverity = overallRate >= 0.9 ? 'positive' : overallRate >= 0.75 ? 'neutral' : 'warning';

  return {
    id: 'ba_positive_rate_mix',
    type: 'distribution',
    title: `${measure.label} by ${categoryField}`,
    statement: `${lead.label} has ${formatNumber(lead.numerator)} positive row${lead.numerator === 1 ? '' : 's'}; overall positive rate is ${formatPercent(overallRate)}.`,
    severity,
    confidence: clampScore(76 + Math.min(18, values.length * 3)),
    evidence: [
      `${lead.label}: ${formatNumber(lead.numerator)} / ${formatNumber(lead.denominator)} (${formatPercent(lead.rate)})`,
      `Overall: ${formatNumber(totalNumerator)} / ${formatNumber(totalDenominator)} (${formatPercent(overallRate)})`,
      `Compared across ${values.length} ${categoryField} group${values.length === 1 ? '' : 's'}`
    ],
    chartHint: 'bar'
  };
}

function mineBottomInsight(
  rows: Record<string, unknown>[],
  categoryField: string | null,
  numericField: string | null
): BAInsight | null {
  if (!categoryField || !numericField || rows.length < 3) return null;

  const values = rows
    .map(row => ({
      label: formatGroupLabel(row[categoryField], categoryField),
      value: toNumber(row[numericField])
    }))
    .filter((item): item is { label: string; value: number } => item.value !== null);

  if (values.length < 3) return null;

  const sorted = [...values].sort((a, b) => a.value - b.value);
  const bottom = sorted[0];
  const median = sorted[Math.floor(sorted.length / 2)]?.value ?? bottom.value;
  const gap = median !== 0 ? (median - bottom.value) / Math.abs(median) : 0;

  return {
    id: 'ba_bottom_group',
    type: 'bottom_group',
    title: `Lowest ${categoryField} by ${numericField}`,
    statement: `${bottom.label} is the weakest group in this preview result.`,
    severity: gap > 0.5 ? 'warning' : 'neutral',
    confidence: clampScore(65 + Math.min(20, values.length * 2)),
    evidence: [
      `${bottom.label}: ${formatNumber(bottom.value)}`,
      `Median group value: ${formatNumber(median)}`,
      gap > 0 ? `Gap to median: ${formatPercent(gap)}` : 'Gap to median is small or unavailable'
    ],
    chartHint: 'bar'
  };
}

function mineSegmentSpreadInsight(
  rows: Record<string, unknown>[],
  categoryField: string | null,
  numericField: string | null
): BAInsight | null {
  if (!categoryField || !numericField || rows.length < 4) return null;

  const values = rows
    .map(row => ({
      label: formatGroupLabel(row[categoryField], categoryField),
      value: toNumber(row[numericField])
    }))
    .filter((item): item is { label: string; value: number } => item.value !== null)
    .sort((a, b) => b.value - a.value);

  if (values.length < 4) return null;

  const highest = values[0];
  const lowest = values[values.length - 1];
  const median = values[Math.floor(values.length / 2)];
  if (!highest || !lowest || !median || median.value === 0) return null;

  const topToMedian = (highest.value - median.value) / Math.abs(median.value);
  const topToBottom = lowest.value !== 0 ? (highest.value - lowest.value) / Math.abs(lowest.value) : 0;
  if (topToMedian < 0.5 && topToBottom < 1) return null;

  return {
    id: 'ba_segment_spread',
    type: 'segment_spread',
    title: `Segment spread in ${categoryField}`,
    statement: `${numericField} varies sharply across ${categoryField} segments.`,
    severity: topToMedian >= 2 || topToBottom >= 5 ? 'warning' : 'neutral',
    confidence: clampScore(72 + Math.min(18, values.length * 2)),
    evidence: [
      `Highest: ${highest.label} = ${formatNumber(highest.value)}`,
      `Median segment: ${median.label} = ${formatNumber(median.value)}`,
      `Lowest: ${lowest.label} = ${formatNumber(lowest.value)}`
    ],
    chartHint: 'bar'
  };
}

function mineOutlierInsight(
  rows: Record<string, unknown>[],
  categoryField: string | null,
  numericField: string | null
): BAInsight | null {
  if (!numericField || rows.length < 6) return null;

  const values = rows
    .map((row, index) => ({
      index,
      label: categoryField ? formatGroupLabel(row[categoryField], categoryField) : `row ${index + 1}`,
      value: toNumber(row[numericField])
    }))
    .filter((item): item is { index: number; label: string; value: number } => item.value !== null)
    .sort((a, b) => a.value - b.value);

  if (values.length < 6) return null;

  const numericValues = values.map(item => item.value);
  const q1 = quantile(numericValues, 0.25);
  const q3 = quantile(numericValues, 0.75);
  const iqr = q3 - q1;
  if (iqr <= 0) return null;

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = values.filter(item => item.value < lowerFence || item.value > upperFence);
  if (outliers.length === 0) return null;

  const highest = outliers.reduce((max, item) => Math.abs(item.value) > Math.abs(max.value) ? item : max, outliers[0]);
  const outlierRatio = outliers.length / values.length;
  const severity: BAInsightSeverity = outlierRatio >= 0.15 ? 'critical' : 'warning';

  return {
    id: 'ba_outlier_risk',
    type: 'outlier',
    title: `Outlier risk in ${numericField}`,
    statement: `${outliers.length} unusual value${outliers.length > 1 ? 's' : ''} may distort this analysis.`,
    severity,
    confidence: clampScore(78 + Math.min(15, values.length)),
    evidence: [
      `Most extreme: ${highest.label} = ${formatNumber(highest.value)}`,
      `Expected range: ${formatNumber(lowerFence)} to ${formatNumber(upperFence)}`,
      `Outlier ratio: ${formatPercent(outlierRatio)}`
    ],
    evidenceRows: buildRowEvidence(rows, outliers.map(item => item.index), [categoryField, numericField].filter((field): field is string => Boolean(field))),
    chartHint: 'table'
  };
}

function mineKeyRiskInsight(
  rows: Record<string, unknown>[],
  columns: string[],
  preferredField: string | null
): BAInsight | null {
  if (rows.length < 3) return null;
  const field = selectKeyRiskField(rows, columns, preferredField);
  if (!field) return null;

  const values = rows.map(row => row[field]);
  const nonEmptyValues = values.filter(value => !isEmpty(value)).map(value => String(value));
  if (nonEmptyValues.length === 0) return null;

  const counts = new Map<string, number>();
  for (const value of nonEmptyValues) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const duplicateEntries = Array.from(counts.entries()).filter(([, count]) => count > 1);
  const duplicateValues = new Set(duplicateEntries.map(([value]) => value));
  const riskyRowIndexes = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => isEmpty(row[field]) || duplicateValues.has(String(row[field])))
    .map(({ index }) => index);
  const duplicateRowCount = duplicateEntries.reduce((sum, [, count]) => sum + count, 0);
  const duplicateRatio = duplicateRowCount / rows.length;
  const emptyRatio = emptyCoverage(rows, field);

  if (duplicateRatio < 0.05 && emptyRatio < 0.05) return null;

  const leadingDuplicate = duplicateEntries.sort((a, b) => b[1] - a[1])[0];
  const severity: BAInsightSeverity = duplicateRatio >= 0.2 || emptyRatio >= 0.2 ? 'critical' : 'warning';

  return {
    id: 'ba_key_risk',
    type: 'key_risk',
    title: `Key risk in ${field}`,
    statement: `${field} may not be reliable as a decision key.`,
    severity,
    confidence: clampScore(80 - Math.min(25, (duplicateRatio + emptyRatio) * 50)),
    evidence: [
      `Duplicate rows: ${formatPercent(duplicateRatio)}`,
      `Empty rows: ${formatPercent(emptyRatio)}`,
      leadingDuplicate ? `Most repeated value: ${leadingDuplicate[0]} (${leadingDuplicate[1]} rows)` : 'No repeated non-empty value dominates'
    ],
    evidenceRows: buildRowEvidence(rows, riskyRowIndexes, [field]),
    chartHint: 'table'
  };
}

function mineRequiredFieldGapInsight(
  columns: string[],
  aiBriefing: AISafeBriefing | undefined,
  runtimeIntent: RuntimeIntent
): BAInsight | null {
  const domains = detectedDomains(aiBriefing);
  const relevantRules = DOMAIN_REQUIRED_FIELD_RULES.filter(rule => domains.includes(rule.domain));
  if (relevantRules.length === 0) return null;

  const missing: string[] = [];
  for (const rule of relevantRules) {
    for (const group of rule.requiredAny) {
      if (!hasAnySignal(columns, aiBriefing, group)) {
        missing.push(`${rule.label}: ${group.slice(0, 3).join(' / ')}`);
      }
    }
  }

  if (missing.length === 0) return null;

  const severity: BAInsightSeverity = missing.length >= 2 ? 'critical' : 'warning';
  const actionContext = runtimeIntent.type.replace(/_/g, ' ');

  return {
    id: 'ba_required_field_gap',
    type: 'field_gap',
    title: 'Missing business fields',
    statement: `This ${actionContext} result may be technically clean but incomplete for the detected business decision.`,
    severity,
    confidence: clampScore(82 - missing.length * 8),
    evidence: missing.slice(0, 4),
    chartHint: 'table'
  };
}

function mineTrendInsight(
  rows: Record<string, unknown>[],
  xField: string | null | undefined,
  numericField: string | null,
  runtimeIntent: RuntimeIntent,
  chartModel: ChartPreviewModel | null
): BAInsight | null {
  if (!numericField || rows.length < 2) return null;
  if (runtimeIntent.type !== 'trend' && chartModel?.chartType !== 'line') return null;

  const start = toNumber(rows[0]?.[numericField]);
  const end = toNumber(rows[rows.length - 1]?.[numericField]);
  if (start === null || end === null) return null;

  const delta = end - start;
  const deltaRatio = start !== 0 ? delta / Math.abs(start) : 0;
  const direction = delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'remained flat';
  const severity: BAInsightSeverity = delta > 0 ? 'positive' : delta < 0 ? 'warning' : 'neutral';
  const fromLabel = xField ? formatGroupLabel(rows[0]?.[xField], xField) : 'first period';
  const toLabel = xField ? formatGroupLabel(rows[rows.length - 1]?.[xField], xField) : 'last period';

  return {
    id: 'ba_trend_direction',
    type: 'trend',
    title: `${numericField} ${direction}`,
    statement: `${numericField} ${direction} from ${fromLabel} to ${toLabel}.`,
    severity,
    confidence: clampScore(70 + Math.min(20, rows.length * 2)),
    evidence: [
      `${fromLabel}: ${formatNumber(start)}`,
      `${toLabel}: ${formatNumber(end)}`,
      start !== 0 ? `Change: ${formatPercent(deltaRatio)}` : `Absolute change: ${formatNumber(delta)}`
    ],
    chartHint: 'line'
  };
}

function minePeriodOverPeriodInsight(
  rows: Record<string, unknown>[],
  xField: string | null | undefined,
  numericField: string | null,
  runtimeIntent: RuntimeIntent,
  chartModel: ChartPreviewModel | null
): BAInsight | null {
  if (!numericField || rows.length < 3) return null;
  if (runtimeIntent.type !== 'trend' && chartModel?.chartType !== 'line') return null;

  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const latestValue = toNumber(latest?.[numericField]);
  const previousValue = toNumber(previous?.[numericField]);
  if (latestValue === null || previousValue === null) return null;

  const delta = latestValue - previousValue;
  const ratio = previousValue !== 0 ? delta / Math.abs(previousValue) : 0;
  if (Math.abs(delta) < 1e-9) return null;

  const latestLabel = xField ? formatGroupLabel(latest?.[xField], xField) : 'latest period';
  const previousLabel = xField ? formatGroupLabel(previous?.[xField], xField) : 'previous period';
  const direction = delta > 0 ? 'increased' : 'decreased';
  const severity: BAInsightSeverity = delta > 0 ? 'positive' : 'warning';

  return {
    id: 'ba_period_over_period',
    type: 'trend',
    title: `Latest period ${direction}`,
    statement: `${numericField} ${direction} in the latest period compared with the previous period.`,
    severity,
    confidence: clampScore(72 + Math.min(18, rows.length * 2)),
    evidence: [
      `${previousLabel}: ${formatNumber(previousValue)}`,
      `${latestLabel}: ${formatNumber(latestValue)}`,
      previousValue !== 0 ? `Period change: ${formatPercent(ratio)}` : `Absolute change: ${formatNumber(delta)}`
    ],
    chartHint: 'line'
  };
}

function mineCoverageInsight(previewResult: DuckDBPreviewResult): BAInsight | null {
  if (previewResult.rowCount <= previewResult.rows.length && !previewResult.executionScope) return null;

  const displayed = previewResult.rows.length;
  const total = previewResult.rowCount;
  const scope = previewResult.executionScope === 'full_file'
    ? 'full file'
    : previewResult.executionScope === 'semantic_sample'
      ? 'representative sample'
      : previewResult.executionScope === 'retained_rows'
        ? 'retained rows'
        : 'preview rows';

  return {
    id: 'ba_coverage',
    type: 'coverage',
    title: 'Result coverage',
    statement: `This decision brief is based on ${scope} execution.`,
    severity: previewResult.executionScope === 'full_file' ? 'positive' : 'warning',
    confidence: previewResult.executionScope === 'full_file' ? 90 : 68,
    evidence: [
      `Rows returned: ${formatNumber(displayed)}`,
      `Reported row count: ${formatNumber(total)}`,
      `Execution scope: ${scope}`
    ],
    chartHint: 'table'
  };
}

function mineDataQualityInsight(aiBriefing?: AISafeBriefing): BAInsight | null {
  if (!aiBriefing?.caveats?.length) return null;
  const critical = aiBriefing.readinessScore < 60;

  return {
    id: 'ba_data_quality',
    type: 'data_quality',
    title: 'Data reliability caveats',
    statement: 'LightBI found caveats that may affect the decision.',
    severity: critical ? 'critical' : 'warning',
    confidence: clampScore(100 - Math.min(40, aiBriefing.caveats.length * 8)),
    evidence: aiBriefing.caveats.slice(0, 3),
    chartHint: 'table'
  };
}

function mineSemanticCoverageGapInsight(aiBriefing?: AISafeBriefing): BAInsight | null {
  const coverage = aiBriefing?.semanticCoverage;
  if (!coverage || coverage.unknownBusinessLike === 0) return null;

  const columns = coverage.unknownBusinessLikeColumns.slice(0, 5);
  const extraCount = Math.max(0, coverage.unknownBusinessLikeColumns.length - columns.length);

  return {
    id: 'ba_semantic_coverage_gap',
    type: 'field_gap',
    title: 'Semantic coverage gap',
    statement: `${coverage.unknownBusinessLike} populated business-like column(s) were kept for review because LightBI has not mapped them to safe canonical signals yet.`,
    severity: coverage.coverageScore < 70 ? 'critical' : 'warning',
    confidence: clampScore(100 - coverage.coverageScore),
    evidence: [
      `Coverage score: ${coverage.coverageScore}/100`,
      `Unmapped business-like: ${columns.join(', ')}${extraCount > 0 ? `, and ${extraCount} more` : ''}`,
      `Recognized columns: ${coverage.recognized}/${coverage.nonEmptyColumns}`
    ],
    chartHint: 'table'
  };
}

function insightPriority(insight: BAInsight): number {
  const severityScore = insight.severity === 'critical' ? 40 : insight.severity === 'warning' ? 28 : insight.severity === 'positive' ? 18 : 12;
  const typeScore: Record<BAInsightType, number> = {
    field_gap: 35,
    key_risk: 34,
    outlier: 32,
    segment_spread: 30,
    top_concentration: 26,
    trend: 24,
    bottom_group: 20,
    data_quality: 18,
    coverage: 8,
    distribution: 10
  };
  return severityScore + typeScore[insight.type] + Math.round(insight.confidence / 20);
}

function buildRecommendedCharts(chartModel: ChartPreviewModel | null, insights: BAInsight[]): BAChartRecommendation[] {
  const charts: BAChartRecommendation[] = [];
  if (chartModel && chartModel.status === 'ready' && chartModel.chartType !== 'table') {
    charts.push({
      title: chartModel.title,
      chartType: chartModel.chartType,
      reason: 'Primary chart generated from the executed preview result.',
      fields: [chartModel.xField, chartModel.yField, ...chartModel.seriesFields].filter(Boolean) as string[]
    });
  }

  const rankedInsights = [...insights].sort((a, b) => insightPriority(b) - insightPriority(a));
  for (const insight of rankedInsights) {
    if (charts.length >= 3) break;
    if (charts.some(chart => chart.chartType === insight.chartHint && chart.title === insight.title)) continue;
    charts.push({
      title: insight.title,
      chartType: insight.chartHint,
      reason: insight.statement,
      fields: []
    });
  }

  return charts;
}

function buildDecisionSuggestions(
  dataTrustScore: number,
  decisionReadinessScore: number,
  insights: BAInsight[],
  runtimeIntent: RuntimeIntent
): BADecisionSuggestion[] {
  const suggestions: BADecisionSuggestion[] = [];
  const hasKeyRisk = insights.some(insight => insight.type === 'key_risk');
  const hasOutlierRisk = insights.some(insight => insight.type === 'outlier');
  const hasFieldGap = insights.some(insight => insight.type === 'field_gap');
  const hasSemanticCoverageGap = insights.some(insight => insight.id === 'ba_semantic_coverage_gap');

  if (decisionReadinessScore >= 80) {
    suggestions.push({
      title: 'Use as decision support',
      action: 'Use the highlighted insight and chart as a decision-support view, then validate the top/bottom groups with raw rows before acting.',
      priority: 'high'
    });
  } else {
    suggestions.push({
      title: 'Validate before deciding',
      action: 'Treat this as an exploration result. Review caveats and raw rows before using it for an operational or financial decision.',
      priority: 'high'
    });
  }

  if (insights.some(insight => insight.severity === 'warning' || insight.severity === 'critical')) {
    suggestions.push({
      title: 'Investigate risk drivers',
      action: hasSemanticCoverageGap
        ? 'Review the unmapped business-like columns before trusting the BA answer; the data exists but LightBI has not safely understood those fields yet.'
        : hasFieldGap
        ? 'Confirm the missing business fields before using this result as a decision answer.'
        : hasKeyRisk
        ? 'Check duplicate or empty key values before trusting grouped totals, joins, or record counts.'
        : hasOutlierRisk
          ? 'Inspect unusual values before using totals or averages for business decisions.'
          : 'Start with the warning insight, then filter by the affected group/time period to identify the root cause.',
      priority: 'medium'
    });
  }

  if (runtimeIntent.type !== 'trend' && runtimeIntent.dimensions.length > 0) {
    suggestions.push({
      title: 'Compare over time if possible',
      action: 'If the source contains a date column, run a trend view to confirm whether this pattern is stable or only a one-time snapshot.',
      priority: dataTrustScore >= 70 ? 'medium' : 'low'
    });
  }

  return suggestions.slice(0, 3);
}

function buildExecutiveSummary(
  datasetId: string,
  dataTrustScore: number,
  decisionReadinessScore: number,
  insights: BAInsight[]
): string {
  const lead = insights.find(insight => insight.type !== 'coverage' && insight.type !== 'data_quality');
  const trustLabel = dataTrustScore >= 85 ? 'high' : dataTrustScore >= 65 ? 'moderate' : 'low';
  const decisionLabel = decisionReadinessScore >= 80 ? 'ready for decision support' : decisionReadinessScore >= 60 ? 'usable with review' : 'exploratory only';

  if (lead) {
    return `${datasetId} has ${trustLabel} data trust and is ${decisionLabel}. Main finding: ${lead.statement}`;
  }

  return `${datasetId} has ${trustLabel} data trust and is ${decisionLabel}. Run or refine the preview to expose stronger business insights.`;
}

function buildScoreBreakdown(input: {
  dataTrustScore: number;
  hasBusinessInsight: boolean;
  hasChart: boolean;
  executionScope?: RuntimeRowScope;
  warningPenalty: number;
  decisionReadinessScore: number;
}): BAScoreBreakdownItem[] {
  const baseContribution = clampScore(input.dataTrustScore * 0.55);
  return [
    {
      label: 'Data trust',
      score: baseContribution,
      weight: 55,
      reason: `Data trust contributes ${baseContribution} points from score ${input.dataTrustScore}.`
    },
    {
      label: 'Business evidence',
      score: input.hasBusinessInsight ? 12 : 0,
      weight: 12,
      reason: input.hasBusinessInsight ? 'At least one business insight is supported by evidence.' : 'No strong business insight is available yet.'
    },
    {
      label: 'Chart support',
      score: input.hasChart ? 8 : 0,
      weight: 8,
      reason: input.hasChart ? 'A primary chart is available for decision review.' : 'No validated chart is available yet.'
    },
    {
      label: 'Execution coverage',
      score: input.executionScope === 'full_file' ? 8 : input.executionScope ? 3 : 0,
      weight: 8,
      reason: input.executionScope === 'full_file'
        ? 'The result is based on full-file execution.'
        : input.executionScope
          ? `The result is based on ${rowScopeLabel(input.executionScope)}.`
          : 'Execution scope is not available.'
    },
    {
      label: 'Risk penalty',
      score: -input.warningPenalty,
      weight: 0,
      reason: input.warningPenalty > 0 ? 'Warnings, critical risks, outliers, key risks, or field gaps reduce readiness.' : 'No major risk penalty was applied.'
    },
    {
      label: 'Final readiness',
      score: input.decisionReadinessScore,
      weight: 100,
      reason: 'Final Decision Readiness Score after bonuses and penalties.'
    }
  ];
}

export function createBADecisionBrief(input: CreateBADecisionBriefInput): BADecisionBrief {
  const { datasetId, previewResult, chartModel, aiBriefing, runtimeIntent, governedContext } = input;
  const dataTrustScore = clampScore(aiBriefing?.readinessScore ?? 50);

  if (!previewResult || previewResult.status === 'failed' || previewResult.status === 'blocked') {
    const caveats = [
      ...(aiBriefing?.caveats ?? []),
      previewResult?.errorMessage,
      ...(previewResult?.blockedReasons ?? [])
    ].filter(Boolean) as string[];
    const decisionReadinessScore = clampScore(Math.min(dataTrustScore, previewResult ? 35 : 45));

    return {
      dataTrustScore,
      decisionReadinessScore,
      executiveSummary: `${datasetId} is not ready for BA decision support until the preview can execute successfully.`,
      scoreBreakdown: buildScoreBreakdown({
        dataTrustScore,
        hasBusinessInsight: false,
        hasChart: false,
        warningPenalty: Math.max(10, dataTrustScore - decisionReadinessScore),
        decisionReadinessScore
      }),
      insights: [
        {
          id: 'ba_preview_blocked',
          type: 'data_quality',
          title: 'Decision brief blocked',
          statement: 'LightBI cannot produce a reliable BA brief because execution did not return a usable result.',
          severity: 'critical',
          confidence: 90,
          evidence: caveats.slice(0, 3),
          chartHint: 'table'
        }
      ],
      recommendedCharts: [],
      decisionSuggestions: [
        {
          title: 'Fix execution or data quality first',
          action: 'Resolve the preview failure, then rerun the analysis before using the data for decisions.',
          priority: 'high'
        }
      ],
      caveats
    };
  }

  const rows = previewResult.rows;
  const columns = previewResult.columns;
  const numericField = selectNumericField(rows, columns, chartModel);
  const categoryField = selectCategoryField(rows, columns, numericField, chartModel);

  const insights = [
    governedContext ? {
      id: 'ba_governed_scope',
      type: 'coverage' as const,
      title: 'Governed analysis scope',
      statement: `${governedContext.metricId} was calculated${governedContext.fullFileRowCount !== null ? ` from ${formatNumber(governedContext.fullFileRowCount)} full-source rows` : ' from the governed runtime source'}.`,
      severity: 'neutral' as const,
      confidence: 100,
      evidence: [
        ...(governedContext.businessPerspectiveIds.length > 0 ? [`Perspective: ${governedContext.businessPerspectiveIds.join(', ')}`] : []),
        ...governedContext.evidenceIds.slice(0, 3),
      ],
      chartHint: 'table' as const,
    } : null,
    minePositiveRateInsight(rows, columns, categoryField, runtimeIntent),
    mineTopConcentrationInsight(rows, categoryField, numericField),
    mineBottomInsight(rows, categoryField, numericField),
    mineSegmentSpreadInsight(rows, categoryField, numericField),
    mineTrendInsight(rows, chartModel?.xField ?? categoryField, numericField, runtimeIntent, chartModel),
    minePeriodOverPeriodInsight(rows, chartModel?.xField ?? categoryField, numericField, runtimeIntent, chartModel),
    mineOutlierInsight(rows, categoryField, numericField),
    mineKeyRiskInsight(rows, columns, categoryField),
    mineRequiredFieldGapInsight(columns, aiBriefing, runtimeIntent),
    mineCoverageInsight(previewResult),
    mineSemanticCoverageGapInsight(aiBriefing),
    mineDataQualityInsight(aiBriefing)
  ].filter((insight): insight is BAInsight => Boolean(insight));

  const hasBusinessInsight = insights.some(insight => !['coverage', 'data_quality'].includes(insight.type));
  const hasChart = Boolean(chartModel && chartModel.status === 'ready' && chartModel.chartType !== 'table');
  const warningPenalty = insights.filter(insight => insight.severity === 'warning').length * 6
    + insights.filter(insight => insight.severity === 'critical').length * 15
    + insights.filter(insight => insight.type === 'outlier' || insight.type === 'key_risk').length * 6
    + insights.filter(insight => insight.type === 'field_gap').length * 10;
  const evidenceBonus = hasBusinessInsight ? 12 : 0;
  const chartBonus = hasChart ? 8 : 0;
  const executionBonus = previewResult.executionScope === 'full_file' ? 8 : previewResult.executionScope ? 3 : 0;
  const rawDecisionReadinessScore = clampScore(dataTrustScore * 0.55 + evidenceBonus + chartBonus + executionBonus - warningPenalty);
  const decisionReadinessScore = governedContext && !governedContext.decisionUseAuthorized
    ? Math.min(79, rawDecisionReadinessScore)
    : rawDecisionReadinessScore;
  const governedCaveats = governedContext ? [
    ...governedContext.limitations.map(item => `Governed limitation: ${item}`),
    ...governedContext.restrictions.map(item => `Governed restriction: ${item}`),
  ] : [];
  let decisionSuggestions = buildDecisionSuggestions(dataTrustScore, decisionReadinessScore, insights, runtimeIntent);
  if (governedContext && !governedContext.decisionUseAuthorized) {
    decisionSuggestions = decisionSuggestions.filter(item => item.title !== 'Validate before deciding');
    decisionSuggestions.unshift({
      title: 'Validate before operational action',
      action: 'Use this brief as analytical evidence. A business owner must review the governed limitations and approve any operational or financial decision.',
      priority: 'high',
    });
  }

  return {
    dataTrustScore,
    decisionReadinessScore,
    executiveSummary: buildExecutiveSummary(datasetId, dataTrustScore, decisionReadinessScore, insights),
    scoreBreakdown: buildScoreBreakdown({
      dataTrustScore,
      hasBusinessInsight,
      hasChart,
      executionScope: previewResult.executionScope,
      warningPenalty,
      decisionReadinessScore
    }),
    insights,
    recommendedCharts: buildRecommendedCharts(chartModel, insights),
    decisionSuggestions,
    caveats: [...new Set([
      ...governedCaveats,
      ...(aiBriefing?.caveats ?? []),
      ...previewResult.warnings,
    ])].slice(0, 10)
  };
}

export function createPreExecutionBADecisionBrief(input: CreatePreExecutionBADecisionBriefInput): BADecisionBrief | null {
  const { datasetId, rows = [], aiBriefing, runtimeIntent, rowScope } = input;
  if (rows.length === 0 && !aiBriefing) return null;

  if (rows.length === 0) {
    const dataTrustScore = clampScore(aiBriefing?.readinessScore ?? 35);
    return {
      dataTrustScore,
      decisionReadinessScore: clampScore(Math.min(40, dataTrustScore)),
      executiveSummary: `${datasetId} has been profiled, but LightBI needs executable rows before it can produce decision-grade insights.`,
      scoreBreakdown: buildScoreBreakdown({
        dataTrustScore,
        hasBusinessInsight: false,
        hasChart: false,
        warningPenalty: Math.max(10, dataTrustScore - clampScore(Math.min(40, dataTrustScore))),
        decisionReadinessScore: clampScore(Math.min(40, dataTrustScore))
      }),
      insights: [
        {
          id: 'ba_pre_execution_no_rows',
          type: 'coverage',
          title: 'Rows not available yet',
          statement: 'Pre-execution BA briefing is limited because no retained rows are available in the current session.',
          severity: 'warning',
          confidence: 75,
          evidence: aiBriefing?.caveats?.slice(0, 3) ?? [],
          chartHint: 'table'
        }
      ],
      recommendedCharts: [],
      decisionSuggestions: [
        {
          title: 'Run preview',
          action: 'Execute the preview so LightBI can validate the business signal against actual result rows.',
          priority: 'high'
        }
      ],
      caveats: [
        'Pre-execution estimate only. Run preview to validate result rows.',
        ...(aiBriefing?.caveats ?? [])
      ].slice(0, 6)
    };
  }

  const estimated = buildPreExecutionRows(rows, runtimeIntent);
  const sourceScope = rowScopeLabel(rowScope);
  const estimatedPreview: DuckDBPreviewResult = {
    id: `pre_execution_${runtimeIntent.id}`,
    sourceSqlPreviewId: 'pre_execution_profile',
    status: 'executed',
    columns: estimated.columns,
    rows: estimated.rows,
    rowCount: rows.length,
    maxRows: estimated.rows.length,
    warnings: [
      `Pre-execution estimate based on ${sourceScope}. Run preview to validate with the execution engine.`
    ],
    blockedReasons: [],
    executionScope: rowScope ?? 'preview',
    source: 'duckdb_preview_sandbox'
  };

  const brief = createBADecisionBrief({
    datasetId,
    previewResult: estimatedPreview,
    chartModel: null,
    aiBriefing,
    runtimeIntent
  });
  const rawColumns = inferColumns(rows);
  const rawKeyRisk = mineKeyRiskInsight(
    rows.slice(0, 1000),
    rawColumns,
    firstAvailableField(rows.slice(0, 1000), runtimeIntent.dimensions)
  );
  const insights = rawKeyRisk && !brief.insights.some(insight => insight.type === 'key_risk')
    ? [...brief.insights, rawKeyRisk]
    : brief.insights;
  const extraRiskPenalty = rawKeyRisk ? (rawKeyRisk.severity === 'critical' ? 15 : 8) : 0;
  const decisionReadinessScore = clampScore(
    Math.min(brief.decisionReadinessScore - extraRiskPenalty, brief.dataTrustScore - 5)
  );
  const preExecutionWarningPenalty = insights.filter(insight => insight.severity === 'warning').length * 6
    + insights.filter(insight => insight.severity === 'critical').length * 15
    + insights.filter(insight => insight.type === 'outlier' || insight.type === 'key_risk').length * 6
    + insights.filter(insight => insight.type === 'field_gap').length * 10
    + extraRiskPenalty;
  const riskAwareSuggestions: BADecisionSuggestion[] = buildDecisionSuggestions(
    brief.dataTrustScore,
    decisionReadinessScore,
    insights,
    runtimeIntent
  );

  return {
    ...brief,
    insights,
    decisionReadinessScore,
    scoreBreakdown: buildScoreBreakdown({
      dataTrustScore: brief.dataTrustScore,
      hasBusinessInsight: insights.some(insight => !['coverage', 'data_quality'].includes(insight.type)),
      hasChart: false,
      executionScope: rowScope ?? 'preview',
      warningPenalty: preExecutionWarningPenalty,
      decisionReadinessScore
    }),
    executiveSummary: `Pre-execution estimate: ${brief.executiveSummary}`,
    caveats: [
      `Pre-execution estimate based on ${sourceScope}. Run preview to validate result rows.`,
      ...brief.caveats
    ].slice(0, 6),
    decisionSuggestions: ([
      {
        title: 'Run preview to validate',
        action: 'Use this pre-execution brief to orient the analysis, then run preview before making a decision.',
        priority: 'high' as const
      },
      ...riskAwareSuggestions
    ] satisfies BADecisionSuggestion[]).slice(0, 3)
  };
}
