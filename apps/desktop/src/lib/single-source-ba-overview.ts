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
  top: SingleSourceRankedValue[];
  bottom: SingleSourceRankedValue[];
}

export interface SingleSourceTrendPoint {
  period: string;
  value: number;
  rowCount: number;
}

export interface SingleSourceBAOverview {
  rowCount: number;
  bindings: Record<string, string>;
  kpis: SingleSourceKpi[];
  trend: SingleSourceTrendPoint[];
  trendChange: number | null;
  breakdowns: SingleSourceBreakdown[];
  concentration: { label: string; share: number } | null;
  outlierCount: number;
  findings: string[];
  limitations: string[];
}

type Row = Record<string, unknown>;

const ALIASES: Record<string, string[]> = {
  revenue: ['revenue', 'salesrevenue', 'netrevenue', 'invoicetotal', 'totalrevenue', 'amount'],
  quantity: ['quantity', 'qty', 'soldqty', 'quantitysold', 'salesquantity'],
  order: ['orderid', 'orderno', 'ordernumber', 'invoiceid', 'invoiceno'],
  date: ['orderdate', 'salesdate', 'transactiondate', 'invoicedate', 'date', 'reportdate'],
  product: ['product', 'productname', 'item', 'itemname', 'sku'],
  brand: ['brand', 'productbrand', 'manufacturer'],
  category: ['category', 'productcategory', 'itemcategory', 'group'],
  branch: ['store', 'branch', 'warehouse', 'location', 'shop'],
  salesperson: ['salesperson', 'salesrep', 'seller', 'employee', 'staff'],
  payment: ['paymentmethod', 'payment', 'paymenttype', 'tender'],
  status: ['status', 'orderstatus', 'salesstatus'],
  discount: ['discount', 'discountamount', 'discountvalue'],
  unitPrice: ['unitprice', 'price', 'sellingprice'],
};

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function bindColumns(rows: Row[]): Record<string, string> {
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  const normalized = new Map(columns.map(column => [normalize(column), column]));
  const bindings: Record<string, string> = {};
  for (const [semantic, aliases] of Object.entries(ALIASES)) {
    const exact = aliases.map(alias => normalized.get(alias)).find(Boolean);
    if (exact) bindings[semantic] = exact;
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

function buildBreakdown(rows: Row[], dimensionColumn: string, measureColumn: string, id: string, label: string): SingleSourceBreakdown | null {
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
  return { id, label, physicalColumn: dimensionColumn, top: ranked.slice(0, 5), bottom: [...ranked].reverse().slice(0, 3) };
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

export function createSingleSourceBAOverview(rows: Row[]): SingleSourceBAOverview | null {
  if (rows.length === 0) return null;
  const bindings = bindColumns(rows);
  const revenue = bindings.revenue;
  if (!revenue) return null;

  const revenueTotal = sum(rows, revenue) ?? 0;
  const quantityTotal = sum(rows, bindings.quantity);
  const discountValues = bindings.discount
    ? rows.map(row => numberValue(row[bindings.discount])).filter((value): value is number => value !== null)
    : [];
  const orderCount = bindings.order
    ? new Set(rows.map(row => textValue(row[bindings.order])).filter(Boolean)).size
    : rows.length;
  const kpis: SingleSourceKpi[] = [
    { id: 'revenue', label: 'Doanh thu', value: revenueTotal, kind: 'money' },
    { id: 'orders', label: bindings.order ? 'Số đơn hàng' : 'Số bản ghi', value: orderCount, kind: 'number' },
  ];
  if (quantityTotal !== null) kpis.push({ id: 'quantity', label: 'Số lượng bán', value: quantityTotal, kind: 'number' });
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
  const breakdowns = dimensionDefinitions.flatMap(([id, label]) => {
    const column = bindings[id];
    const breakdown = column ? buildBreakdown(rows, column, revenue, id, label) : null;
    return breakdown ? [breakdown] : [];
  });
  const trend = bindings.date ? buildTrend(rows, bindings.date, revenue) : [];
  const trendChange = trend.length > 1 && trend[0].value !== 0 ? (trend.at(-1)!.value - trend[0].value) / Math.abs(trend[0].value) : null;
  const revenueValues = rows.map(row => numberValue(row[revenue])).filter((value): value is number => value !== null);
  const q1 = quantile(revenueValues, 0.25);
  const q3 = quantile(revenueValues, 0.75);
  const upperFence = q3 + 1.5 * (q3 - q1);
  const outlierCount = revenueValues.filter(value => value > upperFence).length;
  const primaryBreakdown = breakdowns[0] ?? null;
  const concentration = primaryBreakdown?.top[0] ? { label: primaryBreakdown.top[0].label, share: primaryBreakdown.top[0].share } : null;
  const findings: string[] = [];
  if (trendChange !== null) findings.push(`Doanh thu kỳ cuối ${trendChange >= 0 ? 'tăng' : 'giảm'} ${Math.abs(trendChange * 100).toFixed(1)}% so với kỳ đầu trong file.`);
  if (concentration) findings.push(`${concentration.label} đóng góp ${(concentration.share * 100).toFixed(1)}% doanh thu, là nhóm đóng góp lớn nhất.`);
  if (outlierCount > 0) findings.push(`Có ${outlierCount.toLocaleString()} dòng doanh thu cao bất thường theo ngưỡng IQR, nên kiểm tra trước khi ra quyết định.`);

  const limitations = [
    'Kết quả mô tả mối liên hệ và mức đóng góp trong dữ liệu, không tự khẳng định quan hệ nhân quả.',
    ...(trend.length < 2 ? ['File chưa có đủ nhiều kỳ thời gian để đánh giá xu hướng đáng tin cậy.'] : []),
    ...(!bindings.order ? ['Không tìm thấy định danh đơn hàng; số bản ghi không được diễn giải thành số đơn hàng.'] : []),
  ];
  return { rowCount: rows.length, bindings, kpis, trend, trendChange, breakdowns, concentration, outlierCount, findings, limitations };
}
