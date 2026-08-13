import type { AnalysisAction } from './analysis-opportunity-actions';
import type { ChartPreviewModel } from './chart-preview-model';
import type { BusinessFusionOverview, FusionDriver, FusionMetricDelta } from './business-fusion-overview';

export type BusinessBrainReadiness = 'ready' | 'partial' | 'blocked';
export type BusinessBrainIntent = 'money' | 'profitability' | 'product' | 'payment' | 'logistics' | 'operations' | 'general';

export interface BusinessBrainKpi {
  id: string;
  label: string;
  value?: number;
  previousValue?: number;
  currentValue?: number;
  delta?: number;
  deltaPercent?: number | null;
  source: string;
  confidence: number;
  formula?: string;
  sourceColumns?: string[];
}

export interface BusinessBrainRootCause {
  id: string;
  label: string;
  level?: string;
  dimension?: string;
  metricId?: string;
  value?: number;
  delta?: number;
  deltaPercent?: number | null;
  evidence: string[];
}

export interface BusinessBrainRisk {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  evidence: string[];
}

export interface BusinessBrainRecommendation {
  type: 'do_now' | 'investigate' | 'need_more_data';
  priority: 'low' | 'medium' | 'high';
  title: string;
  action: string;
}

export interface BusinessBrainMissingEvidence {
  id: string;
  label: string;
  neededFor: string;
  reason: string;
}

export interface BusinessBrainEvidence {
  id: string;
  type: 'kpi' | 'variance' | 'root_cause' | 'risk' | 'missing_evidence';
  label: string;
  source: string;
  details: string[];
  confidence?: number;
}

export interface BusinessBrainNarrative {
  headline: string;
  mainAnswer: string;
  businessQuestion: string;
  sections: Array<{ title: string; body: string; bullets: string[] }>;
}

export interface BusinessBrainBrief {
  angle: string;
  intent: BusinessBrainIntent;
  readiness: BusinessBrainReadiness;
  businessQuestion: string;
  dataCoverage: {
    recognized: string[];
    partial: string[];
    missing: BusinessBrainMissingEvidence[];
  };
  kpis: BusinessBrainKpi[];
  variance: BusinessBrainKpi[];
  rootCauses: BusinessBrainRootCause[];
  risks: BusinessBrainRisk[];
  recommendations: BusinessBrainRecommendation[];
  missingEvidence: BusinessBrainMissingEvidence[];
  nextQuestions: string[];
  evidence: BusinessBrainEvidence[];
  narrative: BusinessBrainNarrative;
}

