import type { BusinessSignal, DatasetProfile } from "./contracts";
import { inferContextSemanticCandidates } from "../context-semantic-dictionary";
import {
  SEMANTIC_SIGNAL_BY_ID,
  SEMANTIC_SIGNAL_REGISTRY_V1,
  type SemanticSignalDefinition
} from "../semantic-registry";

// ---------------------------------------------------------------------------
// Signal rules
// ---------------------------------------------------------------------------

export type SignalRule = {
  canonicalId: string;
  label: string;
  domain: BusinessSignal["domain"];
  role: BusinessSignal["role"];
  patterns: RegExp[];
  /** If true, this field is inherently an identifier (high-cardinality OK). */
  isIdentifier?: boolean;
  source?: "semantic_registry" | "next_supplemental";
  registryCanonicalIds?: string[];
};

/**
 * Rule-based signal detection.
 *
 * Rules MUST be generic semantic patterns, NOT sample file names.
 * Evidence is attached from column profiles and value distributions.
 */
const COMPAT_SIGNAL_RULES: SignalRule[] = [
  // Time
  {
    canonicalId: "date",
    label: "Date / Time",
    domain: "operations",
    role: "time",
    patterns: [/ngày|date|time|thời gian|tg_/i]
  },

  // Revenue / Money
  {
    canonicalId: "revenue",
    label: "Revenue",
    domain: "revenue",
    role: "measure",
    patterns: [/doanh thu|tổng tiền|tiền phải thu|sales|revenue|amount|thành tiền/i]
  },
  {
    canonicalId: "receivable",
    label: "Receivable",
    domain: "revenue",
    role: "measure",
    patterns: [/tiền phải thu|phải thu|receivable|amount due|\bar[_\s-]?debit\b|accounts?.?receivable/i]
  },
  {
    canonicalId: "invoice_total",
    label: "Invoice Total",
    domain: "finance",
    role: "measure",
    patterns: [/invoice.?total|gross.?invoice|tổng hóa đơn|tong hoa don|tổng thanh toán|tong thanh toan/i]
  },
  {
    canonicalId: "gross_profit",
    label: "Gross Profit",
    domain: "finance",
    role: "measure",
    patterns: [/gross.?profit|lợi nhuận gộp|loi nhuan gop|profit/i]
  },
  {
    canonicalId: "margin_pct",
    label: "Margin %",
    domain: "finance",
    role: "measure",
    patterns: [/margin.?pct|margin.?percent|gross.?margin|biên lợi nhuận|bien loi nhuan|margin/i]
  },
  {
    canonicalId: "total_cost",
    label: "Total Cost",
    domain: "finance",
    role: "measure",
    patterns: [/total.?cost|unit.?cost|cost|giá vốn|gia von|cogs/i]
  },
  {
    canonicalId: "quantity",
    label: "Quantity",
    domain: "revenue",
    role: "measure",
    patterns: [/số lượng|quantity|qty/i]
  },
  {
    canonicalId: "payment_cash",
    label: "Cash Payment",
    domain: "revenue",
    role: "measure",
    patterns: [/tiền mặt|cash/i]
  },
  {
    canonicalId: "payment_card",
    label: "Card Payment",
    domain: "revenue",
    role: "measure",
    patterns: [/cà thẻ|card/i]
  },
  {
    canonicalId: "payment_voucher",
    label: "Voucher Payment",
    domain: "revenue",
    role: "measure",
    patterns: [/pmh|phiếu mua hàng|voucher|gift/i]
  },
  {
    canonicalId: "payment_bank",
    label: "Bank Transfer Payment",
    domain: "revenue",
    role: "measure",
    patterns: [/ngân hàng|bank|transfer|chuyển khoản/i]
  },
  {
    canonicalId: "payment_method",
    label: "Payment Method",
    domain: "revenue",
    role: "dimension",
    patterns: [/phương thức thanh toán|hình thức thanh toán|payment method|payment/i]
  },
  {
    canonicalId: "change_amount",
    label: "Change Amount",
    domain: "revenue",
    role: "measure",
    patterns: [/tiền thối|thối lại|change/i]
  },
  {
    canonicalId: "rounding_amount",
    label: "Rounding Amount",
    domain: "revenue",
    role: "measure",
    patterns: [/làm tròn|rounding|round/i]
  },
  {
    canonicalId: "delivery_fee",
    label: "Delivery Fee",
    domain: "operations",
    role: "measure",
    patterns: [/phí giao|phi giao|giao hàng|delivery.?fee|shipping.?fee|freight.?fee|phí vận chuyển|phi van chuyen/i]
  },

  // Store / Branch
  {
    canonicalId: "branch",
    label: "Branch / Store",
    domain: "revenue",
    role: "dimension",
    patterns: [/tên kho|mã kho|branch|store|bưu cục|warehouse/i]
  },

  // Customer
  {
    canonicalId: "customer",
    label: "Customer",
    domain: "customer",
    role: "dimension",
    patterns: [/khách hàng|cust\.?\s*name|customer/i]
  },

  // Employee
  {
    canonicalId: "employee",
    label: "Employee / User",
    domain: "performance",
    role: "dimension",
    patterns: [/nhân viên|user|emp/i]
  },
  {
    canonicalId: "document_type",
    label: "Document Type",
    domain: "revenue",
    role: "dimension",
    patterns: [/loại phiếu|loại chứng từ|document type|doc type/i]
  },
  {
    canonicalId: "related_document",
    label: "Related Document",
    domain: "revenue",
    role: "dimension",
    patterns: [/chứng từ liên quan|related document|reference document|ref doc/i]
  },

  // Logistics operations
  {
    canonicalId: "route",
    label: "Route",
    domain: "operations",
    role: "dimension",
    patterns: [/tuyến xe|route|hanh_trinh/i]
  },
  {
    canonicalId: "trip",
    label: "Trip",
    domain: "operations",
    role: "dimension",
    patterns: [/chuyến xe|ma_tai|mã tải|trip/i]
  },
  {
    canonicalId: "vehicle",
    label: "Vehicle",
    domain: "operations",
    role: "dimension",
    patterns: [/biển kiểm soát|license|vehicle|xe đến/i]
  },
  {
    canonicalId: "driver",
    label: "Driver",
    domain: "operations",
    role: "dimension",
    patterns: [/lái xe|driver/i]
  },
  {
    canonicalId: "carrier",
    label: "Carrier / Logistics Provider",
    domain: "operations",
    role: "dimension",
    patterns: [/carrier|courier|shipper|đơn vị vận chuyển|don vi van chuyen|nhà vận chuyển|nha van chuyen|transport.?provider/i]
  },
  {
    canonicalId: "delivery_status",
    label: "Delivery Status",
    domain: "operations",
    role: "status",
    patterns: [/delivery.?status|trạng thái giao|trang thai giao|fulfillment.?status|delivered.?status|shipment.?status/i]
  },
  {
    canonicalId: "waiting_time",
    label: "Waiting Time",
    domain: "operations",
    role: "measure",
    patterns: [/thời gian chờ|waiting|wait\s*time/i]
  },
  {
    canonicalId: "on_time_status",
    label: "On-time Status",
    domain: "operations",
    role: "status",
    patterns: [/đánh giá|đúng giờ|đúng hẹn|result|xuất đúng|on.?time|xe đến đúng/i]
  },
  {
    canonicalId: "weight",
    label: "Weight",
    domain: "operations",
    role: "measure",
    patterns: [/trọng lượng|weight|gam/i]
  },
  {
    canonicalId: "capacity",
    label: "Capacity",
    domain: "operations",
    role: "measure",
    patterns: [/trọng tải|capacity/i]
  },

  // Inventory
  {
    canonicalId: "shipment_id",
    label: "Shipment / Tracking ID",
    domain: "inventory",
    role: "identifier",
    patterns: [/mã phiếu gửi|ma phieu gui|tracking|waybill|shipment.?id|awb/i],
    isIdentifier: true
  },
  {
    canonicalId: "order_id",
    label: "Order ID",
    domain: "revenue",
    role: "identifier",
    patterns: [/order.?id|sales.?order|so.?no|đơn hàng|don hang|mã đơn|ma don/i],
    isIdentifier: true
  },
  {
    canonicalId: "sku",
    label: "SKU / Product Code",
    domain: "inventory",
    role: "identifier",
    patterns: [/\bsku\b|\bplu\b|mã hàng|product.?code|barcode/i],
    isIdentifier: true
  },
  {
    canonicalId: "stock_age",
    label: "Stock Age",
    domain: "inventory",
    role: "measure",
    patterns: [/thời gian tồn|stock.?age|aging|tồn kho/i]
  },
  {
    canonicalId: "stock_threshold",
    label: "Stock Age Threshold",
    domain: "inventory",
    role: "dimension",
    patterns: [/ngưỡng tồn|nguong ton|aging.?bucket|age.?bucket|stock.?bucket/i]
  },
  {
    canonicalId: "stock_status",
    label: "Stock Status",
    domain: "inventory",
    role: "status",
    patterns: [/ngưỡng tồn|trạng thái|status|tình trạng/i]
  },
  {
    canonicalId: "current_location",
    label: "Current Location",
    domain: "inventory",
    role: "dimension",
    patterns: [/bưu cục hiện tại|buu cuc hien tai|chi nhánh hiện tại|chi nhanh hien tai|current.+(hub|branch|warehouse|location)|current location/i]
  },
  {
    canonicalId: "origin_location",
    label: "Origin Location",
    domain: "inventory",
    role: "dimension",
    patterns: [/bưu cục nhập|buu cuc nhap|bưu cục phát|buu cuc phat|origin|source.+(hub|branch|warehouse)/i]
  },
  {
    canonicalId: "destination_location",
    label: "Destination Location",
    domain: "inventory",
    role: "dimension",
    patterns: [/điểm đến|diem den|bưu cục phát|buu cuc phat|chi nhánh nhận|chi nhanh nhan|destination|dest/i]
  },
  {
    canonicalId: "cod_amount",
    label: "COD / Receivable Value",
    domain: "inventory",
    role: "measure",
    patterns: [/tiền thu hộ|tien thu ho|\bcod\b|cash.?on.?delivery|receivable/i]
  },
  {
    canonicalId: "freight_fee",
    label: "Freight Fee",
    domain: "inventory",
    role: "measure",
    patterns: [/tổng cước|tong cuoc|cước|cuoc|freight|shipping.?fee/i]
  },
  {
    canonicalId: "declared_value",
    label: "Declared Value",
    domain: "inventory",
    role: "measure",
    patterns: [/khai giá|khai gia|declared.?value|insured.?value/i]
  },
  {
    canonicalId: "service_group",
    label: "Service Group",
    domain: "inventory",
    role: "dimension",
    patterns: [/nhóm dịch vụ|nhom dich vu|mã dịch vụ|ma dich vu|service.?group|service.?code/i]
  },
  {
    canonicalId: "item_type",
    label: "Item Type / Content",
    domain: "inventory",
    role: "dimension",
    patterns: [/loại hàng|loai hang|nội dung hàng|noi dung hang|item.?type|item.?content|goods.?type/i]
  },
  {
    canonicalId: "load_status",
    label: "Load Status",
    domain: "inventory",
    role: "status",
    patterns: [/tình trạng tải|tinh trang tai|load.?status/i]
  },

  // Performance / ranking
  {
    canonicalId: "kpi",
    label: "KPI / Rank",
    domain: "performance",
    role: "measure",
    patterns: [/\bkpi\b|xếp hạng|rank|target|achievement/i]
  },

  // Dirty / operational row type
  // Pattern matches: MET.ID, MET. ID, MET.\nID (after normalization), LOAI, TYPE, LOAI, etc.
  // Value-based row_type detection (MOTO/PAY/PAY+) is handled in the detector loop.
  {
    canonicalId: "row_type",
    label: "Row Type",
    domain: "operations",
    role: "dimension",
    patterns: [/met\.?\s*id|loại|type|loai/i]
  }
];

