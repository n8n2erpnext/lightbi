import type { AnalysisAction } from './analysis-opportunity-actions';
import type { ChartPreviewModel } from './chart-preview-model';
import type { BusinessFusionOverview, FusionDriver, FusionMetricDelta } from './business-fusion-overview';
import type { BusinessBrainIntent, BusinessBrainKpi, BusinessBrainRootCause, BusinessBrainRisk } from './business-brain-brief';

const DRILL_DIMENSIONS: Array<{ level: string; candidates: string[] }> = [
  { level: 'product', candidates: ['product', 'item', 'sku', 'hang hoa', 'san pham'] },
  { level: 'category', candidates: ['category', 'segment', 'line', 'nhom', 'loai'] },
  { level: 'store', candidates: ['store', 'branch', 'location', 'warehouse', 'kho', 'chi nhanh'] },
  { level: 'salesperson', candidates: ['salesperson', 'sales person', 'employee', 'staff', 'seller', 'nhan vien'] },
  { level: 'payment', candidates: ['payment', 'method', 'thanh toan', 'tien mat', 'tra gop'] },
  { level: 'carrier', candidates: ['carrier', 'courier', 'shipper', 'provider', 'fleet', 'van tai', 'don vi van chuyen'] },
  { level: 'delivery_status', candidates: ['delivery status', 'shipment status', 'status', 'trang thai'] }
];

export function normalize(value: string | undefined): string {
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


export function pickMetrics(overview: BusinessFusionOverview | undefined, intent: BusinessBrainIntent): FusionMetricDelta[] {
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


export function metricToKpi(metric: FusionMetricDelta): BusinessBrainKpi {
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


export function formatNarrativeNumber(value: number | null | undefined, asPercent = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'available';
  if (asPercent) return `${Math.round(value * 100)}%`;
  return new Intl.NumberFormat('en-US', {
    notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(value) >= 1_000_000 ? 1 : 2
  }).format(value);
}


export function kpiNarrativeValue(kpi: BusinessBrainKpi): string {
  const value = kpi.value ?? kpi.currentValue;
  const shouldFormatPercent = value !== undefined && value >= 0 && value <= 1 && /share|rate|margin|pct/i.test(`${kpi.id} ${kpi.label}`);
  return formatNarrativeNumber(value, shouldFormatPercent);
}


export function fieldMatches(field: string | undefined, candidates: string[]): boolean {
  const text = normalize(field);
  return candidates.some(candidate => text.includes(normalize(candidate)));
}


export function firstMatchingField(fields: string[], candidates: string[]): string | null {
  return fields.find(field => fieldMatches(field, candidates)) ?? null;
}


export function chartFields(chartModel: ChartPreviewModel | null): string[] {
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


export function canonicalChartKpis(chartModel: ChartPreviewModel | null): BusinessBrainKpi[] {
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


export function selectedAngleChartKpis(chartModel: ChartPreviewModel | null, intent: BusinessBrainIntent): BusinessBrainKpi[] {
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


export function chartDistributionKpis(chartModel: ChartPreviewModel | null, intent: BusinessBrainIntent): BusinessBrainKpi[] {
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


export function dedupeKpis(kpis: BusinessBrainKpi[]): BusinessBrainKpi[] {
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


export function dedupeRisks(risks: BusinessBrainRisk[]): BusinessBrainRisk[] {
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


export function buildChartVariance(chartModel: ChartPreviewModel | null): BusinessBrainKpi[] {
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


export function buildPlanVariance(chartModel: ChartPreviewModel | null): BusinessBrainKpi[] {
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


export function buildRootCauses(overview: BusinessFusionOverview | undefined, chartModel: ChartPreviewModel | null, intent: BusinessBrainIntent): BusinessBrainRootCause[] {
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
