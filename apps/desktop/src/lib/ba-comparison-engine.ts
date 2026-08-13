import { TAXONOMY, normalizeString } from './business-signal-detector';
import { getDomainBAPlaybook, type DomainBAId } from './domain-ba-playbooks';
import type { DatasetFamily } from './batch-inspection';

export interface BAComparisonPeriodInput {
  id: string;
  label?: string;
  sourceName?: string;
  rows: Record<string, unknown>[];
  labelConfidence?: 'high' | 'medium' | 'low';
  labelReason?: string;
  sortableKey?: string | null;
}

export interface BAComparisonInput {
  datasetName?: string;
  periods: BAComparisonPeriodInput[];
  preferredDomain?: DomainBAId;
  topN?: number;
}

export interface MetricDelta {
  metricId: string;
  label: string;
  previousValue: number;
  currentValue: number;
  delta: number;
  deltaPercent: number | null;
}

export interface DriverContribution {
  key: string;
  dimension: string;
  previousRevenue: number;
  currentRevenue: number;
  revenueDelta: number;
  revenueDeltaPercent: number | null;
  previousProfit?: number;
  currentProfit?: number;
  profitDelta?: number;
  marginPrevious?: number | null;
  marginCurrent?: number | null;
  contributionShare: number;
  rowCount: number;
}

export interface PeriodMappingInfo {
  periodId: string;
  sourceName?: string;
  label: string;
  confidence: 'high' | 'medium' | 'low';
  sortableKey: string | null;
  reason: string;
}

export interface NarrativeSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  severity: 'positive' | 'neutral' | 'warning' | 'critical';
}

export interface SignalCoverageSummary {
  revenueField: string | null;
  costFields: string[];
  profitField: string | null;
  dimensionField: string | null;
  quantityField: string | null;
  discountField: string | null;
}

export interface ReasonCode {
  id: string;
  label: string;
  statement: string;
  severity: 'positive' | 'neutral' | 'warning' | 'critical';
  evidence: string[];
}

export interface ExportableEvidenceSet {
  id: string;
  label: string;
  dimension: string;
  value: string;
  rowCount: number;
  rows: Record<string, unknown>[];
}

export interface DomainComparisonBrief {
  presetId: 'business_period_review';
  businessQuestion: string;
  domainId: DomainBAId;
  domainLabel: string;
  periods: string[];
  periodMapping: PeriodMappingInfo[];
  periodMappingNeedsReview: boolean;
  headline: string;
  trustScore: number;
  decisionReadinessScore: number;
  profitEvidenceStatus: 'available' | 'estimated_from_cost' | 'missing';
  signalCoverage: SignalCoverageSummary;
  primaryDimension: string | null;
  metricDeltas: MetricDelta[];
  topGrowthDrivers: DriverContribution[];
  topDeclineDrivers: DriverContribution[];
  topProfitDrivers: DriverContribution[];
  narrativeSections: NarrativeSection[];
  reasonCodes: ReasonCode[];
  caveats: string[];
  recommendedCharts: { title: string; chartType: 'bar' | 'line' | 'table'; reason: string; fields: string[] }[];
  exportableEvidence: ExportableEvidenceSet[];
}

type SignalFieldMap = Record<string, string | null>;
type ColumnProfile = {
  numeric: number;
  nonEmpty: number;
};

interface BATotals {
  revenue: number;
  cost: number;
  discount: number;
  quantity: number;
  profit: number;
}

const EXTRA_SIGNAL_ALIASES: Record<string, string[]> = {
  revenue: ['amount', 'total amount', 'totalamount', 'total', 'sales amount', 'sales revenue', 'net revenue', 'netrevenue', 'invoice total', 'invoicetotal', 'revenue credit', 'revenue_credit', 'revenuecredit', 'tong tien', 'tổng tiền', 'thanh tien', 'thành tiền', 'tien hang', 'tiền hàng', 'doanh thu', 'net sales', 'gross sales'],
  cost: ['cogs', 'cost of goods', 'cost of goods sold', 'total cost', 'totalcost', 'cogs debit', 'cogs_debit', 'cogsdebit', 'variable cost', 'direct cost', 'gia von', 'giá vốn', 'gia nhap', 'giá nhập', 'chi phi von', 'chi phí vốn'],
  purchase_cost: ['unit cost', 'unitcost', 'purchase price', 'buying price', 'gia mua', 'giá mua'],
  operational_cost: ['shipping cost', 'storage cost', 'fulfillment cost', 'carrying cost', 'warehouse cost', 'logistics cost', 'delivery fee', 'deliveryfee', 'phi luu kho', 'phí lưu kho', 'phi giao hang', 'phí giao hàng', 'chi phi luu kho', 'chi phí lưu kho'],
  storage_cost: ['storage cost', 'warehouse fee', 'carrying cost', 'holding cost', 'phi luu kho', 'phí lưu kho'],
  expense: ['fee', 'fees', 'charge', 'charges', 'phi', 'phí'],
  profit: ['gross profit', 'grossprofit', 'gross_profit', 'net profit', 'netprofit', 'loi nhuan', 'lợi nhuận', 'lai gop', 'lãi gộp'],
  margin: ['gross margin', 'net margin', 'contribution margin', 'profit margin', 'margin pct', 'marginpct', 'margin_pct', 'bien loi nhuan', 'biên lợi nhuận'],
  discount: ['discount amount', 'chiet khau', 'chiết khấu', 'giam gia', 'giảm giá'],
  quantity: ['quantity', 'qty', 'so luong', 'số lượng', 'sl', 'units'],
  unit_price: ['unit price', 'price', 'don gia', 'đơn giá', 'gia ban', 'giá bán'],
  category: ['category', 'product category', 'nganh hang', 'ngành hàng', 'nhom hang', 'nhóm hàng'],
  product: ['product name', 'item name', 'productname', 'ten san pham', 'tên sản phẩm', 'mat hang', 'mặt hàng'],
  channel: ['channel', 'sales channel', 'kenh', 'kênh'],
  time_period: ['period', 'month', 'month name', 'thang', 'tháng', 'ky', 'kỳ']
};

