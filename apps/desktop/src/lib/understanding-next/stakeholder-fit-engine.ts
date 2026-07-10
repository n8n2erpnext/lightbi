import type {
  BusinessSignal,
  BusinessStakeholderFit,
  DatasetProfile,
  DomainId
} from "./contracts";

type StakeholderDefinition = {
  id: string;
  label: string;
  domains: DomainId[];
  requiredAny: string[];
  supportingSignals: string[];
};

const STAKEHOLDER_DEFINITIONS: StakeholderDefinition[] = [
  {
    id: "executive",
    label: "Executive / CEO",
    domains: ["revenue", "finance", "operations", "inventory", "performance"],
    requiredAny: ["revenue", "net_revenue", "gross_profit", "profit", "margin_pct", "delivery_status", "on_time_status", "kpi"],
    supportingSignals: ["date", "time_period", "branch", "product", "category", "customer", "carrier", "delivery_fee", "receivable"]
  },
  {
    id: "sales",
    label: "Sales",
    domains: ["revenue", "customer", "performance"],
    requiredAny: ["revenue", "receivable", "invoice_total", "salesperson", "customer", "payment_method"],
    supportingSignals: ["date", "branch", "product", "category", "discount", "quantity", "margin_pct"]
  },
  {
    id: "finance_accounting",
    label: "Finance / Accounting",
    domains: ["finance", "revenue"],
    requiredAny: ["receivable", "invoice_total", "gross_profit", "profit", "margin_pct", "total_cost", "payment_method"],
    supportingSignals: ["revenue", "net_revenue", "date", "time_period", "customer", "branch", "delivery_fee"]
  },
  {
    id: "logistics_operations",
    label: "Logistics / Operations",
    domains: ["operations", "inventory"],
    requiredAny: ["delivery_status", "on_time_status", "route", "trip", "vehicle", "driver", "waiting_time", "carrier"],
    supportingSignals: ["shipment_id", "shipment", "delivery_fee", "quantity", "weight", "capacity", "current_location", "warehouse"]
  },
  {
    id: "warehouse_inventory",
    label: "Warehouse / Inventory",
    domains: ["inventory", "operations"],
    requiredAny: ["sku", "product", "inventory", "stock_qty", "stock_status", "stock_age", "warehouse"],
    supportingSignals: ["category", "supplier", "current_location", "quantity", "inbound", "outbound", "stock_movement"]
  },
  {
    id: "customer_success",
    label: "Customer / Service",
    domains: ["customer", "revenue", "operations"],
    requiredAny: ["customer", "segment", "retention", "satisfaction", "delivery_status"],
    supportingSignals: ["revenue", "receivable", "payment_method", "order_id", "date", "branch"]
  },
  {
    id: "performance_management",
    label: "Performance Management",
    domains: ["performance", "operations", "revenue"],
    requiredAny: ["kpi", "target", "actual", "achievement", "employee", "team", "department"],
    supportingSignals: ["revenue", "branch", "date", "on_time_status", "waiting_time"]
  }
];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function signalById(signals: BusinessSignal[]): Map<string, BusinessSignal[]> {
  const map = new Map<string, BusinessSignal[]>();
  for (const signal of signals) {
    const bucket = map.get(signal.canonicalId) ?? [];
    bucket.push(signal);
    map.set(signal.canonicalId, bucket);
  }
  return map;
}

export function generateStakeholderFits(
  profile: DatasetProfile,
  signals: BusinessSignal[]
): BusinessStakeholderFit[] {
  const signalsById = signalById(signals.filter(signal => signal.role !== "technical"));
  const detectedDomains = new Set(profile.profile.detectedDomains);

  return STAKEHOLDER_DEFINITIONS
    .map(definition => {
      const requiredMatches = definition.requiredAny.filter(id => signalsById.has(id));
      const supportingMatches = definition.supportingSignals.filter(id => signalsById.has(id));
      const domainMatches = definition.domains.filter(domain => detectedDomains.has(domain));
      const matchedSignals = unique([...requiredMatches, ...supportingMatches]);
      const matchedColumns = unique(
        matchedSignals.flatMap(id => signalsById.get(id)?.map(signal => signal.physicalColumn) ?? [])
      );

      if (requiredMatches.length === 0 && supportingMatches.length < 2) {
        return undefined;
      }

      const score = Math.min(
        100,
        Math.round(requiredMatches.length * 22 + supportingMatches.length * 7 + domainMatches.length * 8)
      );

      const reasons = [
        requiredMatches.length > 0
          ? `Core evidence: ${requiredMatches.join(", ")}.`
          : "",
        supportingMatches.length > 0
          ? `Supporting evidence: ${supportingMatches.slice(0, 6).join(", ")}.`
          : "",
        domainMatches.length > 0
          ? `Domain fit: ${domainMatches.join(", ")}.`
          : ""
      ].filter(Boolean);

      return {
        id: definition.id,
        label: definition.label,
        score,
        domains: definition.domains,
        matchedSignals,
        matchedColumns,
        reasons
      };
    })
    .filter((fit): fit is BusinessStakeholderFit => Boolean(fit))
    .sort((left, right) => right.score - left.score);
}
