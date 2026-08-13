import { buildDeepBAInvestigation } from './deep-ba-investigation';

export interface SingleSourceKpi {
  id: string;
  label: string;
  value: number;
  kind: 'money' | 'number' | 'percent';
}

export interface SingleSourceRankedValue {
  label: string;
  value: number;
  share: number;
  rowCount: number;
}

export interface SingleSourceBreakdown {
  id: string;
  label: string;
  physicalColumn: string;
  valueKind: 'money' | 'number' | 'percent';
  top: SingleSourceRankedValue[];
  bottom: SingleSourceRankedValue[];
}

export interface SingleSourceTrendPoint {
  period: string;
  value: number;
  rowCount: number;
}

export interface SingleSourceBAOverview {
  mode: 'commercial' | 'operations' | 'inventory' | 'customer' | 'performance' | 'finance' | 'general';
  analysisLabel: string;
  breakdownHeading: string;
  rowCount: number;
  sourceRowCount: number;
  isRepresentativeSample: boolean;
  bindings: Record<string, string>;
  kpis: SingleSourceKpi[];
  trend: SingleSourceTrendPoint[];
  trendChange: number | null;
  breakdowns: SingleSourceBreakdown[];
  concentration: { label: string; share: number } | null;
  outlierCount: number;
  findings: string[];
  recommendedActions: string[];
  limitations: string[];
  investigation?: DeepBAInvestigation;
}

export type DeepBAConfidence = 'high' | 'medium' | 'low';
export type DeepBABasis = 'evidence_backed' | 'hypothesis' | 'needs_verification';

export interface DeepBAEvidenceRow {
  rowIndex: number;
  label: string;
  values: Record<string, string | number | boolean | null>;
}

export interface DeepBAFinding {
  id: string;
  title: string;
  statement: string;
  confidence: DeepBAConfidence;
  basis: DeepBABasis;
  evidenceFields: string[];
  evidenceRows: DeepBAEvidenceRow[];
  contribution?: number;
  businessImpact?: 'high' | 'medium' | 'low';
  priorityScore?: number;
}

export interface DeepBADecomposition {
  id: string;
  label: string;
  status: 'supported' | 'partial' | 'unavailable';
  components: Array<{ label: string; field?: string; status: 'observed' | 'missing'; note: string }>;
  caveat?: string;
}

export interface DeepBAInvestigation {
  domain: string;
  whatHappened: DeepBAFinding[];
  whereItHappened: DeepBAFinding[];
  whyItMayHaveHappened: DeepBAFinding[];
  unusual: DeepBAFinding[];
  priorities: DeepBAFinding[];
  decompositions: DeepBADecomposition[];
  comparisons: Array<{ kind: 'period' | 'peer' | 'baseline' | 'target'; label: string; status: 'available' | 'unavailable'; statement: string }>;
  followUpQuestions: Array<{ question: string; rationale: string; evidenceFields: string[] }>;
  actions: Array<{ priority: 'high' | 'medium' | 'low'; basis: DeepBABasis; title: string; action: string; verification: string }>;
  unknowns: Array<{ label: string; missingSignals: string[]; impact: string }>;
}

type Row = Record<string, unknown>;

export function sampleSingleSourceBARows(rows: Row[] | undefined, limit = 1000): Row[] {
  if (!Array.isArray(rows) || rows.length === 0 || limit <= 0) return [];
  if (rows.length <= limit) return rows;
  if (limit === 1) return [rows[0]];

  // Keep the BA input bounded without biasing it toward the beginning of a
  // source. Operational exports are often sparse or sorted in batches, so a
  // head-only slice can entirely miss a valid measure that the governed
  // full-source chart has already executed.
  const sampled: Row[] = [];
  let previousIndex = -1;
  for (let position = 0; position < limit; position += 1) {
    const index = Math.round((position * (rows.length - 1)) / (limit - 1));
    if (index !== previousIndex) sampled.push(rows[index]);
    previousIndex = index;
  }
  return sampled;
}

const ALIASES: Record<string, string[]> = {
  revenue: ['revenue', 'salesrevenue', 'netrevenue', 'invoicetotal', 'totalamount', 'totalrevenue', 'amount', 'tongtien', 'tienphaithu', 'thanhtien', 'doanhthu'],
  quantity: ['quantity', 'qty', 'soldqty', 'quantitysold', 'salesquantity', 'receivedqty', 'issuedqty', 'openingstockqty', 'stockqty'],
  order: ['orderid', 'orderno', 'ordernumber', 'invoiceid', 'invoiceno', 'madon', 'maphieuxuat', 'maphieunhap'],
  date: ['orderdate', 'salesdate', 'transactiondate', 'invoicedate', 'date', 'reportdate', 'ngayxuat', 'ngaynhap', 'ngaybaocao'],
  product: ['product', 'productname', 'item', 'itemname', 'sku', 'material', 'materialname', 'tenvattu'],
  brand: ['brand', 'productbrand', 'manufacturer'],
  category: ['category', 'productcategory', 'itemcategory', 'group'],
  branch: ['store', 'branch', 'warehouse', 'location', 'shop', 'makho', 'makhoxuat', 'tenkho', 'tenkhoxuat', 'chinhanh'],
  salesperson: ['salesperson', 'salesrep', 'seller', 'employee', 'staff', 'nhanvien', 'nhanvienxuat', 'manhanvienxuat'],
  payment: ['paymentmethod', 'payment', 'paymenttype', 'tender'],
  status: ['status', 'orderstatus', 'salesstatus'],
  discount: ['discount', 'discountamount', 'discountvalue'],
  unitPrice: ['unitprice', 'price', 'sellingprice'],
  shipment: ['shipmentid', 'shipmentno', 'trackingid', 'trackingno', 'deliveryid', 'matakien', 'madon', 'matai'],
  deliveryDate: ['deliverydate', 'delivereddate', 'shipdate', 'reportdate', 'ngaybaocao'],
  warehouse: ['warehouse', 'warehousecode', 'distributioncenter', 'hub', 'depot', 'kho'],
  carrier: ['carrier', 'shippingcompany', 'logisticspartner', 'donvivanchuyen'],
  route: ['route', 'routename', 'tuyenxe', 'hanhtrinh', 'chuyentuyen'],
  driver: ['driver', 'drivername', 'taixe'],
  vehicle: ['vehicle', 'vehicleid', 'truck', 'licenseplate', 'chuyenxe'],
  deliveryStatus: ['deliverystatus', 'shipmentstatus', 'ontimestatus', 'status', 'xedendunghen', 'result', 'resultp', 'danhgia', 'xuandungtheocldv'],
  deliveryFee: ['deliveryfee', 'shippingfee', 'freightcost', 'transportcost'],
  waitingTime: ['waitingtime', 'delayminutes', 'deliverytime', 'leadtime', 'transittime'],
  currentLocation: ['currentlocation', 'currentbranch', 'currenthub', 'currentwarehouse', 'currentoffice', 'buucuchientai', 'chinhanhhientai', 'khohientai'],
  service: ['service', 'servicegroup', 'servicetype', 'shippingservice', 'dichvu', 'nhomdichvu'],
  cod: ['cod', 'codamount', 'cashondelivery', 'tiencod', 'thuhocod'],
  fee: ['fee', 'totalfee', 'shippingfee', 'deliveryfee', 'freight', 'freightcost', 'tiencuoc', 'cuocphi'],
  origin: ['origin', 'source', 'senderlocation', 'originprovince', 'originbranch', 'tinhgui', 'buucucgui'],
  destination: ['destination', 'receiverlocation', 'destinationprovince', 'destinationbranch', 'tinhnhan', 'buucucnhan'],
  weight: ['weight', 'grossweight', 'actualweight', 'chargeableweight', 'trongluong', 'khoiluong'],
  stock: ['stockqty', 'onhandqty', 'inventoryqty', 'closingstock', 'endingstock', 'tonkho', 'cuoiky'],
  outcome: ['outcome', 'target', 'converted', 'conversion', 'subscribed', 'success', 'response', 'result', 'resultp', 'y', 'danhgia'],
  duration: ['duration', 'callduration', 'waitingtime', 'leadtime', 'transittime', 'thoigian'],
  campaignCount: ['campaign', 'contacts', 'contactcount', 'attempts', 'previous'],
  channel: ['channel', 'contact', 'contactchannel', 'paymentmethod', 'dichvu', 'loaihang'],
  segment: ['segment', 'customersegment', 'job', 'education', 'marital', 'nhom'],
  customer: ['customerid', 'clientid', 'accountid', 'customer', 'khachhang'],
};

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
}

