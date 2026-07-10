import { SEMANTIC_SIGNAL_BY_ID } from "../semantic-registry";
import type { BusinessSignal, DomainId } from "./contracts";

export type SemanticDomainAffinity = {
  domain: DomainId;
  score: number;
  matchedSignals: string[];
  matchedColumns: string[];
  reasons: string[];
};

const DOMAIN_IDS: DomainId[] = [
  "revenue",
  "finance",
  "operations",
  "inventory",
  "customer",
  "performance"
];

const DOMAIN_WEIGHTS: Record<DomainId, number> = {
  revenue: 0,
  finance: 0,
  operations: 0,
  inventory: 0,
  customer: 0,
  performance: 0
};

type AffinityAccumulator = {
  score: number;
  signals: Set<string>;
  columns: Set<string>;
  reasons: string[];
};

function makeAccumulator(): Record<DomainId, AffinityAccumulator> {
  return {
    revenue: { score: 0, signals: new Set<string>(), columns: new Set<string>(), reasons: [] },
    finance: { score: 0, signals: new Set<string>(), columns: new Set<string>(), reasons: [] },
    operations: { score: 0, signals: new Set<string>(), columns: new Set<string>(), reasons: [] },
    inventory: { score: 0, signals: new Set<string>(), columns: new Set<string>(), reasons: [] },
    customer: { score: 0, signals: new Set<string>(), columns: new Set<string>(), reasons: [] },
    performance: { score: 0, signals: new Set<string>(), columns: new Set<string>(), reasons: [] }
  };
}

function has(signals: Set<string>, ids: string[]): boolean {
  return ids.some(id => signals.has(id));
}

function add(
  affinities: Record<DomainId, AffinityAccumulator>,
  domain: DomainId,
  points: number,
  matchedSignals: string[],
  columnsBySignal: Map<string, string[]>,
  reason: string
): void {
  const bucket = affinities[domain];
  bucket.score += points;
  for (const signal of matchedSignals) {
    bucket.signals.add(signal);
    for (const column of columnsBySignal.get(signal) ?? []) bucket.columns.add(column);
  }
  bucket.reasons.push(reason);
}

