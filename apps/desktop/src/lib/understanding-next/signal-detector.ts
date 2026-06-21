import type { BusinessSignal, DatasetProfile } from "./contracts";

// ---------------------------------------------------------------------------
// Signal rules
// ---------------------------------------------------------------------------

type SignalRule = {
  canonicalId: string;
  label: string;
  domain: BusinessSignal["domain"];
  role: BusinessSignal["role"];
  patterns: RegExp[];
  /** If true, this field is inherently an identifier (high-cardinality OK). */
  isIdentifier?: boolean;
};

/**
 * Rule-based signal detection.
 *
 * Rules MUST be generic semantic patterns, NOT sample file names.
 * Evidence is attached from column profiles and value distributions.
 */
const SIGNAL_RULES: SignalRule[] = [
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
    patterns: [/tiền phải thu|phải thu|receivable|amount due/i]
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
    domain: "revenue",
    role: "measure",
    patterns: [/phí giao|giao hàng|delivery fee|shipping/i]
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
  }

  return signals;
}
