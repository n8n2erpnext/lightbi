import type { SignalFamily, SignalRole } from "./contracts";
import { SEMANTIC_SIGNAL_REGISTRY_V1, type SemanticSignalDefinition } from "../semantic-registry";

export type SignalRule = {
  id: string;
  family: SignalFamily;
  role: SignalRole;
  label: string;
  patterns: RegExp[];
  defaultUsable?: boolean;
  source?: "semantic_registry" | "core_supplemental";
  registryCanonicalIds?: string[];
};

const CORE_ID_BY_CANONICAL: Record<string, string> = {
  report_date: "time.transaction_date",
  pickup_date: "time.transaction_date",
  delivery_date: "time.transaction_date",
  actual_time: "time.completed_at",
  close_date: "time.completed_at",
  hire_date: "time.created_at",
  termination_date: "time.completed_at",
  renewal_date: "time.deadline",
  effective_date: "time.transaction_date",
  expiration_date: "time.deadline",
  time_period: "time.period",
  fiscal_month: "time.fiscal_month",
  fiscal_year: "time.fiscal_year",
  response_time: "time.duration",
  resolution_time: "time.duration",
  waiting_time: "time.duration",
  downtime: "time.duration",

  revenue: "money.revenue",
  net_revenue: "money.revenue",
  sales: "money.revenue",
  invoice_total: "money.revenue",
  receivable: "money.receivable",
  payable: "money.payable",
  debt: "money.debt",
  cost: "money.cost",
  total_cost: "money.cost",
  expense: "money.cost",
  purchase_cost: "money.cost",
  operational_cost: "money.cost",
  supplier_cost: "money.cost",
  gross_profit: "money.profit",
  profit: "money.profit",
  margin: "money.margin",
  margin_pct: "money.margin",
  opening_balance: "money.opening_balance",
  closing_balance: "money.closing_balance",
  balance: "money.balance",
  discount: "money.discount",
  tax_amount: "money.tax",
  tax_rate: "money.tax",
  delivery_fee: "money.fee",
  toll_fee: "money.fee",
  freight_fee: "money.fee",
  cod_amount: "money.cod",
  payment_method: "money.payment_method",
  payment_cash: "money.payment_cash",
  payment_card: "money.payment_card",
  payment_bank: "money.payment_bank",
  payment_voucher: "money.payment_voucher",
  change_amount: "money.refund_or_change",
  rounding_amount: "money.rounding",

  customer: "entity.customer",
  account: "entity.customer",
  contact: "entity.customer",
  patient: "entity.patient",
  supplier: "entity.vendor",
  vendor: "entity.vendor",
  employee: "entity.employee",
  cashier: "entity.employee",
  owner: "entity.employee",
  agent: "entity.employee",
  salesperson: "entity.salesperson",
  manager: "entity.manager",
  department: "entity.department",
  team: "entity.team",
  carrier: "entity.carrier",
  driver: "entity.driver",
  doctor: "entity.doctor",
  provider: "entity.vendor",
  person: "entity.person",
  coach: "entity.coach",
  role: "entity.role",

  product: "item.product",
  material: "item.product",
  crop: "item.product",
  sku: "item.sku",
  barcode: "item.sku",
  batch: "item.sku",
  serial_number: "item.sku",
  service_group: "item.service",
  item_type: "item.product",
  medicine: "item.medicine",

  branch: "location.store",
  warehouse: "location.warehouse",
  current_location: "location.current",
  origin_location: "location.route",
  destination_location: "location.route",
  route: "location.route",
  territory: "location.region",
  country: "location.country",
  region: "location.region",
  bin_location: "location.warehouse",
  field: "location.region",
  plant: "location.warehouse",
  property: "location.store",
  unit: "location.store",

  invoice: "document.invoice",
  receipt: "document.invoice",
  billing_document: "document.invoice",
  order: "document.order",
  order_id: "document.order",
  sales_order: "document.sales_order",
  purchase_order: "document.purchase_order",
  goods_receipt: "document.goods_receipt",
  return_document: "document.return",
  goods_movement: "document.stock_transfer",
  shipment: "document.shipment",
  shipment_id: "document.shipment",
  trip: "document.shipment",
  work_order: "document.order",
  maintenance_order: "document.order",
  appointment: "document.order",
  claim: "document.order",
  ticket: "document.order",
  contract_id: "document.order",
  lease: "document.order",
  grant: "document.order",
  inspection_lot: "document.order",
  document_type: "document.type",
  related_document: "document.related",

  status: "status.lifecycle",
  lifecycle_status: "status.lifecycle",
  delivery_status: "status.delivery",
  on_time_status: "status.delivery",
  fulfillment_status: "status.fulfillment",
  approval_status: "status.approval",
  reconciliation_status: "status.reconciliation",
  payment_status: "status.payment",
  stock_status: "status.stock",
  load_status: "status.lifecycle",
  attendance_status: "status.lifecycle",
  pipeline_stage: "status.lifecycle",
  stage_name: "status.lifecycle",
  lead_status: "status.lifecycle",
  ticket_status: "status.lifecycle",
  priority: "status.lifecycle",
  qc_result: "status.lifecycle",

  stock_qty: "quantity.units",
  quantity: "quantity.units",
  ordered_qty: "quantity.ordered",
  received_qty: "quantity.received",
  sold_qty: "quantity.sold",
  returned_qty: "quantity.returned",
  weight: "quantity.weight",
  volume: "quantity.units",
  distance: "quantity.units",
  work_hours: "quantity.units",
  scrap_qty: "quantity.returned",
  reserved_qty: "quantity.units",
  available_qty: "quantity.units",

  stock_age: "inventory.age",
  stock_threshold: "inventory.age_bucket",
  reorder_level: "inventory.age_bucket",
  inventory: "inventory.age_bucket",

  retention: "engagement.outcome",
  purchase_behavior: "engagement.outcome",
  campaign: "engagement.contact_channel",
  source_medium: "engagement.contact_channel",
  segment: "engagement.segment",
  campaign_attempts: "engagement.campaign_attempts",
  previous_contacts: "engagement.previous_contacts",
  previous_outcome: "engagement.previous_outcome",

  event: "event.activity",
  activity: "event.activity",
  row_type: "event.activity",

  kpi: "indicator.metric",
  target: "indicator.metric",
  achievement: "indicator.metric",
  actual: "indicator.metric",
  capacity: "indicator.metric",
  utilization: "indicator.metric",
  productivity: "indicator.metric",
  defect_rate: "indicator.metric",
  yield_rate: "indicator.metric",
  quality_score: "indicator.metric",
  progress_pct: "indicator.metric"
};