const DIMENSION_PRIORITY = [
  'product',
  'sku',
  'category',
  'branch',
  'customer',
  'salesperson',
  'channel',
  'warehouse',
  'route',
  'supplier',
  'driver'
];

const COST_LIKE_SIGNALS = ['cost', 'purchase_cost', 'operational_cost', 'storage_cost', 'expense', 'supplier_cost'];

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/\s/g, '')
    .replace(/₫|đ|vnd|usd|\$/gi, '')
    .replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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

function allRows(periods: BAComparisonPeriodInput[]): Record<string, unknown>[] {
  return periods.flatMap(period => period.rows);
}

function inferColumns(rows: Record<string, unknown>[]): string[] {
  return Array.from(new Set(rows.flatMap(row => Object.keys(row))));
}

function aliasesForSignal(signalId: string): string[] {
  return [
    ...(TAXONOMY[signalId]?.aliases ?? []),
    TAXONOMY[signalId]?.label ?? signalId,
    signalId,
    ...(EXTRA_SIGNAL_ALIASES[signalId] ?? [])
  ].map(normalizeString);
}

const normalizedAliasesBySignal = new Map<string, string[]>();

function cachedAliasesForSignal(signalId: string): string[] {
  const cached = normalizedAliasesBySignal.get(signalId);
  if (cached) return cached;
  const aliases = aliasesForSignal(signalId);
  normalizedAliasesBySignal.set(signalId, aliases);
  return aliases;
}

function signalCandidateScore(column: string, signalId: string): number {
  const normalized = normalizeString(column);
  const aliases = cachedAliasesForSignal(signalId);
  if (aliases.includes(normalized)) return 100;
  if (aliases.some(alias => normalized.includes(alias))) return 80;
  if (normalized.length >= 6 && aliases.some(alias => alias.includes(normalized))) return 70;
  const compact = normalized.replace(/\s/g, '');
  if (aliases.some(alias => compact.includes(alias.replace(/\s/g, '')))) return 72;
  return 0;
}

function numericCoverage(rows: Record<string, unknown>[], column: string): number {
  if (rows.length === 0) return 0;
  return rows.filter(row => toNumber(row[column]) !== null).length / rows.length;
}

function nonEmptyCoverage(rows: Record<string, unknown>[], column: string): number {
  if (rows.length === 0) return 0;
  return rows.filter(row => row[column] !== null && row[column] !== undefined && String(row[column]).trim() !== '').length / rows.length;
}

function findFieldForSignal(
  rows: Record<string, unknown>[],
  columns: string[],
  signalId: string,
  role: 'measure' | 'dimension' | 'any' = 'any',
  columnProfiles?: Map<string, ColumnProfile>,
): string | null {
  const ranked = columns
    .map(column => ({
      column,
      score: signalCandidateScore(column, signalId),
      numeric: columnProfiles?.get(column)?.numeric ?? numericCoverage(rows, column),
      nonEmpty: columnProfiles?.get(column)?.nonEmpty ?? nonEmptyCoverage(rows, column)
    }))
    .filter(item => item.score > 0)
    .filter(item => {
      if (signalId !== 'revenue' && signalId !== 'sales') return true;
      const normalized = normalizeString(item.column);
      const compact = normalized.replace(/\s/g, '');
      return !/(cost|cogs|expense|fee|phi|phí|gia von|giá vốn|chiphi|chi phi)/i.test(normalized)
        && !/(totalcost|unitcost|cogsdebit|deliveryfee|shippingcost|storagecost|warehousecost|fulfillmentcost)/i.test(compact);
    })
    .filter(item => {
      if (role === 'measure') return item.numeric >= 0.45;
      if (role === 'dimension') return item.nonEmpty >= 0.45;
      return item.nonEmpty >= 0.25;
    })
    .sort((a, b) => (b.score + b.numeric * 10 + b.nonEmpty * 5) - (a.score + a.numeric * 10 + a.nonEmpty * 5));

  return ranked[0]?.column ?? null;
}