/**
 * Low-cardinality operational code values that strongly suggest a column is a row_type.
 * If a column has ≤ 10 distinct values AND its top values match these patterns,
 * it is classified as row_type even if the column name does not match.
 */
const ROW_TYPE_VALUE_PATTERNS = [
  /^MOTO$/i,
  /^PAY\+?$/i,
  /^PAY$/i,
  // Add other known operational code patterns here (generic, not sample-specific):
  /^(CASH|CREDIT|DEBIT|COD|PREPAID|RETURN|EXCHANGE)$/i
];

const CONTEXT_CANONICAL_TO_NEXT: Record<string, string> = {
  report_date: "date",
  pickup_date: "date",
  delivery_date: "date",
  actual_time: "date",
  close_date: "date",
  hire_date: "date",
  termination_date: "date",
  renewal_date: "date",
  effective_date: "date",
  expiration_date: "date",
  time_period: "date",
  order: "order_id",
  shipment: "shipment_id",
  stock_qty: "quantity",
  margin: "margin_pct",
  cost: "total_cost",
  profit: "gross_profit",
  fee: "delivery_fee",
  toll_fee: "delivery_fee",
  freight_fee: "delivery_fee",
  sales: "revenue",
  net_revenue: "revenue",
  payable: "revenue",
  expense: "total_cost",
  purchase_cost: "total_cost",
  operational_cost: "total_cost",
  supplier_cost: "total_cost",
  gross_profit: "gross_profit",
  branch: "branch",
  warehouse: "branch",
  customer: "customer",
  account: "customer",
  contact: "customer",
  employee: "employee",
  owner: "employee",
  agent: "employee",
  salesperson: "salesperson",
  sku: "sku",
  product: "product",
  material: "product",
  delivery_status: "delivery_status",
  stock_status: "stock_status",
  current_location: "current_location",
  origin_location: "origin_location",
  destination_location: "destination_location"
};