type SemanticFieldBinding = { canonicalId?: string; physicalColumn?: string; role?: string };

function semanticKey(canonicalId: string): string | null {
  const value = normalize(canonicalId);
  // Prefer the most specific canonical concepts before broad aliases such as
  // "status" or "location". Otherwise status.lifecycle becomes generic status
  // and current_location becomes a branch, losing the selected BA angle.
  if (/deliverystatus|shipmentstatus|ontimestatus|lifecyclestatus|statuslifecycle/.test(value)) return 'deliveryStatus';
  if (/currentlocation|currentbranch|currenthub|currentwarehouse|currentoffice/.test(value)) return 'currentLocation';
  if (/servicegroup|servicetype|shippingservice/.test(value)) return 'service';
  if (/moneycod|codamount|cashondelivery/.test(value)) return 'cod';
  if (/moneyfee|deliveryfee|shippingfee|freightcost/.test(value)) return 'fee';
  if (/shipment|tracking|consignment|parcel/.test(value)) return 'shipment';
  for (const [semantic, aliases] of Object.entries(ALIASES)) {
    // One-letter source aliases such as the common campaign target `y` must
    // only match exactly. Substring matching made every canonical id that
    // contains that letter (for example entity.manager) become an outcome.
    if (aliases.some(alias => value === alias || (alias.length >= 4 && value.includes(alias)))) return semantic;
  }
  if (/outcome|conversion|converted|target|success|subscription/.test(value)) return 'outcome';
  if (/customer|client|account/.test(value)) return 'customer';
  if (/duration|waiting|leadtime|transit/.test(value)) return 'duration';
  if (/currentlocation|currentbranch|currenthub|currentwarehouse|currentoffice/.test(value)) return 'currentLocation';
  if (/servicegroup|servicetype|shippingservice/.test(value)) return 'service';
  if (/moneycod|codamount|cashondelivery/.test(value)) return 'cod';
  if (/moneyfee|deliveryfee|shippingfee|freightcost/.test(value)) return 'fee';
  if (/origin|sourceprovince|senderlocation/.test(value)) return 'origin';
  if (/destination|destinationprovince|receiverlocation/.test(value)) return 'destination';
  if (/shipment|tracking|consignment|parcel/.test(value)) return 'shipment';
  if (/deliverystatus|shipmentstatus|ontimestatus|lifecyclestatus|statuslifecycle/.test(value)) return 'deliveryStatus';
  if (/channel|contactmethod/.test(value)) return 'channel';
  if (/segment|demographic/.test(value)) return 'segment';
  return null;
}

function actionPhysicalColumns(
  requested: readonly string[] | undefined,
  rows: Row[],
  semanticFields: SemanticFieldBinding[],
): string[] {
  if (!requested?.length) return [];
  const columns = [...new Set(rows.slice(0, 1000).flatMap(row => Object.keys(row)))];
  const normalizedColumns = new Map(columns.map(column => [normalize(column), column]));
  const resolved: string[] = [];
  for (const requestedField of requested) {
    const key = normalize(requestedField);
    const exactPhysical = normalizedColumns.get(key);
    const semanticMatch = semanticFields.find(field => {
      const canonical = normalize(field.canonicalId ?? '');
      if (!field.physicalColumn || !canonical) return false;
      if (canonical === key) return true;
      // Canonical ids commonly qualify a signal (for example measure.weight
      // or money.fee). Only allow a suffix match, never arbitrary substring
      // containment, so sibling concepts cannot steal the selected action.
      return key.length >= 4 && canonical.endsWith(key);
    });
    const physical = exactPhysical ?? semanticMatch?.physicalColumn;
    if (physical && !resolved.includes(physical)) resolved.push(physical);
  }
  return resolved;
}

function bindColumns(rows: Row[], semanticFields: SemanticFieldBinding[] = []): Record<string, string> {
  // JSON and dirty operational exports are often sparse. Looking only at the
  // first record caused valid business fields later in the source to vanish.
  const columns = [...new Set(rows.slice(0, 2000).flatMap(row => Object.keys(row)))];
  const normalized = new Map(columns.map(column => [normalize(column), column]));
  const bindings: Record<string, string> = {};
  for (const [semantic, aliases] of Object.entries(ALIASES)) {
    const exact = aliases.map(alias => normalized.get(alias)).find(Boolean);
    if (exact) bindings[semantic] = exact;
  }
  for (const field of semanticFields) {
    if (!field.canonicalId || !field.physicalColumn || !columns.includes(field.physicalColumn)) continue;
    const semantic = semanticKey(field.canonicalId);
    if (semantic && !bindings[semantic]) bindings[semantic] = field.physicalColumn;
  }
  return bindings;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s/g, '').replace(/,/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function sum(rows: Row[], column?: string): number | null {
  if (!column) return null;
  let found = false;
  const total = rows.reduce((result, row) => {
    const value = numberValue(row[column]);
    if (value === null) return result;
    found = true;
    return result + value;
  }, 0);
  return found ? total : null;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower] + ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]) * fraction;
}

function buildBreakdown(rows: Row[], dimensionColumn: string, measureColumn: string, id: string, label: string, valueKind: SingleSourceBreakdown['valueKind'] = 'money'): SingleSourceBreakdown | null {
  const groups = new Map<string, { value: number; rowCount: number }>();
  let total = 0;
  for (const row of rows) {
    const dimension = textValue(row[dimensionColumn]);
    const value = numberValue(row[measureColumn]);
    if (!dimension || value === null) continue;
    const current = groups.get(dimension) ?? { value: 0, rowCount: 0 };
    current.value += value;
    current.rowCount += 1;
    groups.set(dimension, current);
    total += value;
  }
  if (groups.size < 2 || total === 0) return null;
  const ranked = [...groups.entries()].map(([groupLabel, entry]) => ({ label: groupLabel, value: entry.value, share: entry.value / total, rowCount: entry.rowCount })).sort((a, b) => b.value - a.value);
  return { id, label, physicalColumn: dimensionColumn, valueKind, top: ranked.slice(0, 5), bottom: [...ranked].reverse().slice(0, 3) };
}