export const CORE_ONLY_UNIVERSAL_SIGNAL_IDS = new Set([
  "document.match",
  "document.round",
  "document.prescription",
  "event.lineup"
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasesToPatterns(signal: SemanticSignalDefinition): RegExp[] {
  const aliases = [...new Set([
    ...signal.headerAliases,
    ...signal.aliases
  ].map(alias => alias.trim()).filter(Boolean))];

  // Value aliases describe cell values (for example "received" or "on time").
  // Treating them as header aliases causes unrelated columns such as
  // `Huyện Nhận` to become a delivery-status field merely because their header
  // contains one translated status word. Value evidence belongs in contextual
  // resolution, never in the header matcher.

  return aliases.map(alias => {
    const escaped = escapeRegExp(alias);
    if (/^[a-z0-9]+$/i.test(alias) && alias.length <= 4) {
      return new RegExp(`\\b${escaped}\\b`, "i");
    }
    return new RegExp(escaped, "i");
  });
}

function semanticFamilyToCoreFamily(signal: SemanticSignalDefinition): SignalFamily {
  const mappedId = CORE_ID_BY_CANONICAL[signal.canonicalId];
  if (mappedId) return mappedId.split(".")[0] as SignalFamily;

  if (signal.semanticFamily === "money" || signal.semanticFamily === "accounting") return "money";
  if (signal.semanticFamily === "time") return "time";
  if (signal.semanticFamily === "entity" || signal.semanticFamily === "organization") return "entity";
  if (signal.semanticFamily === "item" || signal.semanticFamily === "material") return "item";
  if (signal.semanticFamily === "location") return "location";
  if (signal.semanticFamily === "document" || signal.role === "identifier") return "document";
  if (signal.semanticFamily === "status" || signal.role === "status") return "status";
  if (signal.semanticFamily === "quantity" || signal.semanticFamily === "measurement") return "quantity";
  if (signal.semanticFamily === "inventory") return "inventory";
  if (signal.semanticFamily === "engagement" || signal.semanticFamily === "marketing" || signal.semanticFamily === "subscription") return "engagement";
  if (signal.semanticFamily === "quality") return "quality";
  if (signal.role === "measure") return "indicator";
  return "event";
}

function semanticRoleToCoreRole(signal: SemanticSignalDefinition): SignalRole {
  if (signal.role === "identifier") return "identifier";
  if (signal.role === "status") return "status";
  if (signal.role === "time") return "time";
  if (signal.role === "measure") return "measure";
  return "dimension";
}

function coreRuleId(signal: SemanticSignalDefinition): string {
  return CORE_ID_BY_CANONICAL[signal.canonicalId] ?? `${semanticFamilyToCoreFamily(signal)}.${signal.canonicalId}`;
}

function makeRegistryBackedRules(): SignalRule[] {
  const byId = new Map<string, SignalRule>();
  for (const signal of SEMANTIC_SIGNAL_REGISTRY_V1) {
    const id = coreRuleId(signal);
    const existing = byId.get(id);
    const patterns = aliasesToPatterns(signal);
    if (!patterns.length) continue;

    if (existing) {
      existing.patterns.push(...patterns);
      existing.registryCanonicalIds?.push(signal.canonicalId);
      continue;
    }

    byId.set(id, {
      id,
      family: semanticFamilyToCoreFamily(signal),
      role: semanticRoleToCoreRole(signal),
      label: signal.label,
      patterns,
      defaultUsable: signal.role !== "identifier",
      source: "semantic_registry",
      registryCanonicalIds: [signal.canonicalId]
    });
  }

  return [...byId.values()];
}

const CORE_COMPAT_SIGNAL_RULES: SignalRule[] = [
  // Money is intentionally broad. Industry-specific overlays should inherit it.
  { id: "money.revenue", family: "money", role: "measure", label: "Revenue / Total Amount", patterns: [/doanh thu|tổng tiền|thành tiền|sales|revenue|gross amount|net amount|total amount|transaction value/i] },
  { id: "money.receivable", family: "money", role: "measure", label: "Receivable / Amount Due", patterns: [/tiền phải thu|phải thu|amount due|receivable|\bar\b/i] },
  { id: "money.payable", family: "money", role: "measure", label: "Payable", patterns: [/phải trả|payable|ap\b/i] },
  { id: "money.debt", family: "money", role: "measure", label: "Debt / Outstanding", patterns: [/công nợ|nợ|debt|outstanding/i] },
  { id: "money.cost", family: "money", role: "measure", label: "Cost", patterns: [/giá vốn|chi phí|cost|expense/i] },
  { id: "money.margin", family: "money", role: "measure", label: "Margin", patterns: [/biên lợi nhuận|lãi gộp|gross margin|margin/i] },
  { id: "money.profit", family: "money", role: "measure", label: "Profit", patterns: [/lợi nhuận|profit|net income/i] },
  { id: "money.opening_balance", family: "money", role: "measure", label: "Opening Balance", patterns: [/số dư đầu|opening balance|beginning balance/i] },
  { id: "money.closing_balance", family: "money", role: "measure", label: "Closing Balance", patterns: [/số dư cuối|closing balance|ending balance/i] },
  { id: "money.balance", family: "money", role: "measure", label: "Balance", patterns: [/số dư|balance/i] },
  { id: "money.discount", family: "money", role: "measure", label: "Discount", patterns: [/chiết khấu|giảm giá|discount/i] },
  { id: "money.tax", family: "money", role: "measure", label: "Tax", patterns: [/thuế|vat|tax/i] },
  { id: "money.payment_method", family: "money", role: "dimension", label: "Payment Method", patterns: [/phương thức thanh toán|hình thức thanh toán|payment method|payment/i] },
  { id: "money.payment_cash", family: "money", role: "measure", label: "Cash Payment", patterns: [/tiền mặt|cash/i] },
  { id: "money.payment_card", family: "money", role: "measure", label: "Card Payment", patterns: [/cà thẻ|card/i] },
  { id: "money.payment_bank", family: "money", role: "measure", label: "Bank Transfer", patterns: [/ngân hàng|chuyển khoản|bank|transfer/i] },
  { id: "money.payment_voucher", family: "money", role: "measure", label: "Voucher Payment", patterns: [/pmh|phiếu mua hàng|voucher|gift/i] },
  { id: "money.refund_or_change", family: "money", role: "measure", label: "Refund / Change", patterns: [/hoàn tiền|tiền thối|thối lại|refund|change/i] },
  { id: "money.rounding", family: "money", role: "measure", label: "Rounding", patterns: [/làm tròn|rounding|rounding amount|rounding adjustment|round off|round-off|round amount/i] },
  { id: "money.fee", family: "money", role: "measure", label: "Fee", patterns: [/phí|fee|shipping|delivery/i] },
  { id: "money.cod", family: "money", role: "measure", label: "COD / Cash on Delivery", patterns: [/thu hộ|\bcod\b|cash on delivery/i] },

  { id: "time.transaction_date", family: "time", role: "time", label: "Transaction Date", patterns: [/ngày bán|ngày xuất|ngày giao dịch|transaction date|invoice date|date/i] },
  { id: "time.period", family: "time", role: "time", label: "Period", patterns: [/kỳ|tháng|năm|period|month|year/i] },
  { id: "time.fiscal_month", family: "time", role: "time", label: "Fiscal Month", patterns: [/tháng tài chính|fiscal month/i] },
  { id: "time.fiscal_year", family: "time", role: "time", label: "Fiscal Year", patterns: [/năm tài chính|fiscal year/i] },
  { id: "time.created_at", family: "time", role: "time", label: "Created Time", patterns: [/ngày tạo|thời gian tạo|created|created at/i] },
  { id: "time.completed_at", family: "time", role: "time", label: "Completed Time", patterns: [/hoàn tất|completed|checkout|check.?out/i] },
  { id: "time.deadline", family: "time", role: "time", label: "Deadline", patterns: [/deadline|hạn|due date/i] },
  { id: "time.duration", family: "time", role: "measure", label: "Duration", patterns: [/thời gian chờ|thời gian tồn|duration|waiting|aging/i] },

  { id: "entity.customer", family: "entity", role: "dimension", label: "Customer", patterns: [/khách hàng|customer|client|buyer/i] },
  { id: "entity.vendor", family: "entity", role: "dimension", label: "Vendor / Supplier", patterns: [/nhà cung cấp|vendor|supplier/i] },
  { id: "entity.employee", family: "entity", role: "dimension", label: "Employee / User", patterns: [/nhân viên|employee|staff|\buser\b|user id|username|người tạo|người xuất/i] },
  { id: "entity.salesperson", family: "entity", role: "dimension", label: "Salesperson", patterns: [/nhân viên bán|salesperson|sales rep/i] },
  { id: "entity.manager", family: "entity", role: "dimension", label: "Manager", patterns: [/quản lý|manager/i] },
  { id: "entity.department", family: "entity", role: "dimension", label: "Department", patterns: [/phòng ban|bộ phận|department|dept/i] },
  { id: "entity.carrier", family: "entity", role: "dimension", label: "Carrier", patterns: [/đơn vị vận chuyển|carrier|shipper|courier/i] },
  { id: "entity.patient", family: "entity", role: "dimension", label: "Patient", patterns: [/bệnh nhân|patient/i] },
  { id: "entity.doctor", family: "entity", role: "dimension", label: "Doctor / Clinician", patterns: [/bác sĩ|doctor|clinician|physician/i] },
  { id: "entity.driver", family: "entity", role: "dimension", label: "Driver", patterns: [/lái xe|driver/i] },
  { id: "entity.person", family: "entity", role: "dimension", label: "Person / Participant", patterns: [/person|participant|attendee|member|player name|player|athlete|cầu thủ|người tham gia/i] },
  { id: "entity.team", family: "entity", role: "dimension", label: "Team / Group", patterns: [/team initials|team|group|đội|nhóm|club/i] },
  { id: "entity.coach", family: "entity", role: "dimension", label: "Coach / Lead", patterns: [/coach|trainer|huấn luyện|leader|lead/i] },
  { id: "entity.role", family: "entity", role: "dimension", label: "Role / Position", patterns: [/position|role|vị trí|chức danh/i] },

  { id: "item.product", family: "item", role: "dimension", label: "Product / Item", patterns: [/sản phẩm|tên hàng|hàng hóa|product|item|material/i] },
  { id: "item.sku", family: "item", role: "identifier", label: "SKU / Product Code", patterns: [/\bsku\b|\bplu\b|mã hàng|mã sản phẩm|barcode|product code/i], defaultUsable: false },
  { id: "item.service", family: "item", role: "dimension", label: "Service", patterns: [/dịch vụ|service|service group/i] },
  { id: "item.medicine", family: "item", role: "dimension", label: "Medicine", patterns: [/thuốc|dược|medicine|drug|pharmacy/i] },

  { id: "location.store", family: "location", role: "dimension", label: "Store / Branch", patterns: [/cửa hàng|siêu thị|mã kho|tên kho|store|branch|outlet/i] },
  { id: "location.warehouse", family: "location", role: "dimension", label: "Warehouse", patterns: [/kho|warehouse/i] },
  { id: "location.country", family: "location", role: "dimension", label: "Country", patterns: [/country|quốc gia/i] },
  { id: "location.region", family: "location", role: "dimension", label: "Region", patterns: [/vùng|miền|khu vực|region|area/i] },
  { id: "location.current", family: "location", role: "dimension", label: "Current Location", patterns: [/bưu cục hiện tại|chi nhánh hiện tại|current location|current branch|current hub/i] },
  { id: "location.route", family: "location", role: "dimension", label: "Route", patterns: [/tuyến|route|hanh_trinh/i] },

  { id: "document.invoice", family: "document", role: "identifier", label: "Invoice / Receipt", patterns: [/hóa đơn|phiếu xuất|invoice|receipt|bill/i] },
  { id: "document.purchase_order", family: "document", role: "identifier", label: "Purchase Order", patterns: [/đơn mua hàng|po\b|purchase order/i] },
  { id: "document.sales_order", family: "document", role: "identifier", label: "Sales Order", patterns: [/đơn bán hàng|so\b|sales order/i] },
  { id: "document.goods_receipt", family: "document", role: "identifier", label: "Goods Receipt", patterns: [/phiếu nhập|goods receipt|grn|receiving/i] },
  { id: "document.stock_transfer", family: "document", role: "identifier", label: "Stock Transfer", patterns: [/chuyển kho|stock transfer|transfer order/i] },
  { id: "document.return", family: "document", role: "identifier", label: "Return Document", patterns: [/phiếu trả|trả hàng|return document|sales return|purchase return/i] },
  { id: "document.order", family: "document", role: "identifier", label: "Order", patterns: [/đơn hàng|order/i] },
  { id: "document.shipment", family: "document", role: "identifier", label: "Shipment / Waybill", patterns: [/mã phiếu gửi|vận đơn|shipment|waybill|awb|tracking/i] },
  { id: "document.match", family: "document", role: "identifier", label: "Match / Session", patterns: [/match id|matchid|game id|session id|fixture/i], defaultUsable: false },
  { id: "document.round", family: "document", role: "identifier", label: "Round / Batch", patterns: [/round id|roundid|batch id|wave id/i], defaultUsable: false },
  { id: "document.prescription", family: "document", role: "identifier", label: "Prescription", patterns: [/toa thuốc|đơn thuốc|prescription/i] },
  { id: "document.related", family: "document", role: "dimension", label: "Related Document", patterns: [/chứng từ liên quan|related document|reference|ref doc/i] },
  { id: "document.type", family: "document", role: "dimension", label: "Document Type", patterns: [/loại phiếu|loại chứng từ|document type|doc type/i] },

  { id: "status.lifecycle", family: "status", role: "status", label: "Lifecycle Status", patterns: [/trạng thái|tình trạng|status|state/i] },
  { id: "status.approval", family: "status", role: "status", label: "Approval Status", patterns: [/duyệt|phê duyệt|approval|approved/i] },
  { id: "status.fulfillment", family: "status", role: "status", label: "Fulfillment Status", patterns: [/thực hiện|fulfillment|fulfilled|picked|packed/i] },
  { id: "status.reconciliation", family: "status", role: "status", label: "Reconciliation Status", patterns: [/đối soát|reconcile|reconciliation/i] },
  { id: "status.payment", family: "status", role: "status", label: "Payment Status", patterns: [/trạng thái thanh toán|payment status/i] },
  { id: "status.delivery", family: "status", role: "status", label: "Delivery Status", patterns: [/trạng thái giao hàng|delivery.?status|delivery_status|đúng hẹn|on.?time/i] },
  { id: "status.stock", family: "status", role: "status", label: "Stock Status", patterns: [/ngưỡng tồn|tồn kho|stock status|inventory status/i] },

  { id: "quantity.units", family: "quantity", role: "measure", label: "Quantity", patterns: [/số lượng|qty|quantity|units/i] },
  { id: "quantity.ordered", family: "quantity", role: "measure", label: "Ordered Quantity", patterns: [/số lượng đặt|ordered qty|order qty/i] },
  { id: "quantity.received", family: "quantity", role: "measure", label: "Received Quantity", patterns: [/số lượng nhận|received qty|received quantity/i] },
  { id: "quantity.sold", family: "quantity", role: "measure", label: "Sold Quantity", patterns: [/số lượng bán|sold qty|sold quantity/i] },
  { id: "quantity.returned", family: "quantity", role: "measure", label: "Returned Quantity", patterns: [/số lượng trả|returned qty|return qty/i] },
  { id: "quantity.weight", family: "quantity", role: "measure", label: "Weight", patterns: [/trọng lượng|khối lượng|weight|gram|gam/i] },

  { id: "inventory.age_bucket", family: "inventory", role: "dimension", label: "Inventory Age Bucket", patterns: [/ngưỡng tồn|aging bucket|age bucket/i] },
  { id: "inventory.age", family: "inventory", role: "measure", label: "Inventory Age", patterns: [/thời gian tồn|stock age|aging/i] },

  // Engagement/response signals are intentionally not bank-specific. They cover
  // campaign response, lead conversion, survey outcome, churn, subscription, and
  // approval-style datasets where the main question is "what drives the outcome?".
  { id: "engagement.outcome", family: "engagement", role: "status", label: "Outcome / Response", patterns: [/^y$|target|outcome|response|result|converted|conversion|subscribed|accepted|approved|churn/i] },
  { id: "engagement.contact_channel", family: "engagement", role: "dimension", label: "Contact Channel", patterns: [/contact|channel|kênh liên hệ|kênh tiếp cận/i] },
  { id: "engagement.segment", family: "engagement", role: "dimension", label: "Customer / Audience Segment", patterns: [/job|marital|education|occupation|segment|persona|default|housing|loan|age group|nhóm khách|phân khúc/i] },
  { id: "engagement.campaign_attempts", family: "engagement", role: "measure", label: "Campaign Attempts", patterns: [/campaign|attempt|số lần gọi|lần liên hệ/i] },
  { id: "engagement.previous_contacts", family: "engagement", role: "measure", label: "Previous Contacts", patterns: [/previous|prior contact|liên hệ trước/i] },
  { id: "engagement.previous_outcome", family: "engagement", role: "status", label: "Previous Outcome", patterns: [/poutcome|previous outcome|past outcome|kết quả trước/i] },

  // Participation/event datasets cover sports rosters, attendance lists,
  // training sessions, operational event logs, and any table whose primary
  // question is "who/which group participated, in what role, and what happened?".
  { id: "event.activity", family: "event", role: "dimension", label: "Event / Activity", patterns: [/^event$|event type|activity|sự kiện|hoạt động/i] },
  { id: "event.lineup", family: "event", role: "dimension", label: "Line-up / Participation Type", patterns: [/line.?up|line-up|starter|substitute|đội hình/i] },

  // Generic indicator/benchmark columns cover wide public, KPI, survey, macro,
  // health, population, operations, and scientific datasets. These are numeric
  // measures but should generally be averaged or inspected, not summed as money.
  { id: "indicator.metric", family: "indicator", role: "measure", label: "Indicator / Metric", patterns: [/^[a-z][^:]{1,48}:\s*.+/i, /per 100|per 1,000|% of|% gdp|index|rate|ratio|life expectancy|population/i] }
];

function mergeUniversalRules(registryRules: SignalRule[], compatRules: SignalRule[]): {
  merged: SignalRule[];
  supplemental: SignalRule[];
} {
  const byId = new Map<string, SignalRule>();

  for (const rule of registryRules) {
    byId.set(rule.id, {
      ...rule,
      patterns: [...rule.patterns],
      registryCanonicalIds: [...(rule.registryCanonicalIds ?? [])]
    });
  }

  const supplemental: SignalRule[] = [];
  for (const rule of compatRules) {
    const existing = byId.get(rule.id);
    if (existing) {
      existing.patterns.push(...rule.patterns);
      if (rule.defaultUsable === false) existing.defaultUsable = false;
      continue;
    }

    const supplementalRule = {
      ...rule,
      patterns: [...rule.patterns],
      source: "core_supplemental" as const
    };
    supplemental.push(supplementalRule);
    byId.set(supplementalRule.id, supplementalRule);
  }

  return {
    merged: [...byId.values()],
    supplemental
  };
}

export const REGISTRY_BACKED_UNIVERSAL_SIGNAL_RULES = makeRegistryBackedRules();
const MERGED_UNIVERSAL_SIGNAL_RULES = mergeUniversalRules(
  REGISTRY_BACKED_UNIVERSAL_SIGNAL_RULES,
  CORE_COMPAT_SIGNAL_RULES
);

export const CORE_SUPPLEMENTAL_SIGNAL_RULES = MERGED_UNIVERSAL_SIGNAL_RULES.supplemental;
export const UNIVERSAL_SIGNAL_RULES = MERGED_UNIVERSAL_SIGNAL_RULES.merged;