function buildSignalFieldMap(rows: Record<string, unknown>[]): SignalFieldMap {
  const columns = inferColumns(rows);
  const columnProfiles = new Map(columns.map(column => [
    column,
    {
      numeric: numericCoverage(rows, column),
      nonEmpty: nonEmptyCoverage(rows, column),
    },
  ]));
  const map: SignalFieldMap = {};
  const signals = new Set([
    ...Object.keys(TAXONOMY),
    ...Object.keys(EXTRA_SIGNAL_ALIASES),
    ...DIMENSION_PRIORITY
  ]);

  for (const signal of signals) {
    const type = TAXONOMY[signal]?.type;
    const role = type === 'measure' || ['quantity', 'unit_price'].includes(signal) ? 'measure' : type === 'dimension' ? 'dimension' : 'any';
    map[signal] = findFieldForSignal(rows, columns, signal, role, columnProfiles);
  }

  return map;
}

function detectDomain(fields: SignalFieldMap, preferredDomain?: DomainBAId): DomainBAId {
  if (preferredDomain) return preferredDomain;
  if (fields.revenue && (fields.cost || fields.profit || fields.margin || fields.purchase_cost || fields.operational_cost || fields.expense)) return 'finance';
  if (fields.revenue || fields.sales || fields.discount) return 'revenue';
  if (fields.inventory || fields.stock_qty || fields.stock_age || fields.stock_movement) return 'inventory';
  if (fields.route || fields.driver || fields.delay || fields.sla || fields.shipment) return 'operations';
  if (fields.customer || fields.segment || fields.retention) return 'customer';
  if (fields.target || fields.actual || fields.achievement || fields.kpi) return 'performance';
  return 'revenue';
}

function rowNumber(row: Record<string, unknown>, field: string | null | undefined): number {
  if (!field) return 0;
  return toNumber(row[field]) ?? 0;
}

function rowRevenue(row: Record<string, unknown>, fields: SignalFieldMap): number {
  return rowNumber(row, fields.revenue) || rowNumber(row, fields.sales);
}

function rowCost(row: Record<string, unknown>, fields: SignalFieldMap): number {
  return COST_LIKE_SIGNALS.reduce((sum, signal) => sum + rowNumber(row, fields[signal]), 0);
}

function rowDiscount(row: Record<string, unknown>, fields: SignalFieldMap): number {
  return rowNumber(row, fields.discount);
}

function rowProfit(row: Record<string, unknown>, fields: SignalFieldMap, canEstimateProfit: boolean): number {
  const direct = rowNumber(row, fields.profit);
  if (fields.profit) return direct;
  if (!canEstimateProfit) return 0;
  return rowRevenue(row, fields) - rowCost(row, fields) - rowDiscount(row, fields);
}

function sumRows(rows: Record<string, unknown>[], fields: SignalFieldMap, canEstimateProfit: boolean): BATotals {
  return rows.reduce(
    (acc, row) => {
      acc.revenue += rowRevenue(row, fields);
      acc.cost += rowCost(row, fields);
      acc.discount += rowDiscount(row, fields);
      acc.quantity += rowNumber(row, fields.quantity);
      acc.profit += rowProfit(row, fields, canEstimateProfit);
      return acc;
    },
    { revenue: 0, cost: 0, discount: 0, quantity: 0, profit: 0 } as BATotals
  );
}