function buildAverageBreakdown(rows: Row[], dimensionColumn: string, measureColumn: string, id: string, label: string, valueKind: SingleSourceBreakdown['valueKind'] = 'number'): SingleSourceBreakdown | null {
  const groups = new Map<string, { total: number; rowCount: number }>();
  for (const row of rows) {
    const dimension = textValue(row[dimensionColumn]);
    const value = numberValue(row[measureColumn]);
    if (!dimension || value === null) continue;
    const current = groups.get(dimension) ?? { total: 0, rowCount: 0 };
    current.total += value;
    current.rowCount += 1;
    groups.set(dimension, current);
  }
  if (groups.size < 2) return null;
  const ranked = [...groups.entries()]
    .map(([groupLabel, entry]) => ({ label: groupLabel, value: entry.total / entry.rowCount, share: 0, rowCount: entry.rowCount }))
    .sort((a, b) => b.value - a.value);
  const positiveTotal = ranked.reduce((total, entry) => total + Math.max(0, entry.value), 0);
  ranked.forEach(entry => { entry.share = positiveTotal ? Math.max(0, entry.value) / positiveTotal : 0; });
  return { id, label, physicalColumn: dimensionColumn, valueKind, top: ranked.slice(0, 5), bottom: [...ranked].reverse().slice(0, 3) };
}

function usefulNumericColumns(rows: Row[], excluded: Set<string> = new Set()): string[] {
  const columns = [...new Set(rows.slice(0, 1000).flatMap(row => Object.keys(row)))];
  return columns.filter(column => {
    if (excluded.has(column)) return false;
    const values = rows.slice(0, 1000).map(row => row[column]).filter(value => value !== null && value !== undefined && String(value).trim() !== '');
    if (values.length < Math.min(3, Math.max(1, rows.length))) return false;
    const numeric = values.filter(value => numberValue(value) !== null).length;
    const normalized = normalize(column);
    const identifierLike = /(^|_)(id|code|no|number)$|uuid|guid|powerapps|phone|postal|rank|ranking|xep hang|msnv/.test(normalized);
    const timeLike = /^(date|day|month|year|period|fiscalmonth|fiscalyear|ngay|thang|nam|ky)$/.test(normalized);
    return !identifierLike && !timeLike && numeric / values.length >= 0.8;
  });
}

function buildCountBreakdown(rows: Row[], dimensionColumn: string, identityColumn: string | undefined, id: string, label: string): SingleSourceBreakdown | null {
  const groups = new Map<string, Set<string>>();
  rows.forEach((row, index) => {
    const dimension = textValue(row[dimensionColumn]);
    if (!dimension) return;
    const values = groups.get(dimension) ?? new Set<string>();
    values.add((identityColumn ? textValue(row[identityColumn]) : null) ?? `row:${index}`);
    groups.set(dimension, values);
  });
  if (groups.size < 2) return null;
  const ranked = [...groups.entries()].map(([groupLabel, values]) => ({ label: groupLabel, value: values.size, rowCount: values.size, share: 0 })).sort((a, b) => b.value - a.value);
  const total = ranked.reduce((result, entry) => result + entry.value, 0);
  ranked.forEach(entry => { entry.share = total ? entry.value / total : 0; });
  return { id, label, physicalColumn: dimensionColumn, valueKind: 'number', top: ranked.slice(0, 5), bottom: [...ranked].reverse().slice(0, 3) };
}

function positiveOutcome(value: unknown): boolean {
  const normalized = normalize(String(value ?? ''));
  return /^(1|y|yes|true|success|successful|converted|subscribed|dung|dunghen|dat|hoanthanh|dagiao)$/.test(normalized);
}

function hasKnownOutcomeSemantics(values: string[]): boolean {
  const normalized = new Set(values.map(normalize));
  const knownPositive = [...normalized].some(value => /^(1|y|yes|true|success|successful|converted|subscribed|dung|dunghen|dat|hoanthanh|dagiao|giaothanhcong|ontime|completed|delivered)$/.test(value));
  const knownNegative = [...normalized].some(value => /^(0|n|no|false|failure|failed|late|delayed|khong|khongdunghen|thatbai|huy|cancelled|canceled)$/.test(value));
  return (knownPositive && knownNegative) || ([...normalized].every(value => value === '0' || value === '1') && normalized.size > 1);
}

function buildRateBreakdown(rows: Row[], dimensionColumn: string, outcomeColumn: string, id: string, label: string): SingleSourceBreakdown | null {
  const groups = new Map<string, { positives: number; total: number }>();
  for (const row of rows) {
    const dimension = textValue(row[dimensionColumn]);
    const outcome = textValue(row[outcomeColumn]);
    if (!dimension || !outcome) continue;
    const current = groups.get(dimension) ?? { positives: 0, total: 0 };
    current.total += 1;
    if (positiveOutcome(outcome)) current.positives += 1;
    groups.set(dimension, current);
  }
  if (groups.size < 2) return null;
  const ranked = [...groups.entries()]
    .filter(([, entry]) => entry.total >= 3)
    .map(([groupLabel, entry]) => ({ label: groupLabel, value: entry.positives / entry.total, share: entry.positives / entry.total, rowCount: entry.total }))
    .sort((a, b) => b.value - a.value || b.rowCount - a.rowCount);
  if (ranked.length < 2) return null;
  return { id, label, physicalColumn: dimensionColumn, valueKind: 'percent', top: ranked.slice(0, 5), bottom: [...ranked].reverse().slice(0, 3) };
}

function usefulCategoricalColumns(rows: Row[], excluded: Set<string>): string[] {
  const columns = [...new Set(rows.slice(0, 1000).flatMap(row => Object.keys(row)))];
  return columns.filter(column => {
    if (excluded.has(column)) return false;
    const values = rows.slice(0, 1000).map(row => textValue(row[column])).filter((value): value is string => Boolean(value));
    if (values.length < Math.min(20, rows.length * 0.2)) return false;
    const distinct = new Set(values).size;
    if (distinct < 2 || distinct > Math.min(60, Math.max(12, Math.floor(values.length * 0.35)))) return false;
    const numericShare = values.filter(value => numberValue(value) !== null).length / values.length;
    return numericShare < 0.8;
  }).slice(0, 8);
}