export const NEXT_ONLY_SIGNAL_IDS = new Set([
  "payment_cash",
  "payment_card",
  "payment_voucher",
  "payment_bank",
  "change_amount",
  "rounding_amount",
  "waiting_time",
  "on_time_status",
  "capacity",
  "stock_threshold",
  "freight_fee",
  "service_group",
  "item_type",
  "load_status",
  "row_type"
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasesToPatterns(signal: SemanticSignalDefinition): RegExp[] {
  const aliases = [...new Set([
    ...signal.headerAliases,
    ...signal.aliases,
    ...signal.valueAliases.filter(alias => alias.length >= 3)
  ].map(alias => alias.trim()).filter(Boolean))];

  return aliases.map(alias => {
    const escaped = escapeRegExp(alias);
    if (/^[a-z0-9]+$/i.test(alias) && alias.length <= 4) {
      return new RegExp(`\\b${escaped}\\b`, "i");
    }
    return new RegExp(escaped, "i");
  });
}

function normalizeRegistryCanonical(canonicalId: string): string {
  return CONTEXT_CANONICAL_TO_NEXT[canonicalId] ?? canonicalId;
}

function toNextDomain(signal: SemanticSignalDefinition): BusinessSignal["domain"] {
  const supported = signal.domains.find(domain =>
    domain === "operations" ||
    domain === "revenue" ||
    domain === "inventory" ||
    domain === "customer" ||
    domain === "performance" ||
    domain === "finance"
  );
  return (supported ?? "operations") as BusinessSignal["domain"];
}

function toNextRole(signal: SemanticSignalDefinition): BusinessSignal["role"] {
  if (signal.role === "identifier") return "identifier";
  if (signal.role === "status") return "status";
  if (signal.role === "time") return "time";
  if (signal.role === "measure") return "measure";
  return "dimension";
}

function makeRegistryBackedNextRules(): SignalRule[] {
  const byId = new Map<string, SignalRule>();
  for (const signal of SEMANTIC_SIGNAL_REGISTRY_V1) {
    const canonicalId = normalizeRegistryCanonical(signal.canonicalId);
    const patterns = aliasesToPatterns(signal);
    if (!patterns.length) continue;

    const existing = byId.get(canonicalId);
    if (existing) {
      existing.patterns.push(...patterns);
      existing.registryCanonicalIds?.push(signal.canonicalId);
      continue;
    }

    byId.set(canonicalId, {
      canonicalId,
      label: signal.label,
      domain: toNextDomain(signal),
      role: toNextRole(signal),
      patterns,
      isIdentifier: signal.role === "identifier",
      source: "semantic_registry",
      registryCanonicalIds: [signal.canonicalId]
    });
  }
  return [...byId.values()];
}

function mergeSignalRules(registryRules: SignalRule[], compatRules: SignalRule[]): {
  merged: SignalRule[];
  supplemental: SignalRule[];
} {
  const byId = new Map<string, SignalRule>();
  for (const rule of registryRules) {
    byId.set(rule.canonicalId, {
      ...rule,
      patterns: [...rule.patterns],
      registryCanonicalIds: [...(rule.registryCanonicalIds ?? [])]
    });
  }

  const supplemental: SignalRule[] = [];
  for (const rule of compatRules) {
    const existing = byId.get(rule.canonicalId);
    if (existing) {
      existing.patterns.push(...rule.patterns);
      existing.isIdentifier = existing.isIdentifier || rule.isIdentifier;
      continue;
    }

    const supplementalRule = {
      ...rule,
      patterns: [...rule.patterns],
      source: "next_supplemental" as const
    };
    supplemental.push(supplementalRule);
    byId.set(supplementalRule.canonicalId, supplementalRule);
  }

  return {
    merged: [...byId.values()],
    supplemental
  };
}

export const REGISTRY_BACKED_NEXT_SIGNAL_RULES = makeRegistryBackedNextRules();
const MERGED_NEXT_SIGNAL_RULES = mergeSignalRules(REGISTRY_BACKED_NEXT_SIGNAL_RULES, COMPAT_SIGNAL_RULES);
export const NEXT_SUPPLEMENTAL_SIGNAL_RULES = MERGED_NEXT_SIGNAL_RULES.supplemental;
const SIGNAL_RULES = MERGED_NEXT_SIGNAL_RULES.merged;

function normalizeContextCanonical(canonicalId: string): string {
  return CONTEXT_CANONICAL_TO_NEXT[canonicalId] ?? canonicalId;
}

function signalDomain(canonicalId: string, fallback: BusinessSignal["domain"]): BusinessSignal["domain"] {
  const definition = SEMANTIC_SIGNAL_BY_ID.get(canonicalId) ?? SEMANTIC_SIGNAL_BY_ID.get(
    Object.entries(CONTEXT_CANONICAL_TO_NEXT).find(([, nextId]) => nextId === canonicalId)?.[0] ?? canonicalId
  );
  const domain = definition?.domain ?? fallback;
  if (domain === "operations" || domain === "revenue" || domain === "inventory" || domain === "customer" || domain === "performance" || domain === "finance") {
    return domain;
  }
  return fallback;
}

function signalLabel(canonicalId: string, fallback: string): string {
  const definition = SEMANTIC_SIGNAL_BY_ID.get(canonicalId) ?? SEMANTIC_SIGNAL_BY_ID.get(
    Object.entries(CONTEXT_CANONICAL_TO_NEXT).find(([, nextId]) => nextId === canonicalId)?.[0] ?? canonicalId
  );
  return definition?.label ?? fallback;
}

function toContextType(type: BusinessSignal["role"] | DatasetProfile["columns"][number]["health"]["inferredType"]): string {
  return type === "mixed" ? "string" : type;
}

function columnSampleValues(column: DatasetProfile["columns"][number]): string[] {
  return column.health.topValues.flatMap(item => Array.from({ length: Math.min(item.count, 20) }, () => item.value));
}

function dedupeSignals(signals: BusinessSignal[]): BusinessSignal[] {
  const byColumnAndSignal = new Map<string, BusinessSignal>();
  for (const signal of signals) {
    const key = `${signal.canonicalId}::${signal.physicalColumn}`;
    const existing = byColumnAndSignal.get(key);
    if (!existing || signal.confidence > existing.confidence) {
      byColumnAndSignal.set(key, signal);
    }
  }
  return [...byColumnAndSignal.values()].sort((left, right) => right.confidence - left.confidence);
}

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

export function detectBusinessSignals(profile: DatasetProfile): BusinessSignal[] {
  const signals: BusinessSignal[] = [];
  const sampleRows = profile.source.sampleRowCount;
  // Track which columns already got a row_type signal to avoid duplicates
  const rowTypeColumnsEmitted = new Set<string>();

  for (const column of profile.columns) {
    for (const rule of SIGNAL_RULES) {
      const matchesName = rule.patterns.some(
        p => p.test(column.name) || p.test(column.normalizedName)
      );
      if (!matchesName) continue;

      const { health } = column;
      const dominanceRatio = health.dominanceRatio;

      // Technical column → zero confidence, role override
      const isTechnical = profile.quality.dirtySignals.some(
        s => s.kind === "technical_column" && s.column === column.name
      );
      if (isTechnical) {
        signals.push({
          canonicalId: rule.canonicalId,
          label: rule.label,
          domain: rule.domain,
          physicalColumn: column.name,
          confidence: 0,
          evidence: [`technical column: ${column.name}`],
          cardinality: health.distinctCount,
          dominanceRatio,
          role: "technical",
          usableForDefaultQuestion: false
        });
        continue;
      }

      // Compute confidence from evidence quality
      let confidence = 60;

      // Boost for non-empty data
      if (health.nonEmptyCount > 0) confidence += 10;

      // Boost for type alignment
      if (rule.role === "measure" && health.inferredType === "number") confidence += 15;
      if (rule.role === "time" && health.inferredType !== "empty") confidence += 10;
      if (rule.role === "status" && health.distinctCount <= 10) confidence += 10;
      if (rule.role === "dimension" && health.distinctCount > 1 && health.distinctCount < 100) confidence += 10;
      if (rule.role === "identifier") confidence += 5;

      // Penalty for dominated dimension
      const isDominated = dominanceRatio != null && dominanceRatio > 0.9;
      if (isDominated && rule.role === "dimension") confidence -= 20;

      // Penalty for formula errors in this column
      const hasFormulaError = profile.quality.dirtySignals.some(
        s => s.kind === "formula_error" && s.column === column.name
      );
      if (hasFormulaError) confidence -= 10;

      confidence = Math.max(0, Math.min(100, confidence));

      // usableForDefaultQuestion: not dominated, not identifier with huge cardinality, not formula error dominated
      const highCardinalityIdentifier =
        rule.isIdentifier || health.distinctCount > Math.max(50, sampleRows * 0.5);

      const usableForDefaultQuestion =
        !isDominated &&
        !highCardinalityIdentifier &&
        confidence > 30;

      const evidence = [
        `matched column "${column.name}"`,
        `distinct=${health.distinctCount}`,
        dominanceRatio != null ? `dominance=${dominanceRatio.toFixed(2)}` : "",
        `type=${health.inferredType}`,
        hasFormulaError ? "has_formula_errors" : ""
      ].filter(Boolean);

      signals.push({
        canonicalId: rule.canonicalId,
        label: rule.label,
        domain: rule.domain,
        physicalColumn: column.name,
        confidence,
        evidence,
        cardinality: health.distinctCount,
        dominanceRatio,
        role: rule.role,
        usableForDefaultQuestion
      });

      if (rule.canonicalId === "row_type") {
        rowTypeColumnsEmitted.add(column.name);
      }
    }

    // -----------------------------------------------------------------------
    // Value-based row_type detection (independent of column name).
    //
    // If a column has:
    //   - ≤ 10 distinct non-empty values, AND
    //   - its top values match operational code patterns (MOTO/PAY/PAY+ etc.), AND
    //   - it has not already been matched by a name rule as row_type
    //
    // Then classify it as row_type. This handles columns like "MET.\nID"
    // that contain business codes but have unusual abbreviated names.
    // -----------------------------------------------------------------------
    if (!rowTypeColumnsEmitted.has(column.name) && !profile.quality.dirtySignals.some(
      s => s.kind === "technical_column" && s.column === column.name
    )) {
      const { health } = column;
      if (
        health.distinctCount >= 2 &&
        health.distinctCount <= 10 &&
        health.nonEmptyCount > 0
      ) {
        const topVals = health.topValues.map(v => v.value);
        const hasRowTypeCodes = topVals.some(v =>
          ROW_TYPE_VALUE_PATTERNS.some(p => p.test(v))
        );
        if (hasRowTypeCodes) {
          signals.push({
            canonicalId: "row_type",
            label: "Row Type",
            domain: "operations",
            physicalColumn: column.name,
            confidence: 85,
            evidence: [
              `value-based row_type detection`,
              `top values: ${topVals.slice(0, 4).join(", ")}`,
              `distinct=${health.distinctCount}`
            ],
            cardinality: health.distinctCount,
            dominanceRatio: health.dominanceRatio,
            role: "dimension",
            usableForDefaultQuestion: true
          });
          rowTypeColumnsEmitted.add(column.name);
        }
      }
    }

    const contextCandidates = inferContextSemanticCandidates(
      {
        name: column.name,
        type: toContextType(column.health.inferredType),
        sampleValues: columnSampleValues(column),
        uniqueValuesCount: column.health.distinctCount,
        distinctRatio: sampleRows > 0 ? column.health.distinctCount / sampleRows : undefined
      },
      {
        siblingColumns: profile.columns
          .filter(sibling => sibling.name !== column.name)
          .map(sibling => ({
            name: sibling.name,
            type: toContextType(sibling.health.inferredType),
            sampleValues: columnSampleValues(sibling),
            uniqueValuesCount: sibling.health.distinctCount,
            distinctRatio: sampleRows > 0 ? sibling.health.distinctCount / sampleRows : undefined
          }))
      }
    );

    const isTechnicalColumn = profile.quality.dirtySignals.some(
      s => s.kind === "technical_column" && s.column === column.name
    );
    if (!isTechnicalColumn) {
      for (const candidate of contextCandidates.slice(0, 3)) {
        const canonicalId = normalizeContextCanonical(candidate.canonicalId);
        if (canonicalId === "status") continue;

        const role = candidate.role === "identifier"
          ? "identifier"
          : candidate.role === "status"
            ? "status"
            : candidate.role === "time"
              ? "time"
              : candidate.role === "measure"
                ? "measure"
                : "dimension";
        const highCardinalityIdentifier =
          role === "identifier" || column.health.distinctCount > Math.max(50, sampleRows * 0.5);
        const dominanceRatio = column.health.dominanceRatio;
        const isDominated = dominanceRatio != null && dominanceRatio > 0.9;

        signals.push({
          canonicalId,
          label: signalLabel(canonicalId, candidate.label),
          domain: signalDomain(canonicalId, candidate.primaryDomain as BusinessSignal["domain"]),
          physicalColumn: column.name,
          confidence: Math.max(45, Math.min(95, candidate.confidence)),
          evidence: [
            `context semantic match: ${candidate.canonicalId}`,
            ...candidate.reasons,
            `evidence=${candidate.evidenceTypes.join("+")}`
          ],
          cardinality: column.health.distinctCount,
          dominanceRatio,
          role,
          usableForDefaultQuestion: !isDominated && !highCardinalityIdentifier && candidate.confidence >= 45
        });
      }
    }
  }

  return dedupeSignals(signals);
}
