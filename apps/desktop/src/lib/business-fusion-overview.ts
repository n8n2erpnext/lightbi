import type { DatasetFamily } from './batch-inspection';
import { profileColumns, type ColumnProfile } from './column-profiler';

export type BusinessDatasetRole = 'sales' | 'accounting' | 'logistics' | 'inventory' | 'unknown';

export interface FusionDatasetSource {
  familyId: string;
  familyName: string;
  role: BusinessDatasetRole;
  files: string[];
  rows: number;
  columns: string[];
}

export interface FusionKeyMatch {
  key: string;
  families: string[];
  coverage: number;
}

export interface FusionMetricDelta {
  metricId: string;
  label: string;
  previousValue: number;
  currentValue: number;
  delta: number;
  deltaPercent: number | null;
  sourceRole: BusinessDatasetRole;
}

export interface FusionDriver {
  key: string;
  dimension: string;
  metricId: string;
  previousValue: number;
  currentValue: number;
  delta: number;
  deltaPercent: number | null;
}

export interface FusionNarrativeSection {
  id: string;
  title: string;
  tone: 'positive' | 'negative' | 'warning' | 'neutral';
  summary: string;
  bullets: string[];
}

export interface FusionRiskSignal {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  evidence: string[];
}

export interface FusionReconciliationCheck {
  id: string;
  label: string;
  previousValue: number;
  currentValue: number;
  gap: number;
  gapPercent: number | null;
  severity: 'high' | 'medium' | 'low';
}

export interface BusinessFusionOverview {
  status: 'ready' | 'partial' | 'blocked';
  title: string;
  periodLabels: string[];
  objectKeys: FusionKeyMatch[];
  sources: FusionDatasetSource[];
  metrics: FusionMetricDelta[];
  topGrowthDrivers: FusionDriver[];
  topDeclineDrivers: FusionDriver[];
  topProfitDrivers: FusionDriver[];
  crossChecks: string[];
  reconciliationChecks: FusionReconciliationCheck[];
  narrativeSections: FusionNarrativeSection[];
  riskSignals: FusionRiskSignal[];
  executiveSummary: string;
  caveats: string[];
  readinessScore: number;
}

export interface BusinessFusionVirtualDataset {
  id: string;
  name: string;
  objectKey: FusionKeyMatch | null;
  columns: string[];
  rows: Row[];
  profiles: Record<string, ColumnProfile>;
  understandingColumns: string[];
  understandingRows: Row[];
  understandingProfiles: Record<string, ColumnProfile>;
  understandingSourceRowCount: number;
  overview: BusinessFusionOverview;
  evidenceBundles: Record<string, FusionEvidenceBundle>;
}

export interface FusionEvidenceRow {
  role: BusinessDatasetRole;
  familyName: string;
  period: string;
  rowIndex: number;
  row: Row;
}

export interface FusionEvidenceBundle {
  fusionRowId: string;
  period: string;
  objectKeyType: string;
  objectKey: string;
  rows: FusionEvidenceRow[];
}

type Row = Record<string, unknown>;

interface FamilyDataset {
  family: DatasetFamily;
  role: BusinessDatasetRole;
  rows: Row[];
  periodRows: Map<string, Row[]>;
  fields: Record<string, string | null>;
}

const ROLE_ALIASES: Record<Exclude<BusinessDatasetRole, 'unknown'>, string[]> = {
  sales: ['revenue', 'netrevenue', 'doanh thu', 'salesperson', 'payment', 'orderstatus', 'status'],
  accounting: ['invoiceno', 'journalno', 'grossprofit', 'marginpct', 'ar debit', 'revenue credit', 'vatoutput'],
  logistics: ['shipmentid', 'pickno', 'carrier', 'deliverystatus', 'deliveryfee', 'shippedat', 'deliveredat'],
  inventory: ['stock', 'inventory', 'ton kho', 'tồn kho', 'warehouse', 'onhand', 'available']
};