export function inferSemanticDomainAffinities(signals: BusinessSignal[]): SemanticDomainAffinity[] {
  const usableSignals = signals.filter(signal => signal.role !== "technical" && signal.confidence >= 45);
  const signalIds = new Set(usableSignals.map(signal => signal.canonicalId));
  const columnsBySignal = new Map<string, string[]>();
  for (const signal of usableSignals) {
    const columns = columnsBySignal.get(signal.canonicalId) ?? [];
    if (!columns.includes(signal.physicalColumn)) columns.push(signal.physicalColumn);
    columnsBySignal.set(signal.canonicalId, columns);
  }

  const affinities = makeAccumulator();

  for (const signal of usableSignals) {
    const definition = SEMANTIC_SIGNAL_BY_ID.get(signal.canonicalId);
    const declaredDomains = (definition?.domains ?? [signal.domain])
      .filter((domain): domain is DomainId => DOMAIN_IDS.includes(domain as DomainId));
    const weightedDomains = declaredDomains.length > 0 ? declaredDomains : [signal.domain];
    for (const domain of weightedDomains) {
      const directWeight = domain === signal.domain ? 11 : 7;
      const familyBoost =
        definition?.semanticFamily === "money" && (domain === "finance" || domain === "revenue") ? 4 :
        definition?.semanticFamily === "document" ? 2 :
        definition?.semanticFamily === "status" && domain === "operations" ? 3 :
        0;
      add(
        affinities,
        domain,
        directWeight + familyBoost,
        [signal.canonicalId],
        columnsBySignal,
        `${signal.canonicalId} supports ${domain}.`
      );
    }
  }

  if (has(signalIds, ["order", "sales_order", "order_id"]) && has(signalIds, ["shipment", "shipment_id", "trip", "route", "driver", "vehicle"])) {
    add(affinities, "operations", 24, ["order", "sales_order", "order_id", "shipment", "shipment_id", "trip", "route", "driver", "vehicle"], columnsBySignal, "Order evidence is linked with shipment/route/vehicle evidence.");
    add(affinities, "revenue", 12, ["order", "sales_order", "order_id", "shipment", "shipment_id"], columnsBySignal, "Orders connect commercial and fulfillment flow.");
  }

  if (has(signalIds, ["revenue", "net_revenue", "invoice_total", "receivable"]) && has(signalIds, ["cost", "total_cost", "gross_profit", "profit", "margin_pct", "margin"])) {
    add(affinities, "finance", 30, ["revenue", "net_revenue", "invoice_total", "receivable", "cost", "total_cost", "gross_profit", "profit", "margin_pct", "margin"], columnsBySignal, "Money-in and cost/profit evidence form finance analysis context.");
    add(affinities, "revenue", 12, ["revenue", "net_revenue", "invoice_total", "gross_profit"], columnsBySignal, "Profit and revenue belong to commercial performance.");
  }

  if (has(signalIds, ["product", "sku", "barcode", "category"]) && has(signalIds, ["quantity", "stock_qty", "inventory", "warehouse", "bin_location"])) {
    add(affinities, "inventory", 28, ["product", "sku", "barcode", "category", "quantity", "stock_qty", "inventory", "warehouse", "bin_location"], columnsBySignal, "Item identity plus quantity/location evidence forms inventory context.");
  }

  if (has(signalIds, ["product", "sku", "category"]) && has(signalIds, ["revenue", "net_revenue", "unit_price", "invoice_total"])) {
    add(affinities, "revenue", 24, ["product", "sku", "category", "revenue", "net_revenue", "unit_price", "invoice_total"], columnsBySignal, "Products tied to money form sales/product-performance context.");
    add(affinities, "inventory", 10, ["product", "sku", "category"], columnsBySignal, "Product fields are also inventory master evidence.");
  }

  if (has(signalIds, ["delivery_fee", "transportation_cost", "fuel_cost", "toll_fee", "carrier"]) && has(signalIds, ["revenue", "gross_profit", "profit", "margin_pct", "total_cost"])) {
    add(affinities, "operations", 20, ["delivery_fee", "transportation_cost", "fuel_cost", "toll_fee", "carrier"], columnsBySignal, "Freight/carrier cost evidence belongs to logistics execution.");
    add(affinities, "finance", 18, ["delivery_fee", "transportation_cost", "fuel_cost", "toll_fee", "revenue", "gross_profit", "profit", "margin_pct", "total_cost"], columnsBySignal, "Logistics cost can affect margin and profit.");
  }

  if (has(signalIds, ["salesperson", "employee", "agent", "driver"]) && has(signalIds, ["target", "actual", "achievement", "kpi", "revenue", "delivery_status", "on_time_rate"])) {
    add(affinities, "performance", 22, ["salesperson", "employee", "agent", "driver", "target", "actual", "achievement", "kpi", "revenue", "delivery_status", "on_time_rate"], columnsBySignal, "People/owner fields are tied to measurable outcomes.");
  }

  if (has(signalIds, ["customer", "lead", "opportunity", "ticket"]) && has(signalIds, ["revenue", "receivable", "payment_method", "delivery_status", "satisfaction", "retention"])) {
    add(affinities, "customer", 24, ["customer", "lead", "opportunity", "ticket", "revenue", "receivable", "payment_method", "delivery_status", "satisfaction", "retention"], columnsBySignal, "Customer identity is tied to commercial/service outcomes.");
  }

  if (has(signalIds, ["request_id", "endpoint", "service_name", "environment"]) && has(signalIds, ["http_status", "latency_ms", "error_code", "ticket", "priority"])) {
    add(affinities, "operations", 22, ["request_id", "endpoint", "service_name", "environment", "http_status", "latency_ms", "error_code"], columnsBySignal, "System request evidence is tied to operational reliability.");
    add(affinities, "performance", 16, ["http_status", "latency_ms", "error_code", "priority"], columnsBySignal, "Latency/status/error evidence forms performance context.");
  }

  if (has(signalIds, ["user_login", "session_id", "ip_address"]) && has(signalIds, ["audit_action", "resource_name", "permission_role", "mfa_status"])) {
    add(affinities, "operations", 18, ["user_login", "session_id", "ip_address", "audit_action", "resource_name", "permission_role", "mfa_status"], columnsBySignal, "User/session/action evidence forms operational access context.");
    add(affinities, "performance", 12, ["audit_action", "permission_role", "mfa_status"], columnsBySignal, "Access-control status can support control-performance review.");
  }

  if (has(signalIds, ["subscription", "plan_name", "account", "customer"]) && has(signalIds, ["mrr", "arr", "renewal_date", "usage_units", "churn"])) {
    add(affinities, "customer", 24, ["subscription", "plan_name", "account", "customer", "renewal_date", "usage_units", "churn"], columnsBySignal, "Subscription/customer identity is tied to renewal, usage, or churn.");
    add(affinities, "revenue", 20, ["subscription", "plan_name", "mrr", "arr", "renewal_date"], columnsBySignal, "Recurring revenue evidence forms subscription revenue context.");
    add(affinities, "performance", 10, ["usage_units", "churn"], columnsBySignal, "Usage/churn evidence supports performance review.");
  }

  if (has(signalIds, ["contract_id", "counterparty", "project"]) && has(signalIds, ["contract_value", "effective_date", "expiration_date", "revenue", "payable"])) {
    add(affinities, "finance", 22, ["contract_id", "counterparty", "contract_value", "effective_date", "expiration_date", "revenue", "payable"], columnsBySignal, "Contract identity and value/date evidence form finance context.");
    add(affinities, "performance", 10, ["contract_id", "project", "effective_date", "expiration_date"], columnsBySignal, "Contract/project dates support lifecycle performance review.");
  }

  if (has(signalIds, ["property", "unit", "lease"]) && has(signalIds, ["rent_amount", "occupancy_status", "customer", "receivable"])) {
    add(affinities, "operations", 18, ["property", "unit", "lease", "occupancy_status"], columnsBySignal, "Property/unit/occupancy evidence forms property operations context.");
    add(affinities, "finance", 18, ["lease", "rent_amount", "receivable"], columnsBySignal, "Lease and rent evidence forms property finance context.");
  }

  if (has(signalIds, ["milestone", "subcontractor", "change_order", "project"]) && has(signalIds, ["progress_pct", "cost", "budget", "purchase_order"])) {
    add(affinities, "operations", 18, ["milestone", "subcontractor", "change_order", "project", "progress_pct"], columnsBySignal, "Project execution fields tie progress to operational delivery.");
    add(affinities, "finance", 14, ["change_order", "cost", "budget", "purchase_order"], columnsBySignal, "Change orders and cost/budget evidence affect finance.");
    add(affinities, "performance", 14, ["milestone", "progress_pct", "budget"], columnsBySignal, "Milestones and progress support performance tracking.");
  }

  if (has(signalIds, ["field", "crop"]) && has(signalIds, ["harvest_qty", "irrigation", "inventory", "quantity", "revenue"])) {
    add(affinities, "inventory", 18, ["field", "crop", "harvest_qty", "quantity", "inventory"], columnsBySignal, "Crop/field quantity evidence forms inventory context.");
    add(affinities, "operations", 14, ["field", "crop", "irrigation"], columnsBySignal, "Field and irrigation evidence forms agricultural operations context.");
    add(affinities, "revenue", 10, ["crop", "harvest_qty", "revenue"], columnsBySignal, "Harvest quantity can connect to crop revenue.");
  }

  if (has(signalIds, ["meter_id", "tariff", "customer"]) && has(signalIds, ["consumption", "invoice_total", "revenue", "outage"])) {
    add(affinities, "operations", 18, ["meter_id", "consumption", "outage"], columnsBySignal, "Meter/consumption/outage evidence forms utility operations context.");
    add(affinities, "finance", 14, ["tariff", "consumption", "invoice_total", "revenue"], columnsBySignal, "Consumption and tariff evidence can drive billing finance.");
    add(affinities, "customer", 10, ["meter_id", "customer", "outage"], columnsBySignal, "Utility service evidence links to customer impact.");
  }

  if (has(signalIds, ["control_id", "audit_finding", "policy"]) && has(signalIds, ["remediation_status", "priority", "department", "owner"])) {
    add(affinities, "performance", 22, ["control_id", "audit_finding", "policy", "remediation_status", "priority", "department", "owner"], columnsBySignal, "Control/finding/remediation evidence forms risk-control performance context.");
    add(affinities, "operations", 10, ["control_id", "audit_finding", "remediation_status"], columnsBySignal, "Control remediation can affect operational execution.");
  }

  if (has(signalIds, ["donor", "grant", "campaign"]) && has(signalIds, ["donation_amount", "pledge", "revenue"])) {
    add(affinities, "customer", 16, ["donor", "grant", "campaign"], columnsBySignal, "Donor/grant/campaign evidence forms stakeholder context.");
    add(affinities, "finance", 18, ["donation_amount", "pledge", "grant"], columnsBySignal, "Donation and pledge amounts form funding finance context.");
    add(affinities, "revenue", 10, ["donation_amount", "pledge", "revenue"], columnsBySignal, "Funding amounts behave like revenue inflow.");
  }

  if (has(signalIds, ["inspection_lot", "defect_code", "qc_result"]) && has(signalIds, ["rework_qty", "scrap_qty", "yield_rate", "product", "work_order"])) {
    add(affinities, "operations", 20, ["inspection_lot", "defect_code", "qc_result", "rework_qty", "scrap_qty", "work_order"], columnsBySignal, "Quality inspection and rework evidence forms operations context.");
    add(affinities, "performance", 18, ["qc_result", "defect_code", "rework_qty", "yield_rate"], columnsBySignal, "QC result, defects, and yield support quality performance review.");
    add(affinities, "inventory", 10, ["inspection_lot", "product", "work_order"], columnsBySignal, "Inspection lots can tie quality back to items.");
  }

  return DOMAIN_IDS
    .map(domain => {
      const bucket = affinities[domain];
      return {
        domain,
        score: Math.min(100, Math.max(DOMAIN_WEIGHTS[domain], Math.round(bucket.score))),
        matchedSignals: [...bucket.signals],
        matchedColumns: [...bucket.columns],
        reasons: bucket.reasons
      };
    })
    .filter(affinity => affinity.score >= 25)
    .sort((left, right) => right.score - left.score);
}