function choosePrimaryDimension(rows: Record<string, unknown>[], fields: SignalFieldMap, domainId: DomainBAId): string | null {
  const playbook = getDomainBAPlaybook(domainId);
  const candidates = Array.from(new Set([
    ...(playbook?.driverModels.flatMap(model => model.candidateDimensions) ?? []),
    ...DIMENSION_PRIORITY
  ]));

  const scored = candidates
    .map(signal => {
      const field = fields[signal];
      if (!field) return null;
      const values = rows
        .map(row => row[field])
        .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
        .map(String);
      const unique = new Set(values).size;
      if (values.length === 0 || unique < 2) return null;
      const cardinalityPenalty = unique > 200 ? 35 : unique > 80 ? 12 : 0;
      return {
        signal,
        field,
        score: values.length / Math.max(1, rows.length) * 100 - cardinalityPenalty + (DIMENSION_PRIORITY.indexOf(signal) >= 0 ? 12 - DIMENSION_PRIORITY.indexOf(signal) : 0)
      };
    })
    .filter((item): item is { signal: string; field: string; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.field ?? null;
}

function groupRowsByDimension(period: BAComparisonPeriodInput, dimension: string): Map<string, Record<string, unknown>[]> {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of period.rows) {
    const raw = row[dimension];
    const key = raw === null || raw === undefined || String(raw).trim() === '' ? '(blank)' : String(raw);
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }
  return groups;
}

function buildDrivers(
  previous: BAComparisonPeriodInput,
  current: BAComparisonPeriodInput,
  dimension: string,
  fields: SignalFieldMap,
  canEstimateProfit: boolean
): DriverContribution[] {
  const previousGroups = groupRowsByDimension(previous, dimension);
  const currentGroups = groupRowsByDimension(current, dimension);
  const keys = new Set([...previousGroups.keys(), ...currentGroups.keys()]);
  const totalPositiveDelta = Array.from(keys).reduce((sum, key) => {
    const prev = sumRows(previousGroups.get(key) ?? [], fields, canEstimateProfit).revenue;
    const curr = sumRows(currentGroups.get(key) ?? [], fields, canEstimateProfit).revenue;
    return sum + Math.max(0, curr - prev);
  }, 0);

  return Array.from(keys).map(key => {
    const prevRows = previousGroups.get(key) ?? [];
    const currRows = currentGroups.get(key) ?? [];
    const prev = sumRows(prevRows, fields, canEstimateProfit);
    const curr = sumRows(currRows, fields, canEstimateProfit);
    const revenueDelta = curr.revenue - prev.revenue;
    const profitDelta = curr.profit - prev.profit;
    return {
      key,
      dimension,
      previousRevenue: prev.revenue,
      currentRevenue: curr.revenue,
      revenueDelta,
      revenueDeltaPercent: safePercent(revenueDelta, prev.revenue),
      previousProfit: canEstimateProfit ? prev.profit : undefined,
      currentProfit: canEstimateProfit ? curr.profit : undefined,
      profitDelta: canEstimateProfit ? profitDelta : undefined,
      marginPrevious: canEstimateProfit && prev.revenue !== 0 ? prev.profit / prev.revenue : null,
      marginCurrent: canEstimateProfit && curr.revenue !== 0 ? curr.profit / curr.revenue : null,
      contributionShare: totalPositiveDelta > 0 ? Math.max(0, revenueDelta) / totalPositiveDelta : 0,
      rowCount: prevRows.length + currRows.length
    };
  });
}

function inferPeriodInfo(period: BAComparisonPeriodInput, index: number): PeriodMappingInfo {
  const source = period.sourceName ?? period.id;
  const explicitLabel = period.label?.trim();
  const labelIsSourceName = explicitLabel && normalizeString(explicitLabel) === normalizeString(source);
  if (explicitLabel && !labelIsSourceName) {
    return {
      periodId: period.id,
      sourceName: period.sourceName,
      label: explicitLabel,
      confidence: period.labelConfidence ?? 'medium',
      sortableKey: period.sortableKey ?? null,
      reason: period.labelReason ?? 'Provided by source metadata.'
    };
  }
  const normalized = normalizeString(source);
  const monthNumber = normalized.match(/(?:thang|month|m)[\s_-]*(1[0-2]|0?[1-9])/)?.[1];
  if (monthNumber) {
    const month = Number(monthNumber);
    return {
      periodId: period.id,
      sourceName: period.sourceName,
      label: `Month ${month}`,
      confidence: 'high',
      sortableKey: `9999-${String(month).padStart(2, '0')}`,
      reason: 'Detected month number from file/source name.'
    };
  }
  const isoMonth = normalized.match(/(20\d{2})[\s-_/]+(1[0-2]|0?[1-9])/)?.slice(1, 3);
  if (isoMonth) {
    const label = `${isoMonth[0]}-${String(Number(isoMonth[1])).padStart(2, '0')}`;
    return {
      periodId: period.id,
      sourceName: period.sourceName,
      label,
      confidence: 'high',
      sortableKey: label,
      reason: 'Detected year-month from file/source name.'
    };
  }
  const compactDate = normalized.match(/(?:^|[^0-9])([0-3]?[0-9])([01][0-9])(20\d{2})(?:[^0-9]|$)/);
  if (compactDate) {
    const [, day, month, year] = compactDate;
    const label = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return {
      periodId: period.id,
      sourceName: period.sourceName,
      label,
      confidence: 'medium',
      sortableKey: label,
      reason: 'Detected compact date from file/source name.'
    };
  }
  return {
    periodId: period.id,
    sourceName: period.sourceName,
    label: `Period ${index + 1}`,
    confidence: 'low',
    sortableKey: null,
    reason: 'Could not infer a calendar period; using import order.'
  };
}

function orderPeriods(periods: BAComparisonPeriodInput[]): { periods: BAComparisonPeriodInput[]; mapping: PeriodMappingInfo[]; needsReview: boolean } {
  const mapped = periods.map((period, index) => ({ period, info: inferPeriodInfo(period, index) }));
  const canSort = mapped.length > 1 && mapped.every(item => item.info.sortableKey);
  const ordered = canSort
    ? [...mapped].sort((a, b) => String(a.info.sortableKey).localeCompare(String(b.info.sortableKey)))
    : mapped;
  const remapped = ordered.map((item, index) => ({
    ...item.info,
    label: item.info.label.startsWith('Period ') && !item.info.sortableKey ? `Period ${index + 1}` : item.info.label
  }));
  return {
    periods: ordered.map(item => item.period),
    mapping: remapped,
    needsReview: remapped.some(item => item.confidence === 'low') || !canSort
  };
}

function buildReasonCodes(
  previousTotals: BATotals,
  currentTotals: BATotals,
  fields: SignalFieldMap,
  canEstimateProfit: boolean,
  topGrowth: DriverContribution[],
  topDecline: DriverContribution[]
): ReasonCode[] {
  const revenueDelta = currentTotals.revenue - previousTotals.revenue;
  const reasons: ReasonCode[] = [];

  if (topGrowth[0] && revenueDelta > 0) {
    reasons.push({
      id: 'growth_driver',
      label: 'Main growth driver',
      statement: `${topGrowth[0].key} contributed the largest positive revenue movement (${formatNumber(topGrowth[0].revenueDelta)}).`,
      severity: 'positive',
      evidence: [`Contribution share: ${formatPercent(topGrowth[0].contributionShare)}`]
    });
  }

  if (topDecline[0]) {
    reasons.push({
      id: 'decline_driver',
      label: 'Main decline driver',
      statement: `${topDecline[0].key} had the largest negative revenue movement (${formatNumber(topDecline[0].revenueDelta)}).`,
      severity: 'warning',
      evidence: [`Change: ${formatPercent(topDecline[0].revenueDeltaPercent)}`]
    });
  }

  if (fields.quantity) {
    const quantityDelta = currentTotals.quantity - previousTotals.quantity;
    if (quantityDelta !== 0) {
      reasons.push({
        id: 'quantity_effect',
        label: 'Volume effect',
        statement: `Quantity changed by ${formatNumber(quantityDelta)}, so volume likely contributed to the movement.`,
        severity: quantityDelta >= 0 ? 'positive' : 'warning',
        evidence: [`Previous quantity: ${formatNumber(previousTotals.quantity)}`, `Current quantity: ${formatNumber(currentTotals.quantity)}`]
      });
    }
  }

  if (canEstimateProfit) {
    const costDelta = currentTotals.cost - previousTotals.cost;
    const profitDelta = currentTotals.profit - previousTotals.profit;
    if (costDelta > 0 && profitDelta < revenueDelta) {
      reasons.push({
        id: 'cost_pressure',
        label: 'Cost pressure',
        statement: `Cost increased by ${formatNumber(costDelta)}, reducing how much revenue movement converted into profit.`,
        severity: 'warning',
        evidence: [`Profit change: ${formatNumber(profitDelta)}`, `Revenue change: ${formatNumber(revenueDelta)}`]
      });
    }
  } else {
    reasons.push({
      id: 'profit_not_supported',
      label: 'Profit conclusion blocked',
      statement: 'Revenue can be compared, but profit cannot be claimed because cost or profit evidence is missing.',
      severity: 'critical',
      evidence: ['Missing cost-like fields']
    });
  }

  if (fields.discount) {
    const discountDelta = currentTotals.discount - previousTotals.discount;
    if (discountDelta !== 0) {
      reasons.push({
        id: 'discount_effect',
        label: 'Discount effect',
        statement: `Discount changed by ${formatNumber(discountDelta)}, which may affect realized revenue or margin.`,
        severity: discountDelta > 0 ? 'warning' : 'neutral',
        evidence: [`Previous discount: ${formatNumber(previousTotals.discount)}`, `Current discount: ${formatNumber(currentTotals.discount)}`]
      });
    }
  }

  return reasons.slice(0, 6);
}

function driverLine(driver: DriverContribution, metric: 'revenue' | 'profit' = 'revenue'): string {
  if (metric === 'profit' && driver.currentProfit !== undefined) {
    const margin = driver.marginCurrent === null || driver.marginCurrent === undefined ? 'n/a' : formatPercent(driver.marginCurrent);
    return `${driver.key}: profit ${formatNumber(driver.currentProfit)}, margin ${margin}, revenue ${formatNumber(driver.currentRevenue)}`;
  }
  return `${driver.key}: revenue change ${formatNumber(driver.revenueDelta)} (${formatPercent(driver.revenueDeltaPercent)})`;
}

function buildNarrativeSections(params: {
  previousLabel: string;
  currentLabel: string;
  previousTotals: BATotals;
  currentTotals: BATotals;
  revenueDelta: number;
  profitDelta: number;
  canEstimateProfit: boolean;
  profitEvidenceStatus: DomainComparisonBrief['profitEvidenceStatus'];
  topGrowthDrivers: DriverContribution[];
  topDeclineDrivers: DriverContribution[];
  topProfitDrivers: DriverContribution[];
  reasonCodes: ReasonCode[];
  caveats: string[];
  periodMappingNeedsReview: boolean;
}): NarrativeSection[] {
  const {
    previousLabel,
    currentLabel,
    previousTotals,
    currentTotals,
    revenueDelta,
    profitDelta,
    canEstimateProfit,
    profitEvidenceStatus,
    topGrowthDrivers,
    topDeclineDrivers,
    topProfitDrivers,
    reasonCodes,
    caveats,
    periodMappingNeedsReview
  } = params;
  const revenueDirection = revenueDelta >= 0 ? 'increased' : 'decreased';
  const sections: NarrativeSection[] = [
    {
      id: 'executive_answer',
      title: 'Executive answer',
      summary: `${currentLabel} revenue ${revenueDirection} by ${formatNumber(Math.abs(revenueDelta))} vs ${previousLabel}.`,
      bullets: [
        `Previous revenue: ${formatNumber(previousTotals.revenue)}`,
        `Current revenue: ${formatNumber(currentTotals.revenue)}`,
        `Change: ${formatNumber(revenueDelta)} (${formatPercent(safePercent(revenueDelta, previousTotals.revenue))})`
      ],
      severity: revenueDelta >= 0 ? 'positive' : 'warning'
    },
    {
      id: 'where_changed',
      title: 'Where it changed',
      summary: topGrowthDrivers[0] || topDeclineDrivers[0]
        ? 'LightBI ranked the TOP 10 segments that created growth and the TOP 10 segments that created decline.'
        : 'LightBI did not find a reliable segment dimension for growth/decline ranking.',
      bullets: [
        ...topGrowthDrivers.slice(0, 10).map((driver, index) => `Growth #${index + 1}: ${driverLine(driver)}`),
        ...topDeclineDrivers.slice(0, 10).map((driver, index) => `Decline #${index + 1}: ${driverLine(driver)}`)
      ],
      severity: topGrowthDrivers[0] || topDeclineDrivers[0] ? 'neutral' : 'warning'
    }
  ];

  const strongestReason = reasonCodes.find(reason => reason.id !== 'profit_not_supported');
  sections.push({
    id: 'why_changed',
    title: 'Why it changed',
    summary: strongestReason
      ? strongestReason.statement
      : 'LightBI needs quantity, cost, discount, price, or richer driver fields to explain the movement more deeply.',
    bullets: reasonCodes
      .filter(reason => reason.id !== 'profit_not_supported')
      .slice(0, 4)
      .map(reason => `${reason.label}: ${reason.statement}`),
    severity: strongestReason?.severity ?? 'warning'
  });

  if (canEstimateProfit) {
    const topRevenue = topGrowthDrivers[0]?.key;
    const topProfit = topProfitDrivers[0]?.key;
    const profitSummary = topProfit
      ? `${topProfit} currently ranks highest by profit${topRevenue && topRevenue !== topProfit ? `, which is different from the top revenue growth driver ${topRevenue}` : ''}.`
      : 'Profit can be calculated, but no reliable profit driver was found.';
    sections.push({
      id: 'profitability_answer',
      title: 'Profitability answer',
      summary: profitSummary,
      bullets: [
        `Profit evidence: ${profitEvidenceStatus === 'available' ? 'direct profit/margin field' : 'estimated from cost-like fields'}`,
        `Profit change: ${formatNumber(profitDelta)} (${formatPercent(safePercent(profitDelta, previousTotals.profit))})`,
        ...topProfitDrivers.slice(0, 10).map((driver, index) => `Profit #${index + 1}: ${driverLine(driver, 'profit')}`)
      ],
      severity: profitDelta >= 0 ? 'positive' : 'warning'
    });
  } else {
    sections.push({
      id: 'profitability_blocked',
      title: 'Profitability answer',
      summary: 'LightBI will not claim which item is more profitable because cost, profit, margin, fee, or storage-cost evidence is missing.',
      bullets: [
        'Add cost, gross profit, margin, fee, storage cost, or cost-of-goods fields to unlock profit ranking.',
        'Until then, revenue leaders must not be treated as profit leaders.'
      ],
      severity: 'critical'
    });
  }

  if (periodMappingNeedsReview || caveats.length > 0) {
    sections.push({
      id: 'decision_safety',
      title: 'Decision safety',
      summary: periodMappingNeedsReview
        ? 'Period labels need review before this comparison is used as a final decision.'
        : 'Review the caveats before using this as a final decision.',
      bullets: [
        ...(periodMappingNeedsReview ? ['Confirm which file belongs to each month/period.'] : []),
        ...caveats
      ],
      severity: caveats.some(caveat => caveat.toLowerCase().includes('profitability')) ? 'critical' : 'warning'
    });
  }

  return sections;
}

function buildEvidenceSets(
  previous: BAComparisonPeriodInput,
  current: BAComparisonPeriodInput,
  dimension: string | null,
  drivers: DriverContribution[],
  limit: number,
  previousLabel: string,
  currentLabel: string
): ExportableEvidenceSet[] {
  if (!dimension) return [];
  const previousGroups = groupRowsByDimension(previous, dimension);
  const groups = groupRowsByDimension(current, dimension);
  const seen = new Set<string>();
  return drivers
    .filter(driver => {
      if (seen.has(driver.key)) return false;
      seen.add(driver.key);
      return true;
    })
    .slice(0, limit)
    .map((driver, index) => {
      const previousRows = (previousGroups.get(driver.key) ?? []).map(row => ({ __lightbi_period: previousLabel, ...row }));
      const currentRows = (groups.get(driver.key) ?? []).map(row => ({ __lightbi_period: currentLabel, ...row }));
      const rows = [...previousRows, ...currentRows].slice(0, 1000);
      return {
    id: `evidence_${index + 1}`,
    label: `${driver.key} evidence rows`,
    dimension,
    value: driver.key,
    rowCount: previousRows.length + currentRows.length,
    rows
  };
    });
}

export function createDomainComparisonBrief(input: BAComparisonInput): DomainComparisonBrief {
  const topN = input.topN ?? 10;
  const periodOrder = orderPeriods(input.periods.filter(period => period.rows.length > 0));
  const periods = periodOrder.periods;
  const rows = allRows(periods);
  const fields = buildSignalFieldMap(rows);
  const domainId = detectDomain(fields, input.preferredDomain);
  const playbook = getDomainBAPlaybook(domainId);
  const domainLabel = playbook?.label ?? domainId;
  const periodLabels = periodOrder.mapping.map(period => period.label);
  const caveats: string[] = [];

  if (periods.length < 2) {
    caveats.push('At least two periods are required for business comparison.');
  }

  const previous = periods[0] ?? { id: 'previous', label: 'Previous', rows: [] };
  const current = periods[periods.length - 1] ?? { id: 'current', label: 'Current', rows: [] };
  const previousLabel = periodLabels[0] ?? 'previous period';
  const currentLabel = periodLabels[periodLabels.length - 1] ?? 'current period';
  const canEstimateProfit = Boolean(fields.profit || fields.margin || COST_LIKE_SIGNALS.some(signal => fields[signal]));
  const profitEvidenceStatus: DomainComparisonBrief['profitEvidenceStatus'] = fields.profit || fields.margin
    ? 'available'
    : canEstimateProfit
      ? 'estimated_from_cost'
      : 'missing';
  const signalCoverage: SignalCoverageSummary = {
    revenueField: fields.revenue || fields.sales || null,
    costFields: COST_LIKE_SIGNALS.map(signal => fields[signal]).filter((field): field is string => Boolean(field)),
    profitField: fields.profit || fields.margin || null,
    dimensionField: null,
    quantityField: fields.quantity || null,
    discountField: fields.discount || null
  };

  if (!fields.revenue && (domainId === 'revenue' || domainId === 'finance')) {
    caveats.push('Revenue-like field is missing, so sales comparison is not decision-ready.');
  }
  if ((domainId === 'finance' || fields.revenue) && !canEstimateProfit) {
    caveats.push('Profitability is not decision-ready because cost, profit, margin, or cost-like fee fields are missing.');
  }

  const previousTotals = sumRows(previous.rows, fields, canEstimateProfit);
  const currentTotals = sumRows(current.rows, fields, canEstimateProfit);
  const revenueDelta = currentTotals.revenue - previousTotals.revenue;
  const profitDelta = currentTotals.profit - previousTotals.profit;
  const primaryDimension = choosePrimaryDimension(rows, fields, domainId);
  signalCoverage.dimensionField = primaryDimension;
  const drivers = primaryDimension
    ? buildDrivers(previous, current, primaryDimension, fields, canEstimateProfit)
    : [];

  const topGrowthDrivers = drivers
    .filter(driver => driver.revenueDelta > 0)
    .sort((a, b) => b.revenueDelta - a.revenueDelta)
    .slice(0, topN);
  const topDeclineDrivers = drivers
    .filter(driver => driver.revenueDelta < 0)
    .sort((a, b) => a.revenueDelta - b.revenueDelta)
    .slice(0, topN);
  const topProfitDrivers = canEstimateProfit
    ? [...drivers]
      .sort((a, b) => (b.currentProfit ?? 0) - (a.currentProfit ?? 0))
      .slice(0, topN)
    : [];

  const metricDeltas: MetricDelta[] = [
    {
      metricId: 'revenue',
      label: 'Revenue',
      previousValue: previousTotals.revenue,
      currentValue: currentTotals.revenue,
      delta: revenueDelta,
      deltaPercent: safePercent(revenueDelta, previousTotals.revenue)
    }
  ];

  if (fields.quantity) {
    const quantityDelta = currentTotals.quantity - previousTotals.quantity;
    metricDeltas.push({
      metricId: 'quantity',
      label: 'Quantity',
      previousValue: previousTotals.quantity,
      currentValue: currentTotals.quantity,
      delta: quantityDelta,
      deltaPercent: safePercent(quantityDelta, previousTotals.quantity)
    });
  }

  if (fields.discount) {
    const discountDelta = currentTotals.discount - previousTotals.discount;
    metricDeltas.push({
      metricId: 'discount',
      label: 'Discount',
      previousValue: previousTotals.discount,
      currentValue: currentTotals.discount,
      delta: discountDelta,
      deltaPercent: safePercent(discountDelta, previousTotals.discount)
    });
  }

  if (canEstimateProfit) {
    metricDeltas.push({
      metricId: 'profit',
      label: fields.profit ? 'Profit' : 'Estimated profit',
      previousValue: previousTotals.profit,
      currentValue: currentTotals.profit,
      delta: profitDelta,
      deltaPercent: safePercent(profitDelta, previousTotals.profit)
    });
  }

  const direction = revenueDelta >= 0 ? 'increased' : 'decreased';
  const headline = fields.revenue
    ? `${currentLabel} revenue ${direction} by ${formatNumber(Math.abs(revenueDelta))} vs ${previousLabel} (${formatPercent(safePercent(revenueDelta, previousTotals.revenue))}).`
    : `${domainLabel} comparison needs a revenue or value signal before LightBI can answer growth safely.`;

  const reasonCodes = buildReasonCodes(previousTotals, currentTotals, fields, canEstimateProfit, topGrowthDrivers, topDeclineDrivers);
  const narrativeSections = buildNarrativeSections({
    previousLabel,
    currentLabel,
    previousTotals,
    currentTotals,
    revenueDelta,
    profitDelta,
    canEstimateProfit,
    profitEvidenceStatus,
    topGrowthDrivers,
    topDeclineDrivers,
    topProfitDrivers,
    reasonCodes,
    caveats,
    periodMappingNeedsReview: periodOrder.needsReview
  });
  const exportableEvidence = buildEvidenceSets(previous, current, primaryDimension, [...topGrowthDrivers, ...topDeclineDrivers, ...topProfitDrivers], topN, previousLabel, currentLabel);

  const baseTrust = fields.revenue ? 76 : 45;
  const profitPenalty = canEstimateProfit ? 0 : 18;
  const periodPenalty = periods.length >= 2 ? 0 : 25;
  const periodMappingPenalty = periodOrder.needsReview ? 8 : 0;
  const dimensionPenalty = primaryDimension ? 0 : 12;
  const caveatPenalty = Math.min(25, caveats.length * 8);
  const trustScore = Math.max(0, Math.min(100, Math.round(baseTrust - profitPenalty - periodPenalty - periodMappingPenalty - dimensionPenalty - caveatPenalty + (drivers.length > 0 ? 8 : 0))));
  const decisionReadinessScore = Math.max(0, Math.min(100, Math.round(trustScore - (reasonCodes.some(reason => reason.severity === 'critical') ? 15 : 0))));

  return {
    presetId: 'business_period_review',
    businessQuestion: 'Compare business reports across periods: revenue movement, growth/decline drivers, profit evidence, and exportable evidence rows.',
    domainId,
    domainLabel,
    periods: periodLabels,
    periodMapping: periodOrder.mapping,
    periodMappingNeedsReview: periodOrder.needsReview,
    headline,
    trustScore,
    decisionReadinessScore,
    profitEvidenceStatus,
    signalCoverage,
    primaryDimension,
    metricDeltas,
    topGrowthDrivers,
    topDeclineDrivers,
    topProfitDrivers,
    narrativeSections,
    reasonCodes,
    caveats,
    recommendedCharts: [
      {
        title: primaryDimension ? `Revenue change by ${primaryDimension}` : 'Revenue comparison',
        chartType: 'bar',
        reason: 'Compare positive and negative contributors side by side.',
        fields: [primaryDimension, fields.revenue].filter((field): field is string => Boolean(field))
      },
      {
        title: 'Driver evidence table',
        chartType: 'table',
        reason: 'Show revenue, profit, margin, and contribution share behind the answer.',
        fields: [primaryDimension, fields.revenue, fields.cost, fields.profit].filter((field): field is string => Boolean(field))
      }
    ],
    exportableEvidence
  };
}

export function createTwoPeriodBusinessComparison(
  previousRows: Record<string, unknown>[],
  currentRows: Record<string, unknown>[],
  options: { previousLabel?: string; currentLabel?: string; preferredDomain?: DomainBAId; datasetName?: string } = {}
): DomainComparisonBrief {
  return createDomainComparisonBrief({
    datasetName: options.datasetName,
    preferredDomain: options.preferredDomain,
    periods: [
      { id: 'previous', label: options.previousLabel ?? 'Previous period', rows: previousRows },
      { id: 'current', label: options.currentLabel ?? 'Current period', rows: currentRows }
    ]
  });
}

function rowsFromFamilyFile(item: DatasetFamily['files'][number]): Record<string, unknown>[] {
  if (item.result.status !== 'accessible') return [];
  const metadata = item.result.metadata;
  if (metadata.is_workbook && metadata.default_sheet && metadata.sheets) {
    const sheet = metadata.sheets[metadata.default_sheet];
    return (sheet?.analysis_rows ?? sheet?.semantic_rows ?? sheet?.preview_rows ?? []) as Record<string, unknown>[];
  }
  return (metadata.analysis_rows ?? metadata.semantic_rows ?? metadata.preview_rows ?? []) as Record<string, unknown>[];
}

export function createDomainComparisonBriefFromFamily(
  family: DatasetFamily,
  options: { preferredDomain?: DomainBAId; topN?: number; periodLabels?: Record<string, string> } = {}
): DomainComparisonBrief | null {
  if (family.files.length < 2) return null;
  const periods = family.files
    .map(item => ({
      id: item.file.name,
      label: options.periodLabels?.[item.file.name] ?? item.file.name,
      sourceName: item.file.name,
      rows: rowsFromFamilyFile(item)
    }))
    .filter(period => period.rows.length > 0);

  if (periods.length < 2) return null;

  return createDomainComparisonBrief({
    datasetName: family.name,
    preferredDomain: options.preferredDomain,
    topN: options.topN,
    periods
  });
}