const FIELD_ALIASES: Record<string, string[]> = {
  order: ['orderid', 'order id', 'ma don', 'mã đơn'],
  sku: ['sku', 'productid', 'product id', 'ma hang', 'mã hàng'],
  product: ['product', 'productname', 'product name', 'ten san pham', 'tên sản phẩm'],
  category: ['category', 'nganh hang', 'ngành hàng'],
  store: ['store', 'branch', 'shop', 'cua hang', 'cửa hàng'],
  brand: ['brand', 'nhan hang', 'nhãn hàng'],
  customer: ['customer', 'client', 'buyer', 'khach hang', 'khách hàng'],
  salesperson: ['salesperson', 'sales rep', 'sales_rep', 'nhan vien ban', 'nhân viên bán'],
  status: ['status', 'state', 'orderstatus', 'order status', 'trang thai', 'trạng thái'],
  deliveryStatus: ['deliverystatus', 'delivery status', 'fulfillment', 'fulfilled', 'picked', 'packed'],
  payment: ['payment', 'payment method', 'paymentmethod', 'phuong thuc thanh toan', 'hinh thuc thanh toan'],
  carrier: ['carrier', 'courier', 'shipper', 'provider', 'fleet', 'don vi van chuyen', 'nha van chuyen'],
  periodDate: ['orderdate', 'invoiceDate', 'invoicedate', 'shippedat', 'deliveredat', 'date', 'ngay', 'ngày'],
  revenue: ['revenue', 'netrevenue', 'invoice total', 'invoicetotal', 'doanh thu', 'tong tien', 'tổng tiền'],
  invoiceTotal: ['invoice total', 'invoicetotal', 'gross invoice', 'grossinvoice', 'tong hoa don', 'tổng hóa đơn'],
  receivable: ['ar debit', 'ar_debit', 'receivable', 'accounts receivable', 'phai thu', 'phải thu'],
  cost: ['totalcost', 'total cost', 'unitcost', 'unit cost', 'cogs_debit', 'cogsdebit', 'gia von', 'giá vốn'],
  profit: ['grossprofit', 'gross profit', 'profit', 'loi nhuan', 'lợi nhuận'],
  margin: ['marginpct', 'margin pct', 'margin', 'bien loi nhuan', 'biên lợi nhuận'],
  quantity: ['qty', 'quantity', 'so luong', 'số lượng'],
  discount: ['discount', 'chiet khau', 'chiết khấu'],
  deliveryFee: ['deliveryfee', 'delivery fee', 'shipping cost', 'phi giao hang', 'phí giao hàng']
};

function normalize(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value: string): string {
  return normalize(value).replace(/\s/g, '');
}