function normalize(value: string | undefined): string {
  return (value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/[^0-9,.-]/g, '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function inferBusinessBrainIntent(action: AnalysisAction, chartModel: ChartPreviewModel | null): BusinessBrainIntent {
  const text = normalize([
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

  if (/(payment|tien mat|tra gop|chuyen khoan|installment|cash|bank transfer|card|voucher)/.test(text)) return 'payment';
  if (/(carrier|delivery fee|delivery status|shipment|logistics|warehouse|van tai|giao hang|noi bo|thue ngoai|outsourc|internal)/.test(text)) return 'logistics';
  if (/(profit|margin|gross profit|loi nhuan|cash flow|receivable|payable|ar)/.test(text)) return 'profitability';
  if (/(product|item|sku|hang hoa|san pham)/.test(text)) return 'product';
  if (/(quantity|stock|inventory|operation|status)/.test(text)) return 'operations';
  if (/(money|revenue|sales|amount|invoice|trend|doanh thu|total)/.test(text)) return 'money';
  return 'general';
}

function metricMatches(metric: FusionMetricDelta, candidates: string[]): boolean {
  const text = normalize(`${metric.metricId} ${metric.label}`);
  return candidates.some(candidate => text.includes(normalize(candidate)));
}

function pickMetrics(overview: BusinessFusionOverview | undefined, intent: BusinessBrainIntent): FusionMetricDelta[] {
  if (!overview) return [];
  const candidatesByIntent: Record<BusinessBrainIntent, string[]> = {
    money: ['revenue', 'sales', 'invoice'],
    profitability: ['profit', 'margin', 'revenue', 'delivery fee'],
    product: ['revenue', 'profit', 'quantity'],
    payment: ['revenue', 'invoice', 'receivable'],
    logistics: ['delivery fee', 'quantity', 'profit', 'revenue'],
    operations: ['quantity', 'delivery fee', 'revenue'],
    general: ['revenue', 'profit', 'quantity', 'delivery fee']
  };
  const candidates = candidatesByIntent[intent];
  const matched = overview.metrics.filter(metric => metricMatches(metric, candidates));
  return matched.length > 0 ? matched.slice(0, 5) : overview.metrics.slice(0, 4);
}

function metricToKpi(metric: FusionMetricDelta): BusinessBrainKpi {
  return {
    id: metric.metricId,
    label: metric.label,
    previousValue: metric.previousValue,
    currentValue: metric.currentValue,
    value: metric.currentValue,
    delta: metric.delta,
    deltaPercent: metric.deltaPercent,
    source: metric.sourceRole,
    confidence: 0.9
  };
}

function formatNarrativeNumber(value: number | null | undefined, asPercent = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'available';
  if (asPercent) return `${Math.round(value * 100)}%`;
  return new Intl.NumberFormat('en-US', {
    notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(value) >= 1_000_000 ? 1 : 2
  }).format(value);
}

function kpiNarrativeValue(kpi: BusinessBrainKpi): string {
  const value = kpi.value ?? kpi.currentValue;
  const shouldFormatPercent = value !== undefined && value >= 0 && value <= 1 && /share|rate|margin|pct/i.test(`${kpi.id} ${kpi.label}`);
  return formatNarrativeNumber(value, shouldFormatPercent);
}

function fieldMatches(field: string | undefined, candidates: string[]): boolean {
  const text = normalize(field);
  return candidates.some(candidate => text.includes(normalize(candidate)));
}

function firstMatchingField(fields: string[], candidates: string[]): string | null {
  return fields.find(field => fieldMatches(field, candidates)) ?? null;
}

function chartFields(chartModel: ChartPreviewModel | null): string[] {
  if (!chartModel) return [];
  const rowFields = chartModel.rows.flatMap(row => Object.keys(row));
  return [
    ...(chartModel.xField ? [chartModel.xField] : []),
    ...(chartModel.yField ? [chartModel.yField] : []),
    ...chartModel.seriesFields,
    ...rowFields
  ].filter((field, index, fields) => fields.indexOf(field) === index);
}

function sumField(rows: Record<string, unknown>[], field: string): number {
  return rows.reduce((sum, row) => sum + (toNumber(row[field]) ?? 0), 0);
}

function averageField(rows: Record<string, unknown>[], field: string): number | null {
  const values = rows
    .map(row => toNumber(row[field]))
    .filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rankedRows(chartModel: ChartPreviewModel | null, yField?: string): Array<{ label: string; value: number }> {
  if (!chartModel?.xField || !yField) return [];
  return chartModel.rows
    .map(row => ({
      label: String(row[chartModel.xField!] ?? '(empty)'),
      value: toNumber(row[yField]) ?? 0
    }))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value);
}

function isInternalCarrierLabel(value: string): boolean {
  return /(internal|in house|own fleet|owned fleet|company fleet|noi bo|n[oộ]i b[oộ]|xe cong ty|xe cty)/.test(normalize(value));
}

function isPositiveDeliveryStatus(value: string): boolean {
  return /(delivered|completed|fulfilled|done|success|finished|on time|ontime|timely|da giao|hoan tat|giao thanh cong|dung hen)/.test(normalize(value));
}

function isPaymentDimension(value: string | undefined): boolean {
  return fieldMatches(value, ['payment', 'method', 'cash', 'installment', 'card', 'transfer', 'thanh toan', 'tien mat', 'tra gop']);
}

function isDeferredPaymentLabel(value: string): boolean {
  return /(installment|deferred|credit|tra gop|cong no|pay later|postpaid)/.test(normalize(value));
}

function createKpi(input: BusinessBrainKpi): BusinessBrainKpi {
  return input;
}

function canonicalChartKpis(chartModel: ChartPreviewModel | null): BusinessBrainKpi[] {
  if (!chartModel?.rows.length) return [];
  const fields = chartFields(chartModel);
  const kpis: BusinessBrainKpi[] = [];

  const definitions: Array<{ id: string; label: string; candidates: string[]; formula: string }> = [
    { id: 'revenue', label: 'Revenue', candidates: ['revenue', 'sales revenue', 'sales_revenue', 'doanh thu'], formula: 'sum(revenue)' },
    { id: 'net_revenue', label: 'Net revenue', candidates: ['net revenue', 'net_revenue'], formula: 'sum(net revenue)' },
    { id: 'invoice_total', label: 'Invoice total', candidates: ['invoice total', 'invoice_total', 'total amount', 'grand total', 'tong tien'], formula: 'sum(invoice total)' },
    { id: 'gross_profit', label: 'Gross profit', candidates: ['gross profit', 'gross_profit', 'profit', 'loi nhuan'], formula: 'sum(gross profit)' },
    { id: 'quantity', label: 'Quantity', candidates: ['quantity', 'qty', 'units', 'so luong'], formula: 'sum(quantity)' },
    { id: 'delivery_fee', label: 'Delivery fee', candidates: ['delivery fee', 'shipping fee', 'freight', 'transport cost', 'phi giao', 'van chuyen'], formula: 'sum(delivery fee)' },
    { id: 'ar_debit', label: 'Accounts receivable', candidates: ['ar debit', 'ar_debit', 'receivable', 'phai thu', 'cong no'], formula: 'sum(accounts receivable)' }
  ];

  for (const definition of definitions) {
    const field = firstMatchingField(fields, definition.candidates);
    if (!field) continue;
    const value = sumField(chartModel.rows, field);
    if (!Number.isFinite(value) || value === 0) continue;
    kpis.push(createKpi({
      id: definition.id,
      label: definition.label,
      value,
      currentValue: value,
      source: field,
      confidence: 0.82,
      formula: definition.formula,
      sourceColumns: [field]
    }));
  }

  const marginField = firstMatchingField(fields, ['margin pct', 'margin_pct', 'margin percent', 'margin %', 'gross margin']);
  if (marginField) {
    const value = averageField(chartModel.rows, marginField);
    if (value !== null) {
      kpis.push(createKpi({
        id: 'margin_pct',
        label: 'Margin',
        value: value > 1 ? value / 100 : value,
        currentValue: value > 1 ? value / 100 : value,
        source: marginField,
        confidence: 0.82,
        formula: 'avg(margin percent)',
        sourceColumns: [marginField]
      }));
    }
  } else {
    const revenueField = firstMatchingField(fields, ['net revenue', 'net_revenue', 'revenue', 'sales_revenue', 'doanh thu']);
    const profitField = firstMatchingField(fields, ['gross profit', 'gross_profit', 'profit', 'loi nhuan']);
    if (revenueField && profitField) {
      const revenue = sumField(chartModel.rows, revenueField);
      const profit = sumField(chartModel.rows, profitField);
      if (revenue !== 0) {
        kpis.push(createKpi({
          id: 'margin_pct',
          label: 'Margin',
          value: profit / revenue,
          currentValue: profit / revenue,
          source: `${profitField}/${revenueField}`,
          confidence: 0.78,
          formula: 'sum(gross profit) / sum(revenue)',
          sourceColumns: [profitField, revenueField]
        }));
      }
    }
  }

  const deliveryFeeField = firstMatchingField(fields, ['delivery fee', 'shipping fee', 'freight', 'transport cost', 'phi giao', 'van chuyen']);
  const revenueField = firstMatchingField(fields, ['net revenue', 'net_revenue', 'revenue', 'sales_revenue', 'doanh thu']);
  const profitField = firstMatchingField(fields, ['gross profit', 'gross_profit', 'profit', 'loi nhuan']);
  if (deliveryFeeField && revenueField) {
    const deliveryFee = sumField(chartModel.rows, deliveryFeeField);
    const revenue = sumField(chartModel.rows, revenueField);
    if (revenue > 0) {
      kpis.push(createKpi({
        id: 'delivery_fee_to_revenue',
        label: 'Delivery fee / revenue',
        value: deliveryFee / revenue,
        currentValue: deliveryFee / revenue,
        source: `${deliveryFeeField}/${revenueField}`,
        confidence: 0.76,
        formula: 'sum(delivery fee) / sum(revenue)',
        sourceColumns: [deliveryFeeField, revenueField]
      }));
    }
  }
  if (deliveryFeeField && profitField) {
    const deliveryFee = sumField(chartModel.rows, deliveryFeeField);
    const profit = sumField(chartModel.rows, profitField);
    if (profit > 0) {
      kpis.push(createKpi({
        id: 'delivery_fee_to_profit',
        label: 'Delivery fee / profit',
        value: deliveryFee / profit,
        currentValue: deliveryFee / profit,
        source: `${deliveryFeeField}/${profitField}`,
        confidence: 0.74,
        formula: 'sum(delivery fee) / sum(gross profit)',
        sourceColumns: [deliveryFeeField, profitField]
      }));
    }
  }

  if (chartModel.xField && isPaymentDimension(chartModel.xField) && chartModel.yField) {
    const rows = rankedRows(chartModel, chartModel.yField);
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    const deferred = rows.filter(row => isDeferredPaymentLabel(row.label)).reduce((sum, row) => sum + row.value, 0);
    if (total > 0) {
      kpis.push(createKpi({
        id: 'payment_mix',
        label: 'Payment mix coverage',
        value: 1,
        currentValue: total,
        source: chartModel.xField,
        confidence: 0.78,
        formula: `group by ${chartModel.xField}, sum(${chartModel.yField})`,
        sourceColumns: [chartModel.xField, chartModel.yField]
      }));
      if (deferred > 0) {
        kpis.push(createKpi({
          id: 'deferred_payment_share',
          label: 'Deferred payment share',
          value: deferred / total,
          currentValue: deferred,
          source: chartModel.xField,
          confidence: 0.72,
          formula: 'sum(deferred payment value) / sum(payment value)',
          sourceColumns: [chartModel.xField, chartModel.yField]
        }));
      }
    }
  }

  return kpis;
}

function selectedAngleChartKpis(chartModel: ChartPreviewModel | null, intent: BusinessBrainIntent): BusinessBrainKpi[] {
  if (!chartModel?.xField || chartModel.rows.length === 0) return [];
  const fields = chartFields(chartModel);
  const yField = chartModel.yField;
  const kpis: BusinessBrainKpi[] = [];

  const primaryRows = rankedRows(chartModel, yField);
  const primaryTotal = primaryRows.reduce((sum, row) => sum + row.value, 0);
  if (primaryTotal > 0 && yField) {
    kpis.push({
      id: `angle_total_${normalize(yField).replace(/\s+/g, '_')}`,
      label: `Total ${yField}`,
      value: primaryTotal,
      currentValue: primaryTotal,
      source: chartModel.xField,
      confidence: 0.78
    });
  }

  if (['payment', 'logistics', 'product'].includes(intent) && primaryTotal > 0 && primaryRows[0]) {
    const shareLabel = intent === 'payment'
      ? 'Top payment method share'
      : intent === 'logistics'
        ? 'Top logistics segment share'
        : 'Top product share';
    kpis.push({
      id: `top_share_${intent}`,
      label: shareLabel,
      value: primaryRows[0].value / primaryTotal,
      currentValue: primaryRows[0].value,
      source: chartModel.xField,
      confidence: 0.78
    });
  }

  if (intent === 'payment') {
    const receivableField = firstMatchingField(fields, ['receivable', 'ar', 'debit', 'phai thu', 'cong no']);
    if (receivableField) {
      const receivable = sumField(chartModel.rows, receivableField);
      if (receivable > 0) {
        kpis.push({
          id: 'payment_receivable_exposure',
          label: 'Receivable exposure',
          value: primaryTotal > 0 ? receivable / primaryTotal : receivable,
          currentValue: receivable,
          source: receivableField,
          confidence: 0.76
        });
      }
    }

    const profitField = firstMatchingField(fields, ['gross profit', 'gross_profit', 'profit', 'margin']);
    if (profitField) {
      const profitValue = fieldMatches(profitField, ['margin'])
        ? averageField(chartModel.rows, profitField)
        : sumField(chartModel.rows, profitField);
      if (profitValue !== null && Number.isFinite(profitValue)) {
        kpis.push({
          id: 'payment_profit_signal',
          label: fieldMatches(profitField, ['margin']) ? 'Average payment margin' : 'Payment profit signal',
          value: profitValue,
          currentValue: profitValue,
          source: profitField,
          confidence: 0.74
        });
      }
    }
  }

  if (intent === 'logistics') {
    const carrierField = firstMatchingField(fields, ['carrier', 'courier', 'shipper', 'provider', 'fleet', 'van tai', 'don vi van chuyen']);
    const deliveryFeeField = firstMatchingField(fields, ['delivery fee', 'shipping fee', 'freight', 'transport cost', 'van chuyen', 'phi giao', 'fee']);
    const statusField = firstMatchingField(fields, ['delivery status', 'shipment status', 'status', 'trang thai']);

    if (carrierField && yField) {
      const carrierRows = chartModel.rows
        .map(row => ({ label: String(row[carrierField] ?? ''), value: toNumber(row[yField]) ?? 0 }))
        .filter(row => row.label.trim() !== '' && row.value > 0);
      const carrierTotal = carrierRows.reduce((sum, row) => sum + row.value, 0);
      const internalTotal = carrierRows
        .filter(row => isInternalCarrierLabel(row.label))
        .reduce((sum, row) => sum + row.value, 0);
      if (carrierTotal > 0 && internalTotal > 0) {
        kpis.push({
          id: 'internal_carrier_share',
          label: 'Internal carrier share',
          value: internalTotal / carrierTotal,
          currentValue: internalTotal,
          source: carrierField,
          confidence: 0.73
        });
        kpis.push({
          id: 'external_carrier_share',
          label: 'External carrier share',
          value: (carrierTotal - internalTotal) / carrierTotal,
          currentValue: carrierTotal - internalTotal,
          source: carrierField,
          confidence: 0.73
        });
      }
    }

    if (deliveryFeeField) {
      const deliveryFee = sumField(chartModel.rows, deliveryFeeField);
      if (deliveryFee > 0) {
        kpis.push({
          id: 'total_delivery_fee',
          label: 'Total delivery fee',
          value: deliveryFee,
          currentValue: deliveryFee,
          source: deliveryFeeField,
          confidence: 0.8
        });
      }
    }

    if (statusField && yField) {
      const statusRows = chartModel.rows
        .map(row => ({ label: String(row[statusField] ?? ''), value: toNumber(row[yField]) ?? 0 }))
        .filter(row => row.label.trim() !== '' && row.value > 0);
      const statusTotal = statusRows.reduce((sum, row) => sum + row.value, 0);
      const completed = statusRows
        .filter(row => isPositiveDeliveryStatus(row.label))
        .reduce((sum, row) => sum + row.value, 0);
      if (statusTotal > 0 && completed > 0) {
        kpis.push({
          id: 'fulfilled_rate',
          label: 'Fulfilled delivery rate',
          value: completed / statusTotal,
          currentValue: completed,
          source: statusField,
          confidence: 0.72
        });
      }
    }
  }

  return kpis;
}

function chartDistributionKpis(chartModel: ChartPreviewModel | null, intent: BusinessBrainIntent): BusinessBrainKpi[] {
  if (!chartModel?.xField || !chartModel.yField || !['payment', 'logistics', 'product'].includes(intent)) return [];
  const rows = chartModel.rows
    .map(row => ({
      label: String(row[chartModel.xField!] ?? '(empty)'),
      value: toNumber(row[chartModel.yField!]) ?? 0
    }))
    .filter(row => row.value > 0);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total <= 0) return [];
  return rows
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map(row => ({
      id: `share_${row.label}`,
      label: `${row.label} share`,
      value: row.value / total,
      currentValue: row.value,
      source: chartModel.xField || 'chart',
      confidence: 0.75
    }));
}

function dedupeKpis(kpis: BusinessBrainKpi[]): BusinessBrainKpi[] {
  const seen = new Set<string>();
  return kpis.filter(kpi => {
    const key = kpi.id || kpi.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeRootCauses(causes: BusinessBrainRootCause[]): BusinessBrainRootCause[] {
  const seen = new Set<string>();
  return causes.filter(cause => {
    const key = `${cause.level || ''}:${cause.dimension || ''}:${cause.metricId || ''}:${cause.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeRisks(risks: BusinessBrainRisk[]): BusinessBrainRisk[] {
  const severityRank: Record<BusinessBrainRisk['severity'], number> = { low: 1, medium: 2, high: 3 };
  const byId = new Map<string, BusinessBrainRisk>();
  for (const risk of risks) {
    const existing = byId.get(risk.id);
    if (!existing || severityRank[risk.severity] > severityRank[existing.severity]) {
      byId.set(risk.id, risk);
    }
  }
  return [...byId.values()];
}

function parseComparableLabel(value: string): number | string {
  const normalized = value.trim();
  const dateTime = Date.parse(normalized);
  if (Number.isFinite(dateTime)) return dateTime;
  const monthMatch = normalized.match(/^(\d{4})[-/](\d{1,2})$/);
  if (monthMatch) return Number(monthMatch[1]) * 100 + Number(monthMatch[2]);
  const number = toNumber(normalized);
  return number ?? normalized;
}

function sortRowsByDimension(rows: Record<string, unknown>[], field: string): Record<string, unknown>[] {
  return [...rows].sort((a, b) => {
    const left = parseComparableLabel(String(a[field] ?? ''));
    const right = parseComparableLabel(String(b[field] ?? ''));
    if (typeof left === 'number' && typeof right === 'number') return left - right;
    return String(left).localeCompare(String(right));
  });
}

function buildChartVariance(chartModel: ChartPreviewModel | null): BusinessBrainKpi[] {
  if (!chartModel?.xField || !chartModel.yField || chartModel.rows.length < 2) return [];
  const dimensionText = normalize(chartModel.xField);
  const looksTemporal = /(date|period|month|year|week|time|ngay|thang|ky)/.test(dimensionText)
    || chartModel.rows.some(row => Number.isFinite(Date.parse(String(row[chartModel.xField!] ?? ''))));
  if (!looksTemporal) return [];

  const rows = sortRowsByDimension(chartModel.rows, chartModel.xField)
    .map(row => ({
      label: String(row[chartModel.xField!] ?? ''),
      value: toNumber(row[chartModel.yField!])
    }))
    .filter((row): row is { label: string; value: number } => row.value !== null);
  if (rows.length < 2) return [];

  const previous = rows[rows.length - 2];
  const current = rows[rows.length - 1];
  const delta = current.value - previous.value;
  const deltaPercent = previous.value !== 0 ? delta / previous.value : null;
  return [{
    id: `variance_${normalize(chartModel.yField).replace(/\s+/g, '_')}`,
    label: `${chartModel.yField} variance`,
    previousValue: previous.value,
    currentValue: current.value,
    value: current.value,
    delta,
    deltaPercent,
    source: `${chartModel.xField}: ${previous.label} -> ${current.label}`,
    confidence: 0.8,
    formula: 'current period - previous period',
    sourceColumns: [chartModel.xField, chartModel.yField]
  }];
}

function buildPlanVariance(chartModel: ChartPreviewModel | null): BusinessBrainKpi[] {
  if (!chartModel?.rows.length) return [];
  const fields = chartFields(chartModel);
  const planField = firstMatchingField(fields, ['plan', 'budget', 'target', 'forecast', 'quota']);
  if (!planField) return [];
  const actualField = chartModel.yField && chartModel.yField !== planField
    ? chartModel.yField
    : firstMatchingField(fields.filter(field => field !== planField), ['actual', 'revenue', 'sales', 'net revenue', 'gross profit', 'quantity', 'delivery fee']);
  if (!actualField) return [];
  const actual = sumField(chartModel.rows, actualField);
  const plan = sumField(chartModel.rows, planField);
  if (!Number.isFinite(actual) || !Number.isFinite(plan) || plan === 0) return [];
  const delta = actual - plan;
  return [{
    id: `plan_variance_${normalize(actualField).replace(/\s+/g, '_')}`,
    label: `${actualField} vs plan`,
    previousValue: plan,
    currentValue: actual,
    value: actual,
    delta,
    deltaPercent: delta / plan,
    source: `${actualField} vs ${planField}`,
    confidence: 0.82,
    formula: 'sum(actual) - sum(plan/budget/target)',
    sourceColumns: [actualField, planField]
  }];
}

function driverToRootCause(driver: FusionDriver, prefix: string, index: number): BusinessBrainRootCause {
  return {
    id: `${prefix}_${index}_${driver.key}`,
    label: `${prefix} #${index + 1}: ${driver.key}`,
    level: driver.dimension,
    dimension: driver.dimension,
    metricId: driver.metricId,
    value: driver.currentValue,
    delta: driver.delta,
    deltaPercent: driver.deltaPercent,
    evidence: [`${driver.dimension}=${driver.key}`, `metric=${driver.metricId}`]
  };
}

const DRILL_DIMENSIONS: Array<{ level: string; candidates: string[] }> = [
  { level: 'product', candidates: ['product', 'item', 'sku', 'hang hoa', 'san pham'] },
  { level: 'category', candidates: ['category', 'segment', 'line', 'nhom', 'loai'] },
  { level: 'store', candidates: ['store', 'branch', 'location', 'warehouse', 'kho', 'chi nhanh'] },
  { level: 'salesperson', candidates: ['salesperson', 'sales person', 'employee', 'staff', 'seller', 'nhan vien'] },
  { level: 'payment', candidates: ['payment', 'method', 'thanh toan', 'tien mat', 'tra gop'] },
  { level: 'carrier', candidates: ['carrier', 'courier', 'shipper', 'provider', 'fleet', 'van tai', 'don vi van chuyen'] },
  { level: 'delivery_status', candidates: ['delivery status', 'shipment status', 'status', 'trang thai'] }
];

function drillPriorityFor(intent: BusinessBrainIntent): string[] {
  if (intent === 'logistics') return ['carrier', 'delivery_status', 'store', 'product', 'category', 'payment', 'salesperson'];
  if (intent === 'payment') return ['payment', 'store', 'product', 'category', 'salesperson', 'carrier'];
  if (intent === 'product') return ['product', 'category', 'store', 'salesperson', 'payment', 'carrier'];
  if (intent === 'profitability') return ['product', 'category', 'store', 'payment', 'carrier', 'salesperson'];
  return ['product', 'category', 'store', 'salesperson', 'payment', 'carrier', 'delivery_status'];
}

function metricFieldForRootCause(chartModel: ChartPreviewModel | null, intent: BusinessBrainIntent): string | null {
  const fields = chartFields(chartModel);
  if (intent === 'profitability') {
    return firstMatchingField(fields, ['gross profit', 'gross_profit', 'profit', 'margin'])
      ?? firstMatchingField(fields, ['net revenue', 'net_revenue', 'revenue', 'sales_revenue']);
  }
  if (intent === 'logistics') {
    return firstMatchingField(fields, ['delivery fee', 'shipping fee', 'freight', 'transport cost'])
      ?? firstMatchingField(fields, ['quantity', 'qty', 'row_count'])
      ?? chartModel?.yField
      ?? null;
  }
  return chartModel?.yField
    ?? firstMatchingField(fields, ['net revenue', 'net_revenue', 'revenue', 'sales_revenue', 'gross profit', 'quantity', 'qty', 'row_count']);
}

function buildAdaptiveDrillRootCauses(chartModel: ChartPreviewModel | null, intent: BusinessBrainIntent): BusinessBrainRootCause[] {
  if (!chartModel?.rows.length) return [];
  const fields = chartFields(chartModel);
  const metricField = metricFieldForRootCause(chartModel, intent);
  if (!metricField) return [];

  const availableByLevel = new Map<string, string>();
  for (const definition of DRILL_DIMENSIONS) {
    const field = firstMatchingField(fields, definition.candidates);
    if (field) availableByLevel.set(definition.level, field);
  }
  if (chartModel.xField) {
    const xDefinition = DRILL_DIMENSIONS.find(definition => fieldMatches(chartModel.xField, definition.candidates));
    if (xDefinition) availableByLevel.set(xDefinition.level, chartModel.xField);
  }

  const causes: BusinessBrainRootCause[] = [];
  for (const level of drillPriorityFor(intent)) {
    const dimensionField = availableByLevel.get(level);
    if (!dimensionField) continue;
    const totals = new Map<string, number>();
    for (const row of chartModel.rows) {
      const rawLabel = row[dimensionField];
      const label = rawLabel === null || rawLabel === undefined || String(rawLabel).trim() === '' ? '(empty)' : String(rawLabel);
      const value = toNumber(row[metricField]) ?? 0;
      if (value === 0) continue;
      totals.set(label, (totals.get(label) ?? 0) + value);
    }
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) continue;
    const [label, value] = top;
    causes.push({
      id: `drill_${level}_${normalize(label).replace(/\s+/g, '_')}`,
      label: `${level.replace(/_/g, ' ')} driver: ${label}`,
      level,
      dimension: dimensionField,
      metricId: metricField,
      value,
      evidence: [`${dimensionField}=${label}`, `${metricField}=${value}`, `drill_level=${level}`]
    });
  }
  return causes;
}

function buildChartRootCauses(chartModel: ChartPreviewModel | null, intent: BusinessBrainIntent): BusinessBrainRootCause[] {
  if (!chartModel?.xField || !chartModel.yField) return [];
  const rows = rankedRows(chartModel, chartModel.yField).slice(0, 5);
  const prefix = intent === 'payment'
    ? 'Payment driver'
    : intent === 'logistics'
      ? 'Logistics driver'
      : intent === 'product'
        ? 'Product driver'
        : 'Chart driver';

  return rows.map((row, index) => ({
    id: `chart_driver_${index}_${row.label}`,
    label: `${prefix} #${index + 1}: ${row.label}`,
    level: chartModel.xField,
    dimension: chartModel.xField,
    metricId: chartModel.yField,
    value: row.value,
    evidence: [`${chartModel.xField}=${row.label}`, `${chartModel.yField}=${row.value}`]
  }));
}

function buildRootCauses(overview: BusinessFusionOverview | undefined, chartModel: ChartPreviewModel | null, intent: BusinessBrainIntent): BusinessBrainRootCause[] {
  const causes: BusinessBrainRootCause[] = [];
  causes.push(...buildAdaptiveDrillRootCauses(chartModel, intent));
  if (['payment', 'logistics', 'product'].includes(intent)) {
    causes.push(...buildChartRootCauses(chartModel, intent));
  }

  if (intent === 'profitability') {
    causes.push(...(overview?.topProfitDrivers || []).slice(0, 5).map((driver, index) => driverToRootCause(driver, 'Profit driver', index)));
  } else if (intent === 'product') {
    causes.push(...(overview?.topGrowthDrivers || []).slice(0, 3).map((driver, index) => driverToRootCause(driver, 'Product growth driver', index)));
    causes.push(...(overview?.topDeclineDrivers || []).slice(0, 3).map((driver, index) => driverToRootCause(driver, 'Product decline driver', index)));
  } else {
    causes.push(...(overview?.topGrowthDrivers || []).slice(0, 3).map((driver, index) => driverToRootCause(driver, 'Growth driver', index)));
    causes.push(...(overview?.topDeclineDrivers || []).slice(0, 3).map((driver, index) => driverToRootCause(driver, 'Decline driver', index)));
  }

  if (causes.length === 0) {
    causes.push(...buildChartRootCauses(chartModel, intent));
  }

  return dedupeRootCauses(causes).slice(0, 8);
}

function businessQuestionFor(intent: BusinessBrainIntent, action: AnalysisAction): string {
  if (intent === 'payment') return 'How is value split across payment methods, and does the mix create cash-flow or receivable risk?';
  if (intent === 'logistics') return 'How do delivery status, carrier model, and delivery cost affect operational performance and profit?';
  if (intent === 'profitability') return 'Where did profit or margin move, and which business drivers explain the change?';
  if (intent === 'product') return 'Which products or items drive value, growth, decline, or margin risk?';
  if (intent === 'money') return 'How did money movement change across periods, and where should the decision maker focus?';
  if (intent === 'operations') return 'Which operational status, quantity, or movement pattern needs attention?';
  return action.description || 'What business answer does this selected angle support?';
}

function hasAvailableSignal(input: {
  action: AnalysisAction;
  chartModel: ChartPreviewModel | null;
  overview: BusinessFusionOverview | undefined;
}, candidates: string[]): boolean {
  const actionFields = [
    input.action.opportunityName,
    input.action.label,
    input.action.description,
    ...input.action.dimensions,
    ...input.action.measures
  ];
  const chartFieldList = chartFields(input.chartModel);
  const overviewFields = input.overview?.metrics.flatMap(metric => [metric.metricId, metric.label]) ?? [];
  return [...actionFields, ...chartFieldList, ...overviewFields].some(field => fieldMatches(field, candidates));
}

function buildMissingEvidence(input: {
  action: AnalysisAction;
  chartModel: ChartPreviewModel | null;
  overview: BusinessFusionOverview | undefined;
  intent: BusinessBrainIntent;
}): BusinessBrainMissingEvidence[] {
  const { action, chartModel, overview, intent } = input;
  const missing: BusinessBrainMissingEvidence[] = [];
  const hasProfit = hasAvailableSignal({ action, chartModel, overview }, ['profit', 'margin', 'gross_profit', 'gross profit']);
  const hasDeliveryFee = hasAvailableSignal({ action, chartModel, overview }, ['delivery fee', 'shipping fee', 'freight', 'transport cost', 'phi giao', 'van chuyen']);

  if ((intent === 'payment' || intent === 'profitability') && !hasProfit) {
    missing.push({
      id: 'missing_profit_signal',
      label: 'Profit or margin evidence',
      neededFor: 'profitability conclusion',
      reason: 'Revenue or payment mix alone is not enough to claim profit impact.'
    });
  }

  if (intent === 'logistics' && !hasDeliveryFee) {
    missing.push({
      id: 'missing_delivery_fee',
      label: 'Delivery fee or transport cost',
      neededFor: 'logistics cost impact',
      reason: 'Carrier performance can be counted, but cost impact needs a delivery-fee or transport-cost measure.'
    });
  }

  if (intent === 'logistics') {
    missing.push({
      id: 'missing_fleet_investment_inputs',
      label: 'Fleet investment inputs',
      neededFor: 'buy more internal vehicles decision',
      reason: 'A buy-vs-outsource recommendation needs CAPEX, depreciation, maintenance, driver salary, vehicle capacity, and utilization data.'
    });
  }

  return missing;
}

function buildRisks(
  overview: BusinessFusionOverview | undefined,
  intent: BusinessBrainIntent,
  missingEvidence: BusinessBrainMissingEvidence[],
  kpis: BusinessBrainKpi[],
  variance: BusinessBrainKpi[]
): BusinessBrainRisk[] {
  const risks: BusinessBrainRisk[] = [
    ...(overview?.riskSignals || []).map(signal => ({
      id: signal.id,
      severity: signal.severity,
      title: signal.title,
      message: signal.message,
      evidence: signal.evidence
    }))
  ];

  const findKpi = (id: string) => kpis.find(kpi => kpi.id === id);
  const topShare = kpis.find(kpi => /(top_share|^share_)/.test(kpi.id) && (kpi.value ?? 0) > 0.5);
  if (topShare?.value !== undefined) {
    risks.push({
      id: 'concentration_risk',
      severity: topShare.value > 0.7 ? 'high' : 'medium',
      title: 'Concentration risk',
      message: `${topShare.label} is ${formatNarrativeNumber(topShare.value, true)}, so the decision may depend heavily on one segment.`,
      evidence: [topShare.id, topShare.source]
    });
  }

  for (const check of overview?.reconciliationChecks ?? []) {
    if (check.severity === 'low') continue;
    risks.push({
      id: fieldMatches(check.label, ['revenue']) ? 'revenue_gap' : `reconciliation_gap_${check.id}`,
      severity: check.severity,
      title: fieldMatches(check.label, ['revenue']) ? 'Revenue gap' : `${check.label} gap`,
      message: `${check.label} gap is ${formatNarrativeNumber(check.gap)}${check.gapPercent !== null ? ` (${formatNarrativeNumber(check.gapPercent, true)})` : ''}.`,
      evidence: [check.id, check.label]
    });
  }

  if ((overview?.sources.length ?? 0) > 1 && (overview?.objectKeys.length ?? 0) === 0) {
    risks.push({
      id: 'missing_shared_key_risk',
      severity: 'high',
      title: 'Missing shared key risk',
      message: 'Multiple datasets were combined without a reliable shared business key, so cross-file conclusions may be incomplete.',
      evidence: ['objectKeys']
    });
  }

  const weakKey = (overview?.objectKeys ?? []).find(key => key.coverage < 0.9);
  if (weakKey) {
    risks.push({
      id: 'key_coverage_risk',
      severity: weakKey.coverage < 0.7 ? 'high' : 'medium',
      title: 'Key coverage risk',
      message: `${weakKey.key} matches ${formatNarrativeNumber(weakKey.coverage, true)} of the related evidence, so some joined analysis may be partial.`,
      evidence: [weakKey.key, ...weakKey.families]
    });
  }

  const relationshipWarning = [...(overview?.crossChecks ?? []), ...(overview?.caveats ?? [])]
    .find(item => /(many to many|many-to-many|duplicate|relationship|join|key)/i.test(item));
  if (relationshipWarning) {
    risks.push({
      id: 'relationship_risk',
      severity: 'medium',
      title: 'Relationship risk',
      message: relationshipWarning,
      evidence: ['crossChecks', 'caveats']
    });
  }

  const costSpike = variance.find(kpi => {
    const text = normalize(`${kpi.id} ${kpi.label} ${kpi.source}`);
    return /(cost|fee|delivery|freight|shipping)/.test(text)
      && (kpi.delta ?? 0) > 0
      && (kpi.deltaPercent ?? 0) > 0.2;
  });
  if (costSpike) {
    risks.push({
      id: fieldMatches(costSpike.label, ['delivery', 'shipping', 'freight']) ? 'delivery_fee_spike' : 'cost_spike',
      severity: (costSpike.deltaPercent ?? 0) > 0.5 ? 'high' : 'medium',
      title: fieldMatches(costSpike.label, ['delivery', 'shipping', 'freight']) ? 'Delivery fee spike' : 'Cost spike',
      message: `${costSpike.label} increased by ${formatNarrativeNumber(costSpike.delta)}${costSpike.deltaPercent !== null && costSpike.deltaPercent !== undefined ? ` (${formatNarrativeNumber(costSpike.deltaPercent, true)})` : ''}.`,
      evidence: [costSpike.id, costSpike.source]
    });
  }

  const margin = findKpi('margin_pct')?.value;
  if (margin !== undefined && margin < 0.12) {
    risks.push({
      id: 'low_margin',
      severity: margin < 0.05 ? 'high' : 'medium',
      title: 'Low margin',
      message: `Margin is ${formatNarrativeNumber(margin, true)}, so profitability needs review before scaling this segment.`,
      evidence: ['margin_pct']
    });
  }

  const receivableExposure = findKpi('payment_receivable_exposure')?.value ?? findKpi('ar_debit')?.value;
  if (receivableExposure !== undefined && receivableExposure > 0.3 && receivableExposure <= 1) {
    risks.push({
      id: 'high_ar_exposure',
      severity: receivableExposure > 0.5 ? 'high' : 'medium',
      title: 'High receivable exposure',
      message: `Receivable exposure is ${formatNarrativeNumber(receivableExposure, true)}, which can pressure cash collection.`,
      evidence: ['payment_receivable_exposure', 'ar_debit']
    });
  }

  const deferredShare = findKpi('deferred_payment_share')?.value;
  if (deferredShare !== undefined && deferredShare > 0.3) {
    risks.push({
      id: 'high_deferred_payment_share',
      severity: deferredShare > 0.45 ? 'high' : 'medium',
      title: 'High deferred payment share',
      message: `Deferred payment share is ${formatNarrativeNumber(deferredShare, true)}, so cash timing should be reviewed.`,
      evidence: ['deferred_payment_share']
    });
  }

  const deliveryFeeToRevenue = findKpi('delivery_fee_to_revenue')?.value;
  if (deliveryFeeToRevenue !== undefined && deliveryFeeToRevenue > 0.08) {
    risks.push({
      id: 'delivery_fee_pressure',
      severity: deliveryFeeToRevenue > 0.15 ? 'high' : 'medium',
      title: 'Delivery fee pressure',
      message: `Delivery fee is ${formatNarrativeNumber(deliveryFeeToRevenue, true)} of revenue in this evidence set.`,
      evidence: ['delivery_fee_to_revenue']
    });
  }

  const deliveryFeeToProfit = findKpi('delivery_fee_to_profit')?.value;
  if (deliveryFeeToProfit !== undefined && deliveryFeeToProfit > 0.25) {
    risks.push({
      id: 'delivery_fee_pressure',
      severity: deliveryFeeToProfit > 0.5 ? 'high' : 'medium',
      title: 'Delivery fee pressure',
      message: `Delivery fee is ${formatNarrativeNumber(deliveryFeeToProfit, true)} of profit in this evidence set.`,
      evidence: ['delivery_fee_to_profit']
    });
  }

  const externalCarrierShare = findKpi('external_carrier_share')?.value;
  if (externalCarrierShare !== undefined && externalCarrierShare > 0.6) {
    risks.push({
      id: 'outsourced_carrier_dependency',
      severity: externalCarrierShare > 0.8 ? 'high' : 'medium',
      title: 'Outsourced carrier dependency',
      message: `External carrier share is ${formatNarrativeNumber(externalCarrierShare, true)}, so cost and SLA exposure should be reviewed.`,
      evidence: ['external_carrier_share']
    });
  }

  const fulfilledRate = findKpi('fulfilled_rate')?.value;
  if (fulfilledRate !== undefined && fulfilledRate < 0.9) {
    risks.push({
      id: 'low_fulfilled_rate',
      severity: fulfilledRate < 0.75 ? 'high' : 'medium',
      title: 'Low fulfilled delivery rate',
      message: `Fulfilled delivery rate is ${formatNarrativeNumber(fulfilledRate, true)}, so retry/cancelled delivery should be investigated.`,
      evidence: ['fulfilled_rate']
    });
  }

  if (intent === 'logistics') {
    risks.push({
      id: 'possible_outsourced_carrier_dependency',
      severity: 'medium',
      title: 'Possible outsourced carrier dependency',
      message: 'Carrier and delivery-fee evidence should be checked before deciding whether internal vehicles can absorb outsourced volume.',
      evidence: ['carrier', 'delivery_fee', 'delivery_status']
    });
  }

  if (missingEvidence.length > 0) {
    risks.push({
      id: 'decision_evidence_gap',
      severity: 'medium',
      title: 'Decision evidence gap',
      message: `${missingEvidence.length} evidence gap(s) prevent a fully confident decision recommendation.`,
      evidence: missingEvidence.map(item => item.label)
    });
  }

  return dedupeRisks(risks).slice(0, 12);
}

function buildRecommendations(
  intent: BusinessBrainIntent,
  missingEvidence: BusinessBrainMissingEvidence[],
  rootCauses: BusinessBrainRootCause[],
  risks: BusinessBrainRisk[]
): BusinessBrainRecommendation[] {
  const recommendations: BusinessBrainRecommendation[] = [];

  if (rootCauses.length > 0) {
    recommendations.push({
      type: 'investigate',
      priority: 'medium',
      title: 'Investigate the strongest driver',
      action: `Start with ${rootCauses[0].label}; it has the clearest evidence in this selected angle.`
    });
  }

  if (intent === 'logistics') {
    recommendations.push({
      type: missingEvidence.some(item => item.id === 'missing_fleet_investment_inputs') ? 'need_more_data' : 'investigate',
      priority: 'high',
      title: 'Validate internal vs outsourced delivery economics',
      action: 'Compare completed delivery share, outsourced delivery fee, and profit impact before deciding whether to shift volume to internal vehicles.'
    });
  }

  if (intent === 'payment') {
    recommendations.push({
      type: 'investigate',
      priority: 'medium',
      title: 'Review cash-flow exposure',
      action: 'Compare cash, installment, transfer, and receivable exposure by period, store, and product before acting on payment mix.'
    });
  }

  if (risks.some(risk => risk.id === 'low_margin' || risk.id === 'delivery_fee_pressure')) {
    recommendations.push({
      type: 'investigate',
      priority: 'high',
      title: 'Protect margin before scaling',
      action: 'Drill into product, store, payment, and logistics cost drivers before increasing volume in this segment.'
    });
  }

  if (risks.some(risk => risk.id === 'high_ar_exposure' || risk.id === 'high_deferred_payment_share')) {
    recommendations.push({
      type: 'investigate',
      priority: 'high',
      title: 'Review collection and payment terms',
      action: 'Compare deferred payment and receivable exposure by customer, product, store, and period.'
    });
  }

  const hasBlockingGap = missingEvidence.length > 0;
  const hasHighRisk = risks.some(risk => risk.severity === 'high');
  if (!hasBlockingGap && !hasHighRisk && rootCauses.length > 0) {
    recommendations.push({
      type: 'do_now',
      priority: 'medium',
      title: 'Use this angle as the decision baseline',
      action: `Use ${rootCauses[0].label} as the first review point, then validate the listed KPI evidence before execution.`
    });
  }

  if (missingEvidence.length > 0) {
    recommendations.push({
      type: 'need_more_data',
      priority: 'high',
      title: 'Collect missing decision evidence',
      action: `Add ${missingEvidence.slice(0, 3).map(item => item.label).join(', ')} to raise decision readiness.`
    });
  }

  return recommendations.slice(0, 4);
}

function readinessFor(kpis: BusinessBrainKpi[], rootCauses: BusinessBrainRootCause[], missingEvidence: BusinessBrainMissingEvidence[]): BusinessBrainReadiness {
  if (kpis.length === 0 && rootCauses.length === 0) return 'blocked';
  if (missingEvidence.length > 0) return 'partial';
  return 'ready';
}

function buildEvidence(input: {
  kpis: BusinessBrainKpi[];
  variance: BusinessBrainKpi[];
  rootCauses: BusinessBrainRootCause[];
  risks: BusinessBrainRisk[];
  missingEvidence: BusinessBrainMissingEvidence[];
}): BusinessBrainEvidence[] {
  const kpiEvidence = input.kpis.slice(0, 6).map(kpi => ({
    id: `evidence_kpi_${kpi.id}`,
    type: 'kpi' as const,
    label: kpi.label,
    source: kpi.source,
    confidence: kpi.confidence,
    details: [
      kpi.formula ? `Formula: ${kpi.formula}` : null,
      kpi.sourceColumns?.length ? `Columns: ${kpi.sourceColumns.join(', ')}` : null,
      `Value: ${kpiNarrativeValue(kpi)}`
    ].filter((item): item is string => Boolean(item))
  }));

  const varianceEvidence = input.variance.slice(0, 4).map(kpi => ({
    id: `evidence_variance_${kpi.id}`,
    type: 'variance' as const,
    label: kpi.label,
    source: kpi.source,
    confidence: kpi.confidence,
    details: [
      kpi.formula ? `Formula: ${kpi.formula}` : null,
      kpi.sourceColumns?.length ? `Columns: ${kpi.sourceColumns.join(', ')}` : null,
      `${formatNarrativeNumber(kpi.previousValue)} -> ${formatNarrativeNumber(kpi.currentValue)}, delta ${formatNarrativeNumber(kpi.delta)}`
    ].filter((item): item is string => Boolean(item))
  }));

  const rootCauseEvidence = input.rootCauses.slice(0, 5).map(cause => ({
    id: `evidence_root_${cause.id}`,
    type: 'root_cause' as const,
    label: cause.label,
    source: cause.dimension ?? cause.level ?? 'root cause',
    details: cause.evidence
  }));

  const riskEvidence = input.risks.slice(0, 5).map(risk => ({
    id: `evidence_risk_${risk.id}`,
    type: 'risk' as const,
    label: risk.title,
    source: risk.severity,
    details: [risk.message, ...risk.evidence]
  }));

  const missingEvidence = input.missingEvidence.slice(0, 5).map(item => ({
    id: `evidence_missing_${item.id}`,
    type: 'missing_evidence' as const,
    label: item.label,
    source: item.neededFor,
    details: [item.reason]
  }));

  return [...kpiEvidence, ...varianceEvidence, ...rootCauseEvidence, ...riskEvidence, ...missingEvidence];
}

function buildNextQuestions(input: {
  intent: BusinessBrainIntent;
  rootCauses: BusinessBrainRootCause[];
  risks: BusinessBrainRisk[];
  missingEvidence: BusinessBrainMissingEvidence[];
}): string[] {
  const { intent, rootCauses, risks, missingEvidence } = input;
  const questions: string[] = [];
  const leadCause = rootCauses[0];

  if (missingEvidence.length > 0) {
    questions.push(`What data can close the ${missingEvidence[0].label.toLowerCase()} gap?`);
  }

  if (intent === 'payment') {
    questions.push('Which store, product, or customer segment is driving deferred payment and receivable exposure?');
  } else if (intent === 'logistics') {
    questions.push('Which carrier or delivery status contributes the most delivery cost and retry risk?');
  } else if (intent === 'product') {
    questions.push('Which product category or store explains the largest value concentration?');
  } else if (intent === 'profitability') {
    questions.push('Which product, store, payment method, or logistics driver explains the margin movement?');
  } else if (intent === 'money') {
    questions.push('Which business dimension explains the period-over-period money movement?');
  }

  if (risks.some(risk => risk.id === 'delivery_fee_pressure')) {
    questions.push('Is delivery fee pressure coming from carrier mix, delivery status, or product/store concentration?');
  }
  if (risks.some(risk => risk.id === 'concentration_risk')) {
    questions.push('Can the result be diversified across more products, stores, customers, or carriers?');
  }
  if (risks.some(risk => risk.id === 'revenue_gap' || risk.id === 'relationship_risk' || risk.id === 'key_coverage_risk')) {
    questions.push('Which source rows or shared keys should be reconciled before using this as a final decision?');
  }
  if (risks.some(risk => risk.id === 'high_ar_exposure' || risk.id === 'high_deferred_payment_share')) {
    questions.push('Which customers or stores should be reviewed first for collection risk?');
  }
  if (leadCause) {
    questions.push(`What changed inside ${leadCause.label} compared with the previous period or plan?`);
  }

  return questions.filter((question, index, values) => values.indexOf(question) === index).slice(0, 4);
}

export function createBusinessBrainBrief(input: {
  action: AnalysisAction;
  chartModel: ChartPreviewModel | null;
  overview?: BusinessFusionOverview;
}): BusinessBrainBrief {
  const { action, chartModel, overview } = input;
  const intent = inferBusinessBrainIntent(action, chartModel);
  const metrics = pickMetrics(overview, intent);
  const kpis = dedupeKpis([
    ...canonicalChartKpis(chartModel),
    ...selectedAngleChartKpis(chartModel, intent),
    ...chartDistributionKpis(chartModel, intent),
    ...metrics.map(metricToKpi)
  ]);
  const variance = dedupeKpis([
    ...buildPlanVariance(chartModel),
    ...buildChartVariance(chartModel),
    ...kpis.filter(kpi => kpi.delta !== undefined)
  ]);
  const rootCauses = buildRootCauses(overview, chartModel, intent);
  const missingEvidence = buildMissingEvidence({ action, chartModel, overview, intent });
  const risks = buildRisks(overview, intent, missingEvidence, kpis, variance);
  const recommendations = buildRecommendations(intent, missingEvidence, rootCauses, risks);
  const nextQuestions = buildNextQuestions({ intent, rootCauses, risks, missingEvidence });
  const evidence = buildEvidence({ kpis, variance, rootCauses, risks, missingEvidence });
  const readiness = readinessFor(kpis, rootCauses, missingEvidence);
  const businessQuestion = businessQuestionFor(intent, action);

  const leadKpi = kpis[0];
  const leadCause = rootCauses[0];
  const mainAnswer = leadKpi?.delta !== undefined
    ? `${leadKpi.label} moved by ${formatNarrativeNumber(leadKpi.delta)}. ${leadCause ? `The strongest visible driver is ${leadCause.label}.` : ''}`.trim()
    : leadKpi
      ? `${leadKpi.label} is ${kpiNarrativeValue(leadKpi)}. ${leadCause ? `The strongest visible driver is ${leadCause.label}.` : 'Use this KPI as the first reading for the selected angle.'}`.trim()
    : leadCause
      ? `${leadCause.label} is the strongest visible driver for this selected angle.`
      : readiness === 'blocked'
        ? 'LightBI found the angle, but there is not enough structured evidence to produce a safe BA answer yet.'
        : 'LightBI found directional evidence for this selected angle.';

  return {
    angle: action.opportunityName || action.label,
    intent,
    readiness,
    businessQuestion,
    dataCoverage: {
      recognized: [
        ...action.dimensions,
        ...action.measures,
        ...(chartModel?.xField ? [chartModel.xField] : []),
        ...(chartModel?.yField ? [chartModel.yField] : []),
        ...metrics.map(metric => metric.label)
      ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index),
      partial: missingEvidence.map(item => item.neededFor),
      missing: missingEvidence
    },
    kpis,
    variance,
    rootCauses,
    risks,
    recommendations,
    missingEvidence,
    nextQuestions,
    evidence,
    narrative: {
      headline: `${action.opportunityName || action.label} - ${readiness.toUpperCase()}`,
      businessQuestion,
      mainAnswer,
      sections: [
        {
          title: 'KPI',
          body: kpis.length > 0 ? 'LightBI found measurable evidence for this angle.' : 'No safe KPI was found for this angle yet.',
          bullets: kpis.slice(0, 5).map(kpi => `${kpi.label}: ${kpiNarrativeValue(kpi)}${kpi.delta !== undefined ? `, delta ${formatNarrativeNumber(kpi.delta)}` : ''}`)
        },
        {
          title: 'Variance',
          body: variance.length > 0 ? 'LightBI compared current and previous evidence where possible.' : 'No safe period or baseline comparison was available.',
          bullets: variance.slice(0, 5).map(kpi => `${kpi.label}: ${formatNarrativeNumber(kpi.previousValue)} -> ${formatNarrativeNumber(kpi.currentValue)}, delta ${formatNarrativeNumber(kpi.delta)}${kpi.deltaPercent !== undefined && kpi.deltaPercent !== null ? ` (${formatNarrativeNumber(kpi.deltaPercent, true)})` : ''}`)
        },
        {
          title: 'Root cause',
          body: rootCauses.length > 0 ? 'LightBI ranked the strongest available drivers across the available drill path.' : 'No driver ranking was available.',
          bullets: rootCauses.slice(0, 6).map(cause => `${cause.level ? `${cause.level}: ` : ''}${cause.label}${cause.value !== undefined ? ` (${formatNarrativeNumber(cause.value)})` : ''}${cause.delta !== undefined ? `, delta ${formatNarrativeNumber(cause.delta)}` : ''}`)
        },
        {
          title: 'Risk',
          body: risks.length > 0 ? 'LightBI detected risks that may affect the decision.' : 'No major business risk was generated for this angle.',
          bullets: risks.slice(0, 5).map(risk => `${risk.title}: ${risk.message}`)
        },
        {
          title: 'Recommendation',
          body: recommendations.length > 0 ? 'LightBI generated next actions from the available evidence.' : 'No recommendation can be made safely yet.',
          bullets: recommendations.slice(0, 5).map(recommendation => `${recommendation.title}: ${recommendation.action}`)
        },
        {
          title: 'Next question',
          body: nextQuestions.length > 0 ? 'LightBI suggests the next BA question to continue the investigation.' : 'No next question was generated yet.',
          bullets: nextQuestions
        },
        {
          title: 'Evidence',
          body: evidence.length > 0 ? 'LightBI kept the key evidence behind this answer for audit.' : 'No evidence bundle was generated yet.',
          bullets: evidence.slice(0, 8).map(item => `${item.label}: ${item.details.join('; ')}`)
        },
        {
          title: 'Missing evidence',
          body: missingEvidence.length > 0 ? 'The answer is useful directionally but not complete for final decision-making.' : 'No major missing evidence was detected for this selected angle.',
          bullets: missingEvidence.map(item => `${item.label}: ${item.reason}`)
        }
      ]
    }
  };
}