function average(rows: Row[], column?: string): number | null {
  if (!column) return null;
  const values = rows.map(row => numberValue(row[column])).filter((value): value is number => value !== null);
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function buildTrend(rows: Row[], dateColumn: string, measureColumn: string): SingleSourceTrendPoint[] {
  const groups = new Map<string, { value: number; rowCount: number }>();
  for (const row of rows) {
    const rawDate = row[dateColumn];
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
    const value = numberValue(row[measureColumn]);
    if (!Number.isFinite(parsed.getTime()) || value === null) continue;
    const period = parsed.toISOString().slice(0, 10);
    const current = groups.get(period) ?? { value: 0, rowCount: 0 };
    current.value += value;
    current.rowCount += 1;
    groups.set(period, current);
  }
  return [...groups.entries()].map(([period, entry]) => ({ period, ...entry })).sort((a, b) => a.period.localeCompare(b.period));
}

function buildAverageTrend(rows: Row[], dateColumn: string, measureColumn: string): SingleSourceTrendPoint[] {
  const groups = new Map<string, { total: number; rowCount: number }>();
  for (const row of rows) {
    const rawDate = row[dateColumn];
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
    const value = numberValue(row[measureColumn]);
    if (!Number.isFinite(parsed.getTime()) || value === null) continue;
    const period = parsed.toISOString().slice(0, 10);
    const current = groups.get(period) ?? { total: 0, rowCount: 0 };
    current.total += value;
    current.rowCount += 1;
    groups.set(period, current);
  }
  return [...groups.entries()]
    .map(([period, entry]) => ({ period, value: entry.total / entry.rowCount, rowCount: entry.rowCount }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function buildCountTrend(rows: Row[], dateColumn: string, identityColumn?: string): SingleSourceTrendPoint[] {
  const groups = new Map<string, Set<string>>();
  rows.forEach((row, index) => {
    const rawDate = row[dateColumn];
    const parsed = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
    if (!Number.isFinite(parsed.getTime())) return;
    const period = parsed.toISOString().slice(0, 10);
    const values = groups.get(period) ?? new Set<string>();
    values.add((identityColumn ? textValue(row[identityColumn]) : null) ?? `row:${index}`);
    groups.set(period, values);
  });
  return [...groups.entries()]
    .map(([period, values]) => ({ period, value: values.size, rowCount: values.size }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export interface SingleSourceBAOverviewOptions {
  sourceRowCount?: number;
  selectedPerspective?: string | null;
  semanticFields?: SemanticFieldBinding[];
  analysisAction?: {
    id?: string;
    opportunityName?: string;
    label?: string;
    description?: string;
    dimensions?: readonly string[];
    measures?: readonly string[];
    measureAggregations?: Readonly<Record<string, 'SUM' | 'COUNT' | 'AVG'>>;
  };
}

function requestedMode(
  action: SingleSourceBAOverviewOptions['analysisAction'],
  bindings: Record<string, string>,
): SingleSourceBAOverview['mode'] | null {
  if (!action) return null;
  const primarySignal = normalize([
    action.id,
    action.opportunityName,
    action.label,
    action.description,
    ...(action.measures ?? []),
  ].filter(Boolean).join(' '));
  const signal = normalize([
    primarySignal,
    ...(action.dimensions ?? []),
  ].filter(Boolean).join(' '));
  if (/inventory|stock|onhand|tonkho/.test(primarySignal)) return 'inventory';
  if (/operation|logistic|delivery|shipment|carrier|waiting|delay|ontime|fulfillment|vanchuyen|giaohang/.test(primarySignal)) return 'operations';
  if (/customer|client|segment|retention|churn|conversion|subscriber|khachhang/.test(primarySignal)) return 'customer';
  if (/performance|productivity|target|outcome|success|efficiency|indicator|metric|score|rating|achievement|participation|participant|team|role|activity|hieusuat|ketqua/.test(primarySignal)) return 'performance';
  if (/revenue|sales|commercial|profit|margin|finance|account|invoice|payment|discount|doanhthu|loinhuan/.test(primarySignal)) return 'commercial';
  if (/inventory|stock|warehouse|onhand|sku|item|tonkho|kho/.test(signal)) return 'inventory';
  if (/operation|logistic|delivery|shipment|carrier|route|driver|vehicle|waiting|delay|ontime|fulfillment|vanchuyen|giaohang/.test(signal)) return 'operations';
  if (/customer|client|segment|retention|churn|conversion|subscriber|khachhang/.test(signal)) return 'customer';
  if (/performance|productivity|target|outcome|success|efficiency|indicator|metric|score|rating|achievement|participation|participant|team|role|activity|hieusuat|ketqua/.test(signal)) return 'performance';
  if (bindings.revenue) return 'commercial';
  // Every selected Easy Mode action deserves an angle-specific BA readout.
  // Unknown domains remain descriptive and evidence-bound instead of falling
  // through to the old generic decision brief.
  return 'general';
}

function createBaseSingleSourceBAOverview(rows: Row[], options: SingleSourceBAOverviewOptions = {}): SingleSourceBAOverview | null {
  if (rows.length === 0) return null;
  const sourceRowCount = Math.max(rows.length, options.sourceRowCount ?? rows.length);
  const isRepresentativeSample = sourceRowCount > rows.length;
  const bindings = bindColumns(rows, options.semanticFields);
  const revenue = bindings.revenue;
  const operationalIdentity = bindings.shipment ?? bindings.order;
  const preferredMode = requestedMode(options.analysisAction, bindings);
  const selectedOperationalDimension = preferredMode === 'operations' && Boolean(options.analysisAction?.dimensions?.length);
  const detectedOperations = Boolean(bindings.shipment || bindings.deliveryStatus || bindings.carrier || bindings.route || bindings.driver || bindings.vehicle || bindings.currentLocation || bindings.service || selectedOperationalDimension);
  const detectedInventory = Boolean(bindings.stock || bindings.warehouse);
  const detectedOutcome = Boolean(bindings.outcome || bindings.deliveryStatus);
  const requestedMeasures = actionPhysicalColumns(options.analysisAction?.measures, rows, options.semanticFields ?? []);
  const genericNumericMeasures = usefulNumericColumns(rows);
  const hasGenericMeasure = requestedMeasures.length > 0 || genericNumericMeasures.length > 0;
  const mode = preferredMode === 'inventory' && detectedInventory
    ? 'inventory'
    : preferredMode === 'operations' && detectedOperations
      ? 'operations'
      : preferredMode === 'commercial' && revenue
        ? 'commercial'
        : (preferredMode === 'customer' || preferredMode === 'performance' || preferredMode === 'finance' || preferredMode === 'general')
          ? preferredMode
        : preferredMode === 'commercial' && hasGenericMeasure
          ? 'general'
        : revenue
          ? 'commercial'
          : detectedOperations
            ? 'operations'
            : detectedInventory
              ? 'inventory'
              : detectedOutcome
                ? preferredMode ?? 'performance'
                : null;
  const isOperations = mode === 'operations';
  const isInventory = mode === 'inventory';
  const isOutcomeMode = mode === 'customer' || mode === 'performance' || mode === 'finance' || mode === 'general';
  if (!revenue && !isOperations && !isInventory && !isOutcomeMode) return null;

  if (isOutcomeMode) {
    const outcomeColumn = bindings.outcome ?? bindings.deliveryStatus;
    if (!outcomeColumn) {
      const actionSignal = normalize([
        options.analysisAction?.id,
        options.analysisAction?.opportunityName,
        options.analysisAction?.label,
        options.analysisAction?.description,
        ...(options.analysisAction?.measures ?? []),
      ].filter(Boolean).join(' '));
      const isQualityReview = /qualityreview|dataquality|technicalfield|dirtyfield/.test(actionSignal);
      const requestedDimensions = actionPhysicalColumns(options.analysisAction?.dimensions, rows, options.semanticFields ?? [])
        .filter(column => !isQualityReview || !/^__.*__$|powerapps|area\s*class/i.test(column));
      const isCountAngle = /recordcount|rowcount|countrecords|sourcerecordcount|distribution|distributed|breakdown|composition/.test(actionSignal) || isQualityReview;
      const measureColumn = isCountAngle ? undefined : requestedMeasures[0] ?? genericNumericMeasures[0];
      if (!measureColumn) {
        const dimensions = [...new Set([...requestedDimensions, ...usefulCategoricalColumns(rows, new Set())])].slice(0, 6);
        const breakdowns = dimensions.flatMap((column, index) => {
          // `record_count` is a row count. Passing the selected grouping column
          // as the identity collapses every group to 1 (for example one unique
          // customer name inside each customer group), which contradicts the
          // governed full-source result.
          const breakdown = buildCountBreakdown(rows, column, undefined, `distribution_${index}`, column);
          return breakdown ? [breakdown] : [];
        });
        const columns = [...new Set(rows.slice(0, 1000).flatMap(row => Object.keys(row)))];
        const nonEmptyCells = rows.reduce((total, row) => total + columns.filter(column => textValue(row[column]) !== null).length, 0);
        const completeness = rows.length && columns.length ? nonEmptyCells / (rows.length * columns.length) : 0;
        return {
          mode,
          analysisLabel: mode === 'performance' ? 'Phân tích hoạt động & hiệu suất' : 'Phân tích dữ liệu theo góc nhìn đã chọn',
          breakdownHeading: 'Bản ghi tập trung ở nhóm nào?',
          rowCount: rows.length,
          sourceRowCount,
          isRepresentativeSample,
          bindings: {
            ...bindings,
            ...(isCountAngle ? { selectedMeasure: 'record_count' } : {}),
            ...Object.fromEntries(requestedDimensions.map((column, index) => [`selectedDimension${index + 1}`, column])),
          },
          kpis: [
            { id: 'records', label: 'Số bản ghi', value: rows.length, kind: 'number' },
            { id: 'columns', label: 'Số trường dữ liệu', value: columns.length, kind: 'number' },
            { id: 'completeness', label: 'Mức đầy đủ dữ liệu', value: completeness, kind: 'percent' },
          ],
          trend: [],
          trendChange: null,
          breakdowns,
          concentration: breakdowns[0]?.top[0] ? { label: breakdowns[0].top[0].label, share: breakdowns[0].top[0].share } : null,
          outlierCount: 0,
          findings: [
            ...(breakdowns[0]?.top[0] ? [`${breakdowns[0].top[0].label} là nhóm xuất hiện nhiều nhất theo chiều ${breakdowns[0].label} (${(breakdowns[0].top[0].share * 100).toFixed(1)}%, n=${breakdowns[0].top[0].rowCount.toLocaleString('vi-VN')}).`] : []),
            `Mức đầy đủ quan sát được của ${columns.length.toLocaleString('vi-VN')} trường là ${(completeness * 100).toFixed(1)}%.`,
          ],
          recommendedActions: [
            'Mở nhóm lớn nhất và nhóm ít xuất hiện để kiểm tra cấu trúc, ngoại lệ và tính đại diện.',
            'Xác nhận ý nghĩa nghiệp vụ của các trường phân loại trước khi dùng phân bố để ra quyết định.',
            'Chọn thêm một chỉ số số học hoặc mục tiêu nếu cần so sánh hiệu quả giữa các nhóm.',
          ],
          limitations: [
            'Nguồn chưa có chỉ số số học phù hợp với góc nhìn này; LightBI chỉ mô tả cơ cấu bản ghi và chất lượng dữ liệu.',
            'Phân bố số bản ghi không tự đại diện cho hiệu suất, giá trị hoặc tác động kinh doanh.',
          ],
        };
      }
      const values = rows.map(row => numberValue(row[measureColumn])).filter((value): value is number => value !== null);
      if (values.length === 0) return null;
      const dynamicDimensions = usefulCategoricalColumns(rows, new Set([measureColumn, ...requestedMeasures]));
      const dimensions = [...new Set([...requestedDimensions, ...dynamicDimensions])].slice(0, 6);
      const breakdowns = dimensions.flatMap((column, index) => {
        const breakdown = buildAverageBreakdown(rows, column, measureColumn, `indicator_${index}`, column);
        return breakdown ? [breakdown] : [];
      });
      const averageValue = values.reduce((total, value) => total + value, 0) / values.length;
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const findings = [
        `Chỉ số ${measureColumn} có giá trị bình quân ${averageValue.toLocaleString('vi-VN')}, thấp nhất ${minValue.toLocaleString('vi-VN')} và cao nhất ${maxValue.toLocaleString('vi-VN')}.`,
        ...(breakdowns[0]?.top[0] ? [`${breakdowns[0].top[0].label} có mức bình quân ${measureColumn} cao nhất trong chiều ${breakdowns[0].label} (${breakdowns[0].top[0].value.toLocaleString('vi-VN')}, n=${breakdowns[0].top[0].rowCount.toLocaleString('vi-VN')}).`] : []),
        ...(breakdowns[0]?.bottom[0] ? [`${breakdowns[0].bottom[0].label} là nhóm cần kiểm tra trước trong chiều ${breakdowns[0].label} (${breakdowns[0].bottom[0].value.toLocaleString('vi-VN')}, n=${breakdowns[0].bottom[0].rowCount.toLocaleString('vi-VN')}).`] : []),
      ];
      return {
        mode,
        analysisLabel: mode === 'customer' ? 'Phân tích khách hàng' : mode === 'finance' ? 'Phân tích tài chính' : 'Phân tích hiệu suất',
        breakdownHeading: `Chỉ số ${measureColumn} khác nhau theo nhóm nào?`,
        rowCount: rows.length,
        sourceRowCount,
        isRepresentativeSample,
        bindings: { ...bindings, selectedMeasure: measureColumn },
        kpis: [
          { id: 'records', label: 'Số bản ghi', value: rows.length, kind: 'number' },
          { id: 'average_indicator', label: `Bình quân ${measureColumn}`, value: averageValue, kind: 'number' },
          { id: 'minimum_indicator', label: `Thấp nhất ${measureColumn}`, value: minValue, kind: 'number' },
          { id: 'maximum_indicator', label: `Cao nhất ${measureColumn}`, value: maxValue, kind: 'number' },
        ],
        trend: [],
        trendChange: null,
        breakdowns,
        concentration: null,
        outlierCount: values.filter(value => value > quantile(values, 0.75) + 1.5 * (quantile(values, 0.75) - quantile(values, 0.25))).length,
        findings,
        recommendedActions: [
          'So sánh nhóm cao và thấp theo đúng chiều phân tích đã chọn; kiểm tra cỡ mẫu trước khi ưu tiên hành động.',
          'Mở các bản ghi của nhóm chênh lệch lớn nhất để xác nhận chất lượng dữ liệu và bối cảnh vận hành.',
          'Đối chiếu thêm mục tiêu hoặc kỳ chuẩn nếu nguồn có cung cấp; kết quả mô tả không tự chứng minh quan hệ nhân quả.',
        ],
        limitations: [
          'Các chỉ số được mô tả theo dữ liệu nguồn và góc nhìn đã chọn; chưa có bằng chứng để suy luận quan hệ nhân quả.',
          ...(!bindings.date ? ['Không có trường thời gian hàng-dòng đủ rõ để so sánh xu hướng theo kỳ.'] : []),
        ],
      };
    }
    const observedOutcomes = rows.map(row => textValue(row[outcomeColumn])).filter((value): value is string => Boolean(value));
    const positiveCount = observedOutcomes.filter(positiveOutcome).length;
    const actionSignal = normalize([
      options.analysisAction?.opportunityName,
      options.analysisAction?.description,
      ...(options.analysisAction?.measures ?? []),
    ].filter(Boolean).join(' '));
    const isDistributionAngle = /recordcount|rowcount|countrecords|distribution|distributed|breakdown|composition/.test(actionSignal);
    const requestedDimensions = actionPhysicalColumns(options.analysisAction?.dimensions, rows, options.semanticFields ?? []);
    const kpis: SingleSourceKpi[] = [{ id: 'records', label: 'Số bản ghi', value: rows.length, kind: 'number' }];
    if (!isDistributionAngle) kpis.push({ id: 'outcome_rate', label: 'Tỷ lệ kết quả tích cực', value: observedOutcomes.length ? positiveCount / observedOutcomes.length : 0, kind: 'percent' });
    const durationAverage = average(rows, bindings.duration);
    const campaignAverage = average(rows, bindings.campaignCount);
    if (durationAverage !== null) kpis.push({ id: 'average_duration', label: 'Thời lượng bình quân', value: durationAverage, kind: 'number' });
    if (campaignAverage !== null) kpis.push({ id: 'average_contacts', label: 'Số lần tương tác bình quân', value: campaignAverage, kind: 'number' });
    const preferredDimensions = [...requestedDimensions, ...[bindings.segment, bindings.channel, bindings.branch, bindings.category, bindings.status].filter((column): column is string => Boolean(column))];
    const dynamicDimensions = usefulCategoricalColumns(rows, new Set([outcomeColumn, ...preferredDimensions]));
    const dimensions = [...new Set([...preferredDimensions, ...dynamicDimensions])].slice(0, 6);
    const breakdowns = dimensions.flatMap((column, index) => {
      const breakdown = isDistributionAngle
        ? buildCountBreakdown(rows, column, bindings.customer, `distribution_${index}`, column)
        : buildRateBreakdown(rows, column, outcomeColumn, `outcome_${index}`, column);
      return breakdown ? [breakdown] : [];
    });
    const findings: string[] = [];
    if (!isDistributionAngle && observedOutcomes.length) findings.push(`${positiveCount.toLocaleString()} trong ${observedOutcomes.length.toLocaleString()} bản ghi có kết quả tích cực (${((positiveCount / observedOutcomes.length) * 100).toFixed(1)}%).`);
    if (breakdowns[0]?.top[0]) findings.push(isDistributionAngle
      ? `${breakdowns[0].top[0].label} là nhóm lớn nhất trong chiều ${breakdowns[0].label} (${(breakdowns[0].top[0].share * 100).toFixed(1)}%, n=${breakdowns[0].top[0].rowCount}).`
      : `${breakdowns[0].top[0].label} có tỷ lệ kết quả tích cực cao nhất trong chiều ${breakdowns[0].label} (${(breakdowns[0].top[0].value * 100).toFixed(1)}%, n=${breakdowns[0].top[0].rowCount}).`);
    if (breakdowns[0]?.bottom[0]) findings.push(isDistributionAngle
      ? `${breakdowns[0].bottom[0].label} là nhóm nhỏ nhất trong chiều ${breakdowns[0].label} (${(breakdowns[0].bottom[0].share * 100).toFixed(1)}%, n=${breakdowns[0].bottom[0].rowCount}).`
      : `${breakdowns[0].bottom[0].label} là nhóm cần xem trước trong chiều ${breakdowns[0].label} (${(breakdowns[0].bottom[0].value * 100).toFixed(1)}%, n=${breakdowns[0].bottom[0].rowCount}).`);
    return {
      mode,
      analysisLabel: mode === 'customer' ? 'Phân tích khách hàng & kết quả' : mode === 'finance' ? 'Phân tích tài chính & kết quả' : 'Phân tích hiệu suất & kết quả',
      breakdownHeading: 'Kết quả khác nhau theo nhóm nào?',
      rowCount: rows.length, sourceRowCount, isRepresentativeSample, bindings, kpis, trend: [], trendChange: null, breakdowns,
      concentration: null, outlierCount: 0, findings,
      recommendedActions: [
        'So sánh nhóm có tỷ lệ kết quả cao và thấp, đồng thời kiểm tra cỡ mẫu trước khi hành động.',
        'Kiểm tra kênh, phân khúc và mức tương tác có liên hệ với kết quả; không diễn giải thành quan hệ nhân quả.',
        'Mở các bản ghi của nhóm yếu nhất để xác nhận chất lượng dữ liệu và tìm nguyên nhân vận hành.',
      ],
      limitations: [
        'Tỷ lệ được tính từ nhãn kết quả có trong nguồn; cần xác nhận ý nghĩa nghiệp vụ của giá trị tích cực.',
        'Dữ liệu mô tả mối liên hệ theo nhóm, không tự chứng minh tác động nhân quả.',
        ...(!bindings.date ? ['Không có mốc thời gian đủ rõ để so sánh xu hướng theo kỳ.'] : []),
      ],
    };
  }

  if (mode !== 'commercial') {
    const identityCount = operationalIdentity ? new Set(rows.map(row => textValue(row[operationalIdentity])).filter(Boolean)).size : rows.length;
    const requestedMeasureId = options.analysisAction?.measures?.[0];
    const requestedMeasure = requestedMeasures[0];
    const requestedMeasureSignal = normalize((options.analysisAction?.measures ?? []).join(' '));
    const configuredAggregation = Object.entries(options.analysisAction?.measureAggregations ?? {})
      .find(([measure]) => normalize(measure) === normalize(requestedMeasureId ?? '') || normalize(measure) === normalize(requestedMeasure ?? ''))?.[1];
    const isCountAngle = configuredAggregation === 'COUNT' || /recordcount|rowcount|deliverycount|shipmentcount|count/.test(requestedMeasureSignal);
    const selectedAggregation = configuredAggregation ?? (isCountAngle ? 'COUNT' : 'SUM');
    const selectedValueKind: SingleSourceKpi['kind'] = /revenue|money|amount|fee|cod|cost|price|discount/.test(requestedMeasureSignal) ? 'money' : 'number';
    const selectedValue = isCountAngle
      ? identityCount
      : selectedAggregation === 'AVG'
        ? average(rows, requestedMeasure)
        : sum(rows, requestedMeasure);
    const kpis: SingleSourceKpi[] = [];
    if (selectedValue !== null) {
      kpis.push({
        id: isCountAngle ? (isInventory ? 'records' : 'deliveries') : 'selected_measure',
        label: isCountAngle ? (isInventory ? 'Bản ghi tồn kho' : 'Lượt giao hàng') : `${selectedAggregation === 'AVG' ? 'Bình quân' : 'Tổng'} ${requestedMeasure}`,
        value: selectedValue,
        kind: selectedValueKind,
      });
    }
    if (!isCountAngle) kpis.push({ id: isInventory ? 'records' : 'deliveries', label: isInventory ? 'Bản ghi tồn kho' : 'Lượt giao hàng', value: identityCount, kind: 'number' });
    const deliveryFeeTotal = sum(rows, bindings.deliveryFee ?? bindings.fee);
    const codTotal = sum(rows, bindings.cod);
    const stockTotal = sum(rows, bindings.stock);
    const waitingValues = bindings.waitingTime ? rows.map(row => numberValue(row[bindings.waitingTime])).filter((value): value is number => value !== null) : [];
    if (deliveryFeeTotal !== null) kpis.push({ id: 'delivery_fee', label: 'Tổng chi phí giao hàng', value: deliveryFeeTotal, kind: 'money' });
    if (codTotal !== null) kpis.push({ id: 'cod_exposure', label: 'Tổng giá trị COD', value: codTotal, kind: 'money' });
    if (stockTotal !== null) kpis.push({ id: 'stock', label: 'Tổng lượng tồn', value: stockTotal, kind: 'number' });
    if (waitingValues.length) kpis.push({ id: 'average_waiting_time', label: 'Thời gian chờ bình quân', value: waitingValues.reduce((total, value) => total + value, 0) / waitingValues.length, kind: 'number' });
    const statusValues = bindings.deliveryStatus ? rows.map(row => textValue(row[bindings.deliveryStatus])).filter((value): value is string => Boolean(value)) : [];
    const statusSemanticsKnown = hasKnownOutcomeSemantics(statusValues);
    const onTimeCount = statusValues.filter(value => positiveOutcome(value) || /ontime|dunghen|completed|delivered|success|dagiao|giaothanhcong/i.test(normalize(value))).length;
    if (statusValues.length && statusSemanticsKnown) kpis.push({ id: 'on_time_rate', label: 'Tỷ lệ hoàn tất/đúng hẹn', value: onTimeCount / statusValues.length, kind: 'percent' });
    const requestedDimensions = actionPhysicalColumns(options.analysisAction?.dimensions, rows, options.semanticFields ?? []);
    const dimensions: Array<[string, string]> = isInventory
      ? [['warehouse', 'Kho'], ['product', 'Sản phẩm'], ['category', 'Nhóm hàng'], ['status', 'Trạng thái']]
      : [['deliveryStatus', 'Trạng thái giao hàng'], ['currentLocation', 'Vị trí hiện tại'], ['service', 'Dịch vụ'], ['carrier', 'Đơn vị vận chuyển'], ['warehouse', 'Kho / trung tâm'], ['route', 'Tuyến'], ['origin', 'Nơi gửi'], ['destination', 'Nơi nhận'], ['driver', 'Tài xế'], ['vehicle', 'Phương tiện']];
    const defaultDefinitions: Array<[string, string, string]> = dimensions.flatMap(([id, label]) => bindings[id] ? [[id, label, bindings[id]]] : []);
    const defaultByColumn = new Map(defaultDefinitions.map(definition => [definition[2], definition]));
    const requestedDefinitions: Array<[string, string, string]> = requestedDimensions.map((column, index) => defaultByColumn.get(column) ?? [`selected_${index}`, column, column]);
    const seenColumns = new Set<string>();
    const breakdownDefinitions = [...requestedDefinitions, ...defaultDefinitions].filter(([, , column]) => {
      if (seenColumns.has(column)) return false;
      seenColumns.add(column);
      return true;
    });
    const breakdowns = breakdownDefinitions.flatMap(([id, label, column]) => {
      if (!column) return [];
      const fallbackMeasure = isInventory ? bindings.stock : (bindings.deliveryFee ?? bindings.fee);
      const measure = requestedMeasure ?? fallbackMeasure;
      const breakdown = measure && !isCountAngle
        ? selectedAggregation === 'AVG'
          ? buildAverageBreakdown(rows, column, measure, id, label, requestedMeasure ? selectedValueKind : 'number')
          : buildBreakdown(rows, column, measure, id, label, requestedMeasure ? selectedValueKind : 'money')
        : buildCountBreakdown(rows, column, operationalIdentity, id, label);
      return breakdown ? [breakdown] : [];
    }).slice(0, 8);
    const dateColumn = bindings.deliveryDate ?? bindings.date;
    const trendMeasure = requestedMeasure ?? bindings.deliveryFee ?? bindings.stock;
    const trend = !dateColumn
      ? []
      : isCountAngle
        ? buildCountTrend(rows, dateColumn, operationalIdentity)
        : trendMeasure
          ? selectedAggregation === 'AVG'
            ? buildAverageTrend(rows, dateColumn, trendMeasure)
            : buildTrend(rows, dateColumn, trendMeasure)
          : [];
    const trendChange = trend.length > 1 && trend[0].value !== 0 ? (trend.at(-1)!.value - trend[0].value) / Math.abs(trend[0].value) : null;
    const findings: string[] = [];
    if (breakdowns[0]?.top[0]) findings.push(`${breakdowns[0].top[0].label} là nhóm lớn nhất, chiếm ${(breakdowns[0].top[0].share * 100).toFixed(1)}% phạm vi đã phân tích.`);
    if (statusValues.length && statusSemanticsKnown) findings.push(`${onTimeCount.toLocaleString()} trong ${statusValues.length.toLocaleString()} bản ghi có trạng thái hoàn tất hoặc đúng hẹn.`);
    if (statusValues.length && !statusSemanticsKnown) findings.push(`Trạng thái có ${new Set(statusValues).size.toLocaleString()} giá trị; LightBI chỉ phân tích phân bố và không tự gán mã trạng thái thành hoàn tất/đúng hẹn.`);
    if (waitingValues.length) {
      const q1 = quantile(waitingValues, 0.25); const q3 = quantile(waitingValues, 0.75); const fence = q3 + 1.5 * (q3 - q1);
      const delayed = waitingValues.filter(value => value > fence).length;
      if (delayed) findings.push(`Có ${delayed.toLocaleString()} bản ghi thời gian chờ cao bất thường theo ngưỡng IQR.`);
    }
    return {
      mode: isInventory ? 'inventory' : 'operations',
      analysisLabel: isInventory ? 'Phân tích tồn kho' : 'Phân tích vận hành & logistics',
      breakdownHeading: isInventory ? 'Tồn kho tập trung ở đâu?' : 'Hoạt động phân bố ở đâu?',
      rowCount: rows.length, sourceRowCount, isRepresentativeSample, bindings: {
        ...bindings,
        ...(requestedMeasure ? { selectedMeasure: requestedMeasure } : {}),
        ...Object.fromEntries(requestedDimensions.map((column, index) => [`selectedDimension${index + 1}`, column])),
      }, kpis, trend, trendChange, breakdowns,
      concentration: breakdowns[0]?.top[0] ? { label: breakdowns[0].top[0].label, share: breakdowns[0].top[0].share } : null,
      outlierCount: 0, findings,
      recommendedActions: isInventory
        ? ['Kiểm tra các kho và mặt hàng tập trung lớn nhất.', 'Đối chiếu nhóm tồn thấp, tồn cao và dữ liệu thiếu trước khi điều chuyển hàng.', 'Theo dõi biến động theo kỳ và xác nhận đơn vị đo.']
        : ['Kiểm tra nhóm trạng thái, tuyến hoặc đơn vị vận chuyển có ngoại lệ lớn nhất.', 'Đối chiếu thời gian chờ, chi phí và tỷ lệ đúng hẹn theo kho hoặc tuyến.', 'Mở các bản ghi bất thường trước khi điều chỉnh năng lực vận hành.'],
      limitations: ['Kết quả mô tả phân bố và ngoại lệ trong dữ liệu, không tự khẳng định quan hệ nhân quả.'],
    };
  }

  const commercialRequestedMeasure = requestedMeasures[0] ?? revenue;
  const commercialRequestedId = options.analysisAction?.measures?.[0];
  const commercialAggregation = Object.entries(options.analysisAction?.measureAggregations ?? {})
    .find(([measure]) => normalize(measure) === normalize(commercialRequestedId ?? '') || normalize(measure) === normalize(commercialRequestedMeasure))?.[1] ?? 'SUM';
  const commercialSignal = normalize(commercialRequestedId ?? commercialRequestedMeasure);
  const commercialValueKind: SingleSourceKpi['kind'] = /revenue|money|amount|fee|cod|cost|price|discount/.test(commercialSignal) ? 'money' : 'number';
  const commercialSelectedValue = commercialAggregation === 'AVG'
    ? average(rows, commercialRequestedMeasure) ?? 0
    : commercialAggregation === 'COUNT'
      ? rows.filter(row => textValue(row[commercialRequestedMeasure]) !== null).length
      : sum(rows, commercialRequestedMeasure) ?? 0;
  const revenueTotal = sum(rows, revenue) ?? 0;
  const quantityTotal = sum(rows, bindings.quantity);
  const discountValues = bindings.discount
    ? rows.map(row => numberValue(row[bindings.discount])).filter((value): value is number => value !== null)
    : [];
  const orderCount = bindings.order
    ? new Set(rows.map(row => textValue(row[bindings.order])).filter(Boolean)).size
    : rows.length;
  const usesDefaultRevenueAngle = commercialRequestedMeasure === revenue;
  const kpis: SingleSourceKpi[] = [{
    id: usesDefaultRevenueAngle ? 'revenue' : 'selected_measure',
    label: usesDefaultRevenueAngle ? 'Doanh thu' : `${commercialAggregation === 'AVG' ? 'Bình quân' : commercialAggregation === 'COUNT' ? 'Số bản ghi' : 'Tổng'} ${commercialRequestedMeasure}`,
    value: commercialSelectedValue,
    kind: commercialValueKind,
  }];
  if (!usesDefaultRevenueAngle) kpis.push({ id: 'revenue', label: 'Doanh thu', value: revenueTotal, kind: 'money' });
  kpis.push({ id: 'orders', label: bindings.order ? 'Số đơn hàng' : 'Số bản ghi', value: orderCount, kind: 'number' });
  if (quantityTotal !== null && commercialRequestedMeasure !== bindings.quantity) kpis.push({ id: 'quantity', label: 'Số lượng bán', value: quantityTotal, kind: 'number' });
  if (orderCount > 0) kpis.push({ id: 'average_order_value', label: 'Doanh thu bình quân/đơn', value: revenueTotal / orderCount, kind: 'money' });
  if (discountValues.length > 0) {
    const discountIsRate = discountValues.every(value => Math.abs(value) <= 1);
    kpis.push(discountIsRate
      ? { id: 'discount', label: 'Chiết khấu bình quân', value: discountValues.reduce((total, value) => total + value, 0) / discountValues.length, kind: 'percent' }
      : { id: 'discount', label: 'Tổng chiết khấu', value: discountValues.reduce((total, value) => total + value, 0), kind: 'money' });
  }

  const dimensionDefinitions: Array<[string, string]> = [
    ['product', 'Sản phẩm'], ['category', 'Ngành hàng'], ['brand', 'Thương hiệu'], ['branch', 'Chi nhánh / cửa hàng'],
    ['salesperson', 'Nhân viên bán hàng'], ['payment', 'Phương thức thanh toán'], ['status', 'Trạng thái đơn hàng'],
  ];
  const requestedCommercialDimensions = actionPhysicalColumns(options.analysisAction?.dimensions, rows, options.semanticFields ?? []);
  const defaultCommercialDefinitions: Array<[string, string, string]> = dimensionDefinitions.flatMap(([id, label]) => bindings[id] ? [[id, label, bindings[id]]] : []);
  const defaultCommercialByColumn = new Map(defaultCommercialDefinitions.map(definition => [definition[2], definition]));
  const requestedCommercialDefinitions: Array<[string, string, string]> = requestedCommercialDimensions.map((column, index) => defaultCommercialByColumn.get(column) ?? [`selected_${index}`, column, column]);
  const seenCommercialColumns = new Set<string>();
  const breakdowns = [...requestedCommercialDefinitions, ...defaultCommercialDefinitions].filter(([, , column]) => {
    if (seenCommercialColumns.has(column)) return false;
    seenCommercialColumns.add(column);
    return true;
  }).flatMap(([id, label, column]) => {
    const breakdown = commercialAggregation === 'AVG'
      ? buildAverageBreakdown(rows, column, commercialRequestedMeasure, id, label, commercialValueKind)
      : commercialAggregation === 'COUNT'
        ? buildCountBreakdown(rows, column, commercialRequestedMeasure, id, label)
        : buildBreakdown(rows, column, commercialRequestedMeasure, id, label, commercialValueKind);
    return breakdown ? [breakdown] : [];
  });
  const trend = bindings.date
    ? commercialAggregation === 'AVG'
      ? buildAverageTrend(rows, bindings.date, commercialRequestedMeasure)
      : commercialAggregation === 'COUNT'
        ? buildCountTrend(rows, bindings.date, commercialRequestedMeasure)
        : buildTrend(rows, bindings.date, commercialRequestedMeasure)
    : [];
  const trendChange = trend.length > 1 && trend[0].value !== 0 ? (trend.at(-1)!.value - trend[0].value) / Math.abs(trend[0].value) : null;
  const revenueValues = rows.map(row => numberValue(row[commercialRequestedMeasure])).filter((value): value is number => value !== null);
  const q1 = quantile(revenueValues, 0.25);
  const q3 = quantile(revenueValues, 0.75);
  const upperFence = q3 + 1.5 * (q3 - q1);
  const outlierCount = revenueValues.filter(value => value > upperFence).length;
  const primaryBreakdown = breakdowns[0] ?? null;
  const concentration = primaryBreakdown?.top[0] ? { label: primaryBreakdown.top[0].label, share: primaryBreakdown.top[0].share } : null;
  const commercialAngleLabel = usesDefaultRevenueAngle ? 'Doanh thu' : commercialRequestedMeasure;
  const findings: string[] = [];
  if (trendChange !== null) findings.push(`${commercialAngleLabel} kỳ cuối ${trendChange >= 0 ? 'tăng' : 'giảm'} ${Math.abs(trendChange * 100).toFixed(1)}% so với kỳ đầu trong file.`);
  if (concentration) findings.push(`${concentration.label} đóng góp ${(concentration.share * 100).toFixed(1)}% ${commercialAngleLabel}, là nhóm đóng góp lớn nhất.`);
  if (outlierCount > 0) findings.push(`Có ${outlierCount.toLocaleString()} dòng ${commercialAngleLabel} cao bất thường theo ngưỡng IQR, nên kiểm tra trước khi ra quyết định.`);

  const limitations = [
    'Kết quả mô tả mối liên hệ và mức đóng góp trong dữ liệu, không tự khẳng định quan hệ nhân quả.',
    ...(trend.length < 2 ? ['File chưa có đủ nhiều kỳ thời gian để đánh giá xu hướng đáng tin cậy.'] : []),
    ...(!bindings.order ? ['Không tìm thấy định danh đơn hàng; số bản ghi không được diễn giải thành số đơn hàng.'] : []),
  ];
  return {
    mode: 'commercial', analysisLabel: usesDefaultRevenueAngle ? 'Phân tích doanh thu' : `Phân tích ${commercialRequestedMeasure}`, breakdownHeading: `${commercialRequestedMeasure} đến từ đâu?`,
    rowCount: rows.length, sourceRowCount, isRepresentativeSample, bindings: {
      ...bindings,
      selectedMeasure: commercialRequestedMeasure,
      ...Object.fromEntries(requestedCommercialDimensions.map((column, index) => [`selectedDimension${index + 1}`, column])),
    }, kpis, trend, trendChange, breakdowns, concentration, outlierCount, findings,
    recommendedActions: ['Mở nhóm đóng góp lớn nhất để kiểm tra sản phẩm, cửa hàng và nhân viên tạo ra kết quả.', 'So sánh nhóm tăng trưởng với nhóm suy giảm trước khi thay đổi giá, chiết khấu hoặc phân bổ nguồn lực.', 'Kiểm tra các dòng bất thường và chất lượng dữ liệu trước khi dùng kết quả cho quyết định tài chính.'],
    limitations,
  };
}

export function createSingleSourceBAOverview(rows: Row[], options: SingleSourceBAOverviewOptions = {}): SingleSourceBAOverview | null {
  const overview = createBaseSingleSourceBAOverview(rows, options);
  if (!overview) return null;
  return {
    ...overview,
    investigation: buildDeepBAInvestigation(rows, overview, options.semanticFields ?? [], options.selectedPerspective),
  };
}