function cleanRow(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, ''), value]));
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const parsed = Number(value.trim().replace(/\s/g, '').replace(/₫|đ|vnd|usd|\$/gi, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function safePercent(delta: number, base: number): number | null {
  if (!Number.isFinite(base) || Math.abs(base) < 1e-9) return null;
  return delta / Math.abs(base);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function rowsFromFamilyFile(item: DatasetFamily['files'][number]): Row[] {
  if (item.result.status !== 'accessible') return [];
  const metadata = item.result.metadata;
  if (metadata.is_workbook && metadata.default_sheet && metadata.sheets) {
    const sheet = metadata.sheets[metadata.default_sheet];
    return (sheet?.analysis_rows?.length ? sheet.analysis_rows : sheet?.semantic_rows ?? sheet?.preview_rows ?? []).map(cleanRow);
  }
  return (metadata.analysis_rows?.length ? metadata.analysis_rows : metadata.semantic_rows ?? metadata.preview_rows ?? []).map(cleanRow);
}

function rowsFromFamily(family: DatasetFamily): Row[] {
  return family.files.flatMap(rowsFromFamilyFile);
}

function inferRole(columns: string[]): BusinessDatasetRole {
  const normalized = columns.map(compact);
  const score = (role: Exclude<BusinessDatasetRole, 'unknown'>) =>
    ROLE_ALIASES[role].reduce((sum, alias) => {
      const needle = compact(alias);
      return sum + (normalized.some(column => column.includes(needle) || needle.includes(column)) ? 1 : 0);
    }, 0);

  const ranked: Array<{ role: BusinessDatasetRole; score: number }> = [
    { role: 'accounting', score: score('accounting') },
    { role: 'logistics', score: score('logistics') },
    { role: 'inventory', score: score('inventory') },
    { role: 'sales', score: score('sales') }
  ];

  ranked.sort((a, b) => b.score - a.score);

  return ranked[0].score > 0 ? ranked[0].role : 'unknown';
}

function findField(columns: string[], signal: keyof typeof FIELD_ALIASES): string | null {
  const aliases = FIELD_ALIASES[signal].map(compact);
  const exact = columns.find(column => aliases.includes(compact(column)));
  if (exact) return exact;
  return columns.find(column => aliases.some(alias => compact(column).includes(alias) || alias.includes(compact(column)))) ?? null;
}

function buildFields(columns: string[]): Record<string, string | null> {
  return Object.fromEntries(Object.keys(FIELD_ALIASES).map(signal => [signal, findField(columns, signal as keyof typeof FIELD_ALIASES)]));
}

function inferPeriodFromName(name: string, fallback: string): string {
  const normalized = normalize(name);
  const year = normalized.match(/20\d{2}/)?.[0];
  const monthName = normalized.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\b/)?.[1];
  const monthMap: Record<string, string> = {
    jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03', apr: '04', april: '04',
    may: '05', jun: '06', june: '06', jul: '07', july: '07', aug: '08', august: '08', sep: '09', september: '09',
    oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12'
  };
  if (year && monthName) return `${year}-${monthMap[monthName]}`;
  const iso = normalized.match(/(20\d{2})[\s-_/]*(1[0-2]|0?[1-9])/);
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}`;
  return fallback;
}

function periodRowsFromFamily(family: DatasetFamily, rows: Row[]): Map<string, Row[]> {
  const result = new Map<string, Row[]>();
  if (family.files.length === 0) return result;

  for (const item of family.files) {
    const fileRows = rowsFromFamilyFile(item);
    const period = inferPeriodFromName(item.file.name, item.file.name);
    result.set(period, [...(result.get(period) ?? []), ...fileRows]);
  }

  if (result.size === 0) result.set(family.name, rows);
  return result;
}

function sumRows(rows: Row[], field: string | null): number {
  if (!field) return 0;
  return rows.reduce((sum, row) => sum + toNumber(row[field]), 0);
}

function chooseDimension(datasets: FamilyDataset[]): string | null {
  const priority = ['product', 'category', 'store', 'sku', 'brand'];
  const allRows = datasets.flatMap(dataset => dataset.rows);
  for (const signal of priority) {
    const field = datasets.find(dataset => dataset.fields[signal])?.fields[signal];
    if (!field) continue;
    const values = allRows.map(row => row[field]).filter(value => value !== null && value !== undefined && String(value).trim() !== '');
    const unique = new Set(values.map(String)).size;
    if (unique >= 2 && unique <= 250) return field;
  }
  return null;
}

function metricDelta(metricId: string, label: string, previousValue: number, currentValue: number, sourceRole: BusinessDatasetRole): FusionMetricDelta {
  const delta = currentValue - previousValue;
  return {
    metricId,
    label,
    previousValue,
    currentValue,
    delta,
    deltaPercent: safePercent(delta, previousValue),
    sourceRole
  };
}

function buildDrivers(dataset: FamilyDataset | undefined, dimension: string | null, metricField: string | null, metricId: string, periods: string[], limit = 10): { growth: FusionDriver[]; decline: FusionDriver[] } {
  if (!dataset || !dimension || !metricField || periods.length < 2) return { growth: [], decline: [] };
  const previousRows = dataset.periodRows.get(periods[0]) ?? [];
  const currentRows = dataset.periodRows.get(periods[periods.length - 1]) ?? [];
  const values = new Set<string>();
  for (const row of [...previousRows, ...currentRows]) {
    const raw = row[dimension];
    if (raw !== null && raw !== undefined && String(raw).trim() !== '') values.add(String(raw));
  }
  const drivers = Array.from(values).map(key => {
    const prev = sumRows(previousRows.filter(row => String(row[dimension] ?? '') === key), metricField);
    const curr = sumRows(currentRows.filter(row => String(row[dimension] ?? '') === key), metricField);
    const delta = curr - prev;
    return {
      key,
      dimension,
      metricId,
      previousValue: prev,
      currentValue: curr,
      delta,
      deltaPercent: safePercent(delta, prev)
    };
  });

  return {
    growth: drivers.filter(driver => driver.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, limit),
    decline: drivers.filter(driver => driver.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, limit)
  };
}

function buildTopCurrentDrivers(dataset: FamilyDataset | undefined, dimension: string | null, metricField: string | null, metricId: string, periods: string[], limit = 10): FusionDriver[] {
  if (!dataset || !dimension || !metricField || periods.length < 2) return [];
  const previousRows = dataset.periodRows.get(periods[0]) ?? [];
  const currentRows = dataset.periodRows.get(periods[periods.length - 1]) ?? [];
  const values = new Set<string>();
  for (const row of [...previousRows, ...currentRows]) {
    const raw = row[dimension];
    if (raw !== null && raw !== undefined && String(raw).trim() !== '') values.add(String(raw));
  }

  return Array.from(values)
    .map(key => {
      const previousValue = sumRows(previousRows.filter(row => String(row[dimension] ?? '') === key), metricField);
      const currentValue = sumRows(currentRows.filter(row => String(row[dimension] ?? '') === key), metricField);
      const delta = currentValue - previousValue;
      return {
        key,
        dimension,
        metricId,
        previousValue,
        currentValue,
        delta,
        deltaPercent: safePercent(delta, previousValue)
      };
    })
    .filter(driver => driver.currentValue > 0)
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, limit);
}

function metricById(metrics: FusionMetricDelta[], metricId: string): FusionMetricDelta | undefined {
  return metrics.find(metric => metric.metricId === metricId);
}

function formatDelta(metric: FusionMetricDelta | undefined): string {
  if (!metric) return 'not available';
  const direction = metric.delta >= 0 ? 'increased' : 'decreased';
  return `${direction} by ${formatNumber(Math.abs(metric.delta))} (${formatPercent(metric.deltaPercent)})`;
}

function driverBullet(prefix: string, driver: FusionDriver, rank: number): string {
  const direction = driver.delta >= 0 ? '+' : '';
  return `${prefix} #${rank}: ${driver.key} (${direction}${formatNumber(driver.delta)}, ${formatPercent(driver.deltaPercent)}).`;
}

function buildReconciliationChecks(
  sales: FamilyDataset | undefined,
  accounting: FamilyDataset | undefined,
  previousPeriod: string | undefined,
  currentPeriod: string | undefined
): FusionReconciliationCheck[] {
  if (!sales?.fields.revenue || !accounting?.fields.revenue || !previousPeriod || !currentPeriod) return [];

  const previousSales = sumRows(sales.periodRows.get(previousPeriod) ?? [], sales.fields.revenue);
  const previousAccounting = sumRows(accounting.periodRows.get(previousPeriod) ?? [], accounting.fields.revenue);
  const currentSales = sumRows(sales.periodRows.get(currentPeriod) ?? [], sales.fields.revenue);
  const currentAccounting = sumRows(accounting.periodRows.get(currentPeriod) ?? [], accounting.fields.revenue);
  const gap = currentAccounting - currentSales;
  const gapPercent = safePercent(gap, currentSales);
  const severity = gapPercent !== null && Math.abs(gapPercent) > 0.05 ? 'high' : gapPercent !== null && Math.abs(gapPercent) > 0.01 ? 'medium' : 'low';

  return [{
    id: 'sales_accounting_revenue_gap',
    label: `Sales vs accounting revenue gap in ${currentPeriod}`,
    previousValue: previousAccounting - previousSales,
    currentValue: gap,
    gap,
    gapPercent,
    severity
  }];
}

function buildFusionNarrative(input: {
  metrics: FusionMetricDelta[];
  topGrowthDrivers: FusionDriver[];
  topDeclineDrivers: FusionDriver[];
  topProfitDrivers: FusionDriver[];
  reconciliationChecks: FusionReconciliationCheck[];
  caveats: string[];
  periodLabels: string[];
}): FusionNarrativeSection[] {
  const revenue = metricById(input.metrics, 'revenue');
  const profit = metricById(input.metrics, 'profit');
  const quantity = metricById(input.metrics, 'quantity');
  const deliveryFee = metricById(input.metrics, 'delivery_fee');
  const previousPeriod = input.periodLabels[0] ?? 'previous period';
  const currentPeriod = input.periodLabels[input.periodLabels.length - 1] ?? 'current period';
  const sections: FusionNarrativeSection[] = [];

  sections.push({
    id: 'executive_answer',
    title: 'Executive answer',
    tone: revenue && revenue.delta < 0 ? 'negative' : 'positive',
    summary: revenue
      ? `${currentPeriod} revenue ${formatDelta(revenue)} versus ${previousPeriod}${profit ? `, while gross profit ${formatDelta(profit)}` : ''}.`
      : 'LightBI could not identify a reliable revenue metric, so it cannot answer growth direction safely yet.',
    bullets: [
      revenue ? `Previous revenue: ${formatNumber(revenue.previousValue)}.` : 'Revenue evidence is missing.',
      revenue ? `Current revenue: ${formatNumber(revenue.currentValue)}.` : 'Add a revenue, sales amount, invoice total, or transaction value field.',
      profit ? `Gross profit movement: ${formatDelta(profit)}.` : 'Profit evidence is missing, so profit conclusions are blocked.'
    ]
  });

  sections.push({
    id: 'where_changed',
    title: 'Where it changed',
    tone: input.topDeclineDrivers.length > 0 ? 'warning' : 'positive',
    summary: input.topGrowthDrivers.length || input.topDeclineDrivers.length
      ? 'LightBI ranked the strongest growth and decline contributors by the best shared business dimension it detected.'
      : 'No reliable segment driver was found for growth or decline ranking.',
    bullets: [
      ...input.topGrowthDrivers.slice(0, 5).map((driver, index) => driverBullet('Growth', driver, index + 1)),
      ...input.topDeclineDrivers.slice(0, 5).map((driver, index) => driverBullet('Decline', driver, index + 1))
    ]
  });

  const profitLeader = input.topProfitDrivers[0];
  const growthLeader = input.topGrowthDrivers[0];
  sections.push({
    id: 'profitability_answer',
    title: 'Profitability answer',
    tone: profitLeader ? 'positive' : 'warning',
    summary: profitLeader
      ? `${profitLeader.key} currently contributes the highest detected gross profit (${formatNumber(profitLeader.currentValue)}).`
      : 'LightBI will not claim a profit leader until cost, gross profit, margin, or accounting profit evidence is present.',
    bullets: profitLeader
      ? [
          ...input.topProfitDrivers.slice(0, 5).map((driver, index) => `Profit #${index + 1}: ${driver.key} (${formatNumber(driver.currentValue)} current profit, ${formatDelta({
            metricId: driver.metricId,
            label: 'Profit',
            previousValue: driver.previousValue,
            currentValue: driver.currentValue,
            delta: driver.delta,
            deltaPercent: driver.deltaPercent,
            sourceRole: 'accounting'
          })}).`),
          growthLeader && growthLeader.key !== profitLeader.key
            ? `Revenue growth leader (${growthLeader.key}) is not the same as profit leader (${profitLeader.key}), so top revenue should not be treated as top profit.`
            : 'Revenue growth and profit leadership point to the same segment.'
        ].filter(Boolean) as string[]
      : [
          'Add cost, gross profit, margin, storage cost, fee, or accounting profit fields.',
          'Until then, revenue leaders must not be treated as profit leaders.'
        ]
  });

  sections.push({
    id: 'operations_answer',
    title: 'Operational explanation',
    tone: quantity || deliveryFee ? 'neutral' : 'warning',
    summary: quantity || deliveryFee
      ? 'LightBI found operational movement that can explain part of the commercial change.'
      : 'No logistics, stock, quantity, or delivery-fee signal was strong enough to explain the business movement.',
    bullets: [
      quantity ? `Quantity ${formatDelta(quantity)}.` : 'Quantity signal is missing.',
      deliveryFee ? `Delivery fee ${formatDelta(deliveryFee)}.` : 'Delivery fee or shipping cost signal is missing.',
      revenue && quantity ? `Revenue and quantity moved ${Math.sign(revenue.delta) === Math.sign(quantity.delta) ? 'in the same direction, so volume likely contributed.' : 'in different directions, so price/mix/cost may explain the difference.'}` : 'Revenue-volume relationship is not available.'
    ]
  });

  sections.push({
    id: 'decision_caveat',
    title: 'Decision caveat',
    tone: input.caveats.length || input.reconciliationChecks.some(check => check.severity !== 'low') ? 'warning' : 'positive',
    summary: input.caveats.length
      ? 'Use this as a BA overview, but resolve the listed caveats before making a high-impact decision.'
      : 'The detected datasets provide enough cross-domain evidence for a directional decision overview.',
    bullets: [
      ...input.reconciliationChecks.map(check => `${check.label}: ${formatNumber(check.gap)} (${formatPercent(check.gapPercent)}), severity ${check.severity}.`),
      ...input.caveats
    ]
  });

  return sections;
}

function buildFusionRiskSignals(input: {
  reconciliationChecks: FusionReconciliationCheck[];
  topGrowthDrivers: FusionDriver[];
  topProfitDrivers: FusionDriver[];
  caveats: string[];
}): FusionRiskSignal[] {
  const signals: FusionRiskSignal[] = [];

  for (const check of input.reconciliationChecks) {
    if (check.severity !== 'low') {
      signals.push({
        id: check.id,
        severity: check.severity,
        title: 'Revenue reconciliation gap',
        message: `${check.label} is ${formatNumber(check.gap)} (${formatPercent(check.gapPercent)}).`,
        evidence: ['Compare Sales revenue with Accounting revenue before finalizing the decision.']
      });
    }
  }

  const growthLeader = input.topGrowthDrivers[0];
  const profitLeader = input.topProfitDrivers[0];
  if (growthLeader && profitLeader && growthLeader.key !== profitLeader.key) {
    signals.push({
      id: 'profit_revenue_mismatch',
      severity: 'medium',
      title: 'Revenue leader differs from profit leader',
      message: `${growthLeader.key} leads revenue growth, but ${profitLeader.key} leads current gross profit.`,
      evidence: [
        `Growth leader delta: ${formatNumber(growthLeader.delta)}.`,
        `Profit leader current profit: ${formatNumber(profitLeader.currentValue)}.`
      ]
    });
  }

  for (const caveat of input.caveats) {
    signals.push({
      id: `caveat_${compact(caveat).slice(0, 36)}`,
      severity: caveat.toLowerCase().includes('not detected') || caveat.toLowerCase().includes('unavailable') ? 'high' : 'medium',
      title: 'Missing evidence',
      message: caveat,
      evidence: []
    });
  }

  return signals;
}

function buildKeyMatches(datasets: FamilyDataset[]): FusionKeyMatch[] {
  const keySignals = ['order', 'sku', 'product', 'store', 'category', 'brand'];
  return keySignals
    .map(signal => {
      const families = datasets.filter(dataset => dataset.fields[signal]).map(dataset => dataset.family.name);
      return {
        key: signal,
        families,
        coverage: datasets.length > 0 ? families.length / datasets.length : 0
      };
    })
    .filter(match => match.families.length >= 2)
    .sort((a, b) => b.coverage - a.coverage);
}

function datasetsFromFamilies(families: DatasetFamily[]): FamilyDataset[] {
  return families.map(family => {
    const rows = rowsFromFamily(family);
    const columns = family.columns.map(column => column.replace(/^\uFEFF/, ''));
    return {
      family,
      role: inferRole(columns),
      rows,
      periodRows: periodRowsFromFamily(family, rows),
      fields: buildFields(columns)
    } satisfies FamilyDataset;
  });
}

export function createBusinessFusionOverview(families: DatasetFamily[]): BusinessFusionOverview | null {
  if (families.length < 2) return null;

  const datasets = datasetsFromFamilies(families);

  const periodLabels = Array.from(new Set(datasets.flatMap(dataset => Array.from(dataset.periodRows.keys())))).sort();
  const sources = datasets.map(dataset => ({
    familyId: dataset.family.id,
    familyName: dataset.family.name,
    role: dataset.role,
    files: dataset.family.files.map(item => item.file.name),
    rows: dataset.family.totalRows,
    columns: dataset.family.columns
  }));
  const objectKeys = buildKeyMatches(datasets);
  const sales = datasets.find(dataset => dataset.role === 'sales');
  const accounting = datasets.find(dataset => dataset.role === 'accounting');
  const logistics = datasets.find(dataset => dataset.role === 'logistics');
  const inventory = datasets.find(dataset => dataset.role === 'inventory');
  const revenueDataset = accounting?.fields.revenue ? accounting : sales;
  const profitDataset = accounting?.fields.profit ? accounting : datasets.find(dataset => dataset.fields.profit);
  const logisticsDataset = logistics ?? inventory;
  const previousPeriod = periodLabels[0];
  const currentPeriod = periodLabels[periodLabels.length - 1];
  const metrics: FusionMetricDelta[] = [];

  if (previousPeriod && currentPeriod && revenueDataset) {
    metrics.push(metricDelta(
      'revenue',
      'Revenue',
      sumRows(revenueDataset.periodRows.get(previousPeriod) ?? [], revenueDataset.fields.revenue),
      sumRows(revenueDataset.periodRows.get(currentPeriod) ?? [], revenueDataset.fields.revenue),
      revenueDataset.role
    ));
  }
  if (previousPeriod && currentPeriod && profitDataset) {
    metrics.push(metricDelta(
      'profit',
      'Gross profit',
      sumRows(profitDataset.periodRows.get(previousPeriod) ?? [], profitDataset.fields.profit),
      sumRows(profitDataset.periodRows.get(currentPeriod) ?? [], profitDataset.fields.profit),
      profitDataset.role
    ));
  }
  if (previousPeriod && currentPeriod && logisticsDataset) {
    metrics.push(metricDelta(
      'quantity',
      'Quantity',
      sumRows(logisticsDataset.periodRows.get(previousPeriod) ?? [], logisticsDataset.fields.quantity),
      sumRows(logisticsDataset.periodRows.get(currentPeriod) ?? [], logisticsDataset.fields.quantity),
      logisticsDataset.role
    ));
    metrics.push(metricDelta(
      'delivery_fee',
      'Delivery fee',
      sumRows(logisticsDataset.periodRows.get(previousPeriod) ?? [], logisticsDataset.fields.deliveryFee),
      sumRows(logisticsDataset.periodRows.get(currentPeriod) ?? [], logisticsDataset.fields.deliveryFee),
      logisticsDataset.role
    ));
  }

  const dimension = chooseDimension([revenueDataset, profitDataset, logisticsDataset].filter((dataset): dataset is FamilyDataset => Boolean(dataset)));
  const revenueDrivers = buildDrivers(revenueDataset, dimension, revenueDataset?.fields.revenue ?? null, 'revenue', periodLabels);
  const profitDrivers = buildDrivers(profitDataset, dimension, profitDataset?.fields.profit ?? null, 'profit', periodLabels);
  const topProfitDrivers = buildTopCurrentDrivers(profitDataset, dimension, profitDataset?.fields.profit ?? null, 'profit', periodLabels);

  const crossChecks: string[] = [];
  const reconciliationChecks = buildReconciliationChecks(sales, accounting, previousPeriod, currentPeriod);
  for (const check of reconciliationChecks) {
    crossChecks.push(`${check.label}: ${formatNumber(check.gap)} (${formatPercent(check.gapPercent)}), severity ${check.severity}.`);
  }
  if (profitDrivers.growth[0] && revenueDrivers.growth[0] && profitDrivers.growth[0].key !== revenueDrivers.growth[0].key) {
    crossChecks.push(`Top revenue growth (${revenueDrivers.growth[0].key}) is different from top profit growth (${profitDrivers.growth[0].key}).`);
  }
  if (topProfitDrivers[0] && revenueDrivers.growth[0] && topProfitDrivers[0].key !== revenueDrivers.growth[0].key) {
    crossChecks.push(`Highest current profit (${topProfitDrivers[0].key}) is different from top revenue growth (${revenueDrivers.growth[0].key}).`);
  }

  const caveats: string[] = [];
  if (!sales) caveats.push('Sales dataset was not detected.');
  if (!accounting) caveats.push('Accounting dataset was not detected, so profit/reconciliation is weaker.');
  if (!logistics && !inventory) caveats.push('Logistics or inventory dataset was not detected, so operational explanation is weaker.');
  if (objectKeys.length === 0) caveats.push('No shared business key was detected across datasets.');
  if (!profitDataset?.fields.profit) caveats.push('Profit field was not detected, so profit ranking is unavailable.');

  const revenueMetric = metrics.find(metric => metric.metricId === 'revenue');
  const profitMetric = metrics.find(metric => metric.metricId === 'profit');
  const readinessScore = Math.max(0, Math.min(100, 45
    + (sales ? 12 : 0)
    + (accounting ? 16 : 0)
    + (logistics || inventory ? 12 : 0)
    + (objectKeys.length > 0 ? 10 : 0)
    + (profitDataset?.fields.profit ? 10 : 0)
    - Math.min(25, caveats.length * 6)));

  const status: BusinessFusionOverview['status'] = readinessScore >= 75 ? 'ready' : readinessScore >= 45 ? 'partial' : 'blocked';
  const executiveSummary = revenueMetric
    ? `${currentPeriod} revenue ${revenueMetric.delta >= 0 ? 'increased' : 'decreased'} by ${formatNumber(Math.abs(revenueMetric.delta))} vs ${previousPeriod}${profitMetric ? `; gross profit ${profitMetric.delta >= 0 ? 'increased' : 'decreased'} by ${formatNumber(Math.abs(profitMetric.delta))}` : ''}.`
    : 'LightBI needs a revenue-capable sales or accounting dataset before it can produce a full commercial overview.';
  const narrativeSections = buildFusionNarrative({
    metrics,
    topGrowthDrivers: revenueDrivers.growth,
    topDeclineDrivers: revenueDrivers.decline,
    topProfitDrivers,
    reconciliationChecks,
    caveats,
    periodLabels
  });
  const riskSignals = buildFusionRiskSignals({
    reconciliationChecks,
    topGrowthDrivers: revenueDrivers.growth,
    topProfitDrivers,
    caveats
  });

  return {
    status,
    title: 'Business overview across Sales, Accounting, Logistics, and Inventory',
    periodLabels,
    objectKeys,
    sources,
    metrics,
    topGrowthDrivers: revenueDrivers.growth,
    topDeclineDrivers: revenueDrivers.decline,
    topProfitDrivers,
    crossChecks,
    reconciliationChecks,
    narrativeSections,
    riskSignals,
    executiveSummary,
    caveats,
    readinessScore
  };
}

function ensureFusedRow(rows: Map<string, Row>, period: string, objectKeyType: string, objectKey: string): Row {
  const id = `${period}::${objectKeyType}::${objectKey}`;
  const existing = rows.get(id);
  if (existing) return existing;
  const row: Row = {
    fusion_row_id: id,
    period,
    object_key_type: objectKeyType,
    object_key: objectKey,
    sales_revenue: 0,
    accounting_revenue: 0,
    gross_profit: 0,
    logistics_quantity: 0,
    delivery_fee: 0,
    total_cost: 0,
    discount_amount: 0,
    product: '',
    category: '',
    store: '',
    sku: '',
    brand: '',
    customer: '',
    salesperson: '',
    payment: '',
    carrier: '',
    status: '',
    delivery_status: '',
    invoice_total: 0,
    ar_debit: 0,
    sales_rows: 0,
    accounting_rows: 0,
    logistics_rows: 0,
    inventory_rows: 0,
    source_roles: ''
  };
  rows.set(id, row);
  return row;
}

function ensureEvidenceBundle(bundles: Map<string, FusionEvidenceBundle>, period: string, objectKeyType: string, objectKey: string): FusionEvidenceBundle {
  const id = `${period}::${objectKeyType}::${objectKey}`;
  const existing = bundles.get(id);
  if (existing) return existing;
  const bundle: FusionEvidenceBundle = {
    fusionRowId: id,
    period,
    objectKeyType,
    objectKey,
    rows: []
  };
  bundles.set(id, bundle);
  return bundle;
}

function addNumber(row: Row, column: string, value: number): void {
  row[column] = toNumber(row[column]) + value;
}

function setFirstText(row: Row, column: string, value: unknown): void {
  if (row[column] !== null && row[column] !== undefined && String(row[column]).trim() !== '') return;
  if (value === null || value === undefined || String(value).trim() === '') return;
  row[column] = String(value).trim();
}

function appendRole(row: Row, role: BusinessDatasetRole): void {
  if (role === 'unknown') return;
  const roles = new Set(String(row.source_roles ?? '').split(',').map(item => item.trim()).filter(Boolean));
  roles.add(role);
  row.source_roles = Array.from(roles).sort().join(', ');
}

export function createBusinessFusionVirtualDataset(families: DatasetFamily[]): BusinessFusionVirtualDataset | null {
  const overview = createBusinessFusionOverview(families);
  if (!overview || overview.objectKeys.length === 0) return null;

  const datasets = datasetsFromFamilies(families);
  const objectKey = overview.objectKeys[0];
  const fusedRows = new Map<string, Row>();
  const evidenceBundles = new Map<string, FusionEvidenceBundle>();

  for (const dataset of datasets) {
    const keyField = dataset.fields[objectKey.key];
    if (!keyField) continue;

    for (const [period, periodRows] of dataset.periodRows.entries()) {
      for (const [rowIndex, sourceRow] of periodRows.entries()) {
        const rawKey = sourceRow[keyField];
        if (rawKey === null || rawKey === undefined || String(rawKey).trim() === '') continue;

        const row = ensureFusedRow(fusedRows, period, objectKey.key, String(rawKey));
        const bundle = ensureEvidenceBundle(evidenceBundles, period, objectKey.key, String(rawKey));
        bundle.rows.push({
          role: dataset.role,
          familyName: dataset.family.name,
          period,
          rowIndex,
          row: sourceRow
        });
        appendRole(row, dataset.role);
        setFirstText(row, 'product', sourceRow[dataset.fields.product ?? '']);
        setFirstText(row, 'category', sourceRow[dataset.fields.category ?? '']);
        setFirstText(row, 'store', sourceRow[dataset.fields.store ?? '']);
        setFirstText(row, 'sku', sourceRow[dataset.fields.sku ?? '']);
        setFirstText(row, 'brand', sourceRow[dataset.fields.brand ?? '']);
        setFirstText(row, 'customer', sourceRow[dataset.fields.customer ?? '']);
        setFirstText(row, 'salesperson', sourceRow[dataset.fields.salesperson ?? '']);
        setFirstText(row, 'payment', sourceRow[dataset.fields.payment ?? '']);
        setFirstText(row, 'carrier', sourceRow[dataset.fields.carrier ?? '']);
        setFirstText(row, 'status', sourceRow[dataset.fields.status ?? '']);
        setFirstText(row, 'delivery_status', sourceRow[dataset.fields.deliveryStatus ?? '']);
        if (dataset.role === 'sales') {
          addNumber(row, 'sales_rows', 1);
          addNumber(row, 'sales_revenue', sumRows([sourceRow], dataset.fields.revenue));
          addNumber(row, 'discount_amount', sumRows([sourceRow], dataset.fields.discount));
        } else if (dataset.role === 'accounting') {
          addNumber(row, 'accounting_rows', 1);
          addNumber(row, 'accounting_revenue', sumRows([sourceRow], dataset.fields.revenue));
          addNumber(row, 'invoice_total', sumRows([sourceRow], dataset.fields.invoiceTotal));
          addNumber(row, 'ar_debit', sumRows([sourceRow], dataset.fields.receivable));
          addNumber(row, 'gross_profit', sumRows([sourceRow], dataset.fields.profit));
          addNumber(row, 'total_cost', sumRows([sourceRow], dataset.fields.cost));
        } else if (dataset.role === 'logistics') {
          addNumber(row, 'logistics_rows', 1);
          addNumber(row, 'logistics_quantity', sumRows([sourceRow], dataset.fields.quantity));
          addNumber(row, 'delivery_fee', sumRows([sourceRow], dataset.fields.deliveryFee));
        } else if (dataset.role === 'inventory') {
          addNumber(row, 'inventory_rows', 1);
          addNumber(row, 'logistics_quantity', sumRows([sourceRow], dataset.fields.quantity));
        }
      }
    }
  }

  const rows = Array.from(fusedRows.values()).map(row => ({
    ...row,
    revenue_gap: toNumber(row.accounting_revenue) - toNumber(row.sales_revenue),
    profit_margin: toNumber(row.accounting_revenue) > 0 ? toNumber(row.gross_profit) / toNumber(row.accounting_revenue) : null
  }));
  const columns = [
    'fusion_row_id',
    'period',
    'object_key_type',
    'object_key',
    'sales_revenue',
    'accounting_revenue',
    'revenue_gap',
    'gross_profit',
    'profit_margin',
    'logistics_quantity',
    'delivery_fee',
    'total_cost',
    'discount_amount',
    'product',
    'category',
    'store',
    'sku',
    'brand',
    'customer',
    'salesperson',
    'payment',
    'carrier',
    'status',
    'delivery_status',
    'invoice_total',
    'ar_debit',
    'sales_rows',
    'accounting_rows',
    'logistics_rows',
    'inventory_rows',
    'source_roles'
  ];

  return {
    id: `business_fusion_${objectKey.key}`,
    name: `Business fusion by ${objectKey.key}`,
    objectKey,
    columns,
    rows,
    profiles: profileColumns(columns, rows, rows.length),
    understandingColumns: columns,
    understandingRows: rows,
    understandingProfiles: profileColumns(columns, rows, rows.length),
    understandingSourceRowCount: datasets.reduce((sum, dataset) => sum + dataset.rows.length, 0),
    overview,
    evidenceBundles: Object.fromEntries(evidenceBundles.entries())
  };
}
