import type { DatasetProfile, DirtySignal, UnderstandingInput } from "./contracts";

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/**
 * Patterns that STRONGLY suggest a column is a technical/system column by NAME alone.
 *
 * CRITICAL RULE: Do NOT add short abbreviation patterns like MET.ID here.
 * A column like "MET.ID" or "WHA.ID" may contain low-cardinality business values
 * (MOTO/PAY/BT/ATK). Always check value distribution before classifying technical.
 *
 * Only match columns that are UNAMBIGUOUSLY system columns by name:
 *   - __XXX__  (PowerApps double-underscore wrapper)
 *   - uuid / guid  (explicit identifier semantic in name)
 *   - sys_ prefix (system convention)
 *   - powerapps (explicit tool reference)
 */
const TECHNICAL_COLUMN_NAME_PATTERNS = [
  /^__.*__$/,          // __PowerAppsId__ (double-underscore wrapper)
  /^__empty/i,         // __EMPTY, __EMPTY_1, __EMPTY_2 (xlsx blank header columns)
  /powerapps/i,
  /\buuid\b/i,
  /\bguid\b/i,
  /^sys_/i,
  /^_row_/i
];

/**
 * UUID/hash value pattern — values that look like system-generated identifiers.
 * If >50% of non-empty values match this, the column is likely technical
 * regardless of name.
 */
const UUID_VALUE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_VALUE_PATTERN = /^[0-9a-f]{24,}$/i; // long hex strings (MongoDB ObjectId etc.)

/** Excel formula/export error strings. */
const FORMULA_ERROR_VALUES = new Set(["#REF!", "#VALUE!", "#DIV/0!", "#N/A", "#NAME?", "#NULL!", "#NUM!"]);

/** Minimum Excel serial date to be treated as a real date (1-Jan-2000 = 36526). */
const EXCEL_SERIAL_MIN = 36526;
/** Maximum Excel serial date (1-Jan-2040 = 51544). */
const EXCEL_SERIAL_MAX = 51544;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function normalizeColumnName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

function stringValue(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function getTopValues(values: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));
}

// ---------------------------------------------------------------------------
// Document type inference — evidence-scored, never filename-based
// ---------------------------------------------------------------------------

/**
 * Score each candidate document type and return the best match.
 *
 * Rules:
 * - Each rule tests normalised column text or dirty signals, never file names.
 * - A type wins if it accumulates enough evidence points.
 * - dirty_operational_export wins when ≥2 dirty signal kinds are present
 *   AND at least one operational column pattern is detected.
 */
function inferDocumentType(
  columns: string[],
  dirtySignals: DirtySignal[]
): DatasetProfile["profile"]["documentType"] {
  const text = columns.map(normalizeColumnName).join(" | ");

  // --- Dirty operational export detection -----------------------------------
  // Criteria (evidence-based, not filename):
  // 1. At least 2 dirty signal kinds of "warning" severity, OR
  // 2. Multiple dirty signal kinds AND operational-ish columns.
  const dirtyKinds = new Set(
    dirtySignals
      .filter(s => s.severity === "warning" || s.severity === "blocking")
      .map(s => s.kind)
  );

  const hasFormulaError = dirtyKinds.has("formula_error");
  const hasExcelSerial = dirtyKinds.has("excel_serial_date");
  const hasMoney = dirtyKinds.has("money_embedded_in_text");
  const hasTechnical = dirtySignals.some(s => s.kind === "technical_column");

  // Operational hint patterns (generic — not specific to any sample file)
  const hasOperationalColumns =
    /loại|type|emp|employee|area|zone|note|charge|order|cust|ord\./i.test(text) ||
    /met\.\s*id|ord\.\s*title|cust\.\s*name/i.test(text);

  const dirtySignalCount =
    (hasFormulaError ? 1 : 0) +
    (hasExcelSerial ? 1 : 0) +
    (hasMoney ? 1 : 0) +
    (hasTechnical ? 1 : 0);

  if (dirtySignalCount >= 2 && hasOperationalColumns) {
    return "dirty_operational_export";
  }
  // Even one strong dirty signal with enough operational columns can qualify
  if (dirtySignalCount >= 1 && hasFormulaError && hasOperationalColumns) {
    return "dirty_operational_export";
  }

  // --- Retail sales document -----------------------------------------------
  // Key evidence: date + store + money + optional employee or customer
  let retailScore = 0;
  if (/ngày xuất|ngày bán|invoice date/i.test(text)) retailScore += 3;
  if (/mã phiếu xuất|phiếu xuất|invoice/i.test(text)) retailScore += 2;
  if (/tiền phải thu|tổng tiền|doanh thu|sales amount|revenue/i.test(text)) retailScore += 3;
  if (/tên kho xuất|tên kho|mã kho|store|branch/i.test(text)) retailScore += 2;
  if (/khách hàng|customer/i.test(text)) retailScore += 1;
  if (/nhân viên|employee|staff/i.test(text)) retailScore += 1;
  if (/tiền mặt|cash|cà thẻ|card/i.test(text)) retailScore += 2;

  // --- Logistics intake report ----------------------------------------------
  let intakeScore = 0;
  if (/thời gian checkin|check.?in/i.test(text)) intakeScore += 3;
  if (/thời gian checkout|check.?out/i.test(text)) intakeScore += 3;
  if (/xe đến đúng hẹn|đúng hẹn|on.?time/i.test(text)) intakeScore += 3;
  if (/thời gian chờ|waiting|wait time/i.test(text)) intakeScore += 2;
  if (/chuyến xe|ma_tai|trip/i.test(text)) intakeScore += 2;
  if (/tuyến xe|route/i.test(text)) intakeScore += 2;
  if (/biển kiểm soát|license plate|vehicle/i.test(text)) intakeScore += 1;

  // --- Logistics export/SLA report -----------------------------------------
  let exportScore = 0;
  if (/tg_nhap|tg_xuat/i.test(text)) exportScore += 3;
  if (/deadline/i.test(text)) exportScore += 2;
  if (/xuất đúng|cldv/i.test(text)) exportScore += 3;
  if (/ma_tai|mã tải/i.test(text)) exportScore += 2;

  // --- Inventory snapshot ---------------------------------------------------
  let inventorySnapScore = 0;
  if (/thời gian tồn|tồn kho|stock age/i.test(text)) inventorySnapScore += 3;
  if (/ngưỡng tồn|ngưỡng/i.test(text)) inventorySnapScore += 2;
  if (/bưu cục hiện tại/i.test(text)) inventorySnapScore += 2;
  if (/tình trạng tải|tình trạng/i.test(text)) inventorySnapScore += 1;

  // --- Product master -------------------------------------------------------
  let productScore = 0;
  if (/\bplu\b/i.test(text)) productScore += 4;
  if (/\bbarcode\b/i.test(text)) productScore += 3;
  if (/mã hàng|sku/i.test(text)) productScore += 3;
  if (/tên hàng|product name/i.test(text)) productScore += 2;
  if (/nhóm hàng|category|group/i.test(text)) productScore += 1;
  if (/đơn vị tính|unit/i.test(text)) productScore += 1;
  if (/giá bán|price/i.test(text)) productScore += 1;

  // --- Management / ranking -------------------------------------------------
  let rankScore = 0;
  if (/xếp hạng|rank/i.test(text)) rankScore += 3;
  if (/\bkpi\b/i.test(text)) rankScore += 3;
  if (/target|achievement/i.test(text)) rankScore += 2;
  if (/quản lý|manager/i.test(text)) rankScore += 2;

  // Pick the highest-scoring candidate (must exceed a minimum threshold)
  const THRESHOLD = 4;
  const candidates: [DatasetProfile["profile"]["documentType"], number][] = [
    ["retail_sales_document", retailScore],
    ["logistics_intake_report", intakeScore],
    ["logistics_export_report", exportScore],
    ["inventory_snapshot", inventorySnapScore],
    ["product_master", productScore],
    ["management_ranking", rankScore]
  ];

  const best = candidates
    .filter(([, score]) => score >= THRESHOLD)
    .sort((a, b) => b[1] - a[1])[0];

  return best ? best[0] : "generic_table";
}

function inferDomains(
  documentType: DatasetProfile["profile"]["documentType"]
): DatasetProfile["profile"]["detectedDomains"] {
  switch (documentType) {
    case "retail_sales_document":
      return ["revenue", "customer"];
    case "logistics_intake_report":
    case "logistics_export_report":
      return ["operations"];
    case "inventory_snapshot":
      return ["inventory", "operations"];
    case "product_master":
      return ["inventory"];
    case "management_ranking":
      return ["performance"];
    case "dirty_operational_export":
      return ["operations", "revenue", "customer"];
    default:
      return [];
  }
}

function inferGrain(
  documentType: DatasetProfile["profile"]["documentType"]
): DatasetProfile["profile"]["grain"] {
  if (documentType === "product_master") return "master_data";
  if (documentType === "inventory_snapshot") return "snapshot";
  if (documentType === "management_ranking") return "summary";
  if (documentType === "generic_table") return "unknown";
  return "event";
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export function buildDatasetProfile(input: UnderstandingInput): DatasetProfile {
  const columns = input.columns
    .map(column => String(column ?? "").trim())
    .filter(Boolean);
  const rows = input.rows ?? [];
  const dirtySignals: DirtySignal[] = [];

  // --- Empty schema gate ----------------------------------------------------
  if (columns.length === 0) {
    dirtySignals.push({
      kind: "empty_schema",
      severity: "blocking",
      message: "No usable column headers were detected.",
      evidence: ["columns.length === 0"]
    });
  }

  // --- Duplicate headers ----------------------------------------------------
  const duplicateHeaders = columns.filter(
    (column, index) => columns.indexOf(column) !== index
  );
  if (duplicateHeaders.length > 0) {
    dirtySignals.push({
      kind: "blank_or_duplicate_header",
      severity: "warning",
      message: "Duplicate headers were detected.",
      evidence: duplicateHeaders
    });
  }

  // --- Per-column profiling -------------------------------------------------
  const profiledColumns = columns.map(column => {
    const values = rows.map(row => stringValue(row[column]));
    const nonEmptyValues = values.filter(Boolean);
    const topValues = getTopValues(nonEmptyValues);
    const distinctCount = new Set(nonEmptyValues).size;
    const dominanceRatio =
      rows.length > 0 && topValues[0]
        ? topValues[0].count / rows.length
        : undefined;

    // Number detection (strip thousands separators)
    const numericCount = nonEmptyValues.filter(v =>
      Number.isFinite(Number(v.replace(/[,\.]/g, "")))
    ).length;

    // Boolean detection
    const booleanCount = nonEmptyValues.filter(v =>
      /^(true|false|0|1|đúng|sai|có|không|yes|no)$/i.test(v)
    ).length;

    const inferredType: "string" | "number" | "boolean" | "mixed" | "empty" | "date" =
      nonEmptyValues.length === 0
        ? "empty"
        : numericCount / nonEmptyValues.length > 0.9
        ? "number"
        : booleanCount / nonEmptyValues.length > 0.9
        ? "boolean"
        : numericCount > 0
        ? "mixed"
        : "string";

    // -- Technical column --
    // A column is technical ONLY when there is strong, unambiguous evidence:
    //   1. Name matches __XXX__, powerapps, uuid, guid, sys_, _row_ — OR
    //   2. >50% of values look like UUIDs or long hex hashes (value-based).
    // Columns like MET.ID / WHA.ID / ORD.TITLE are abbreviated operational codes,
    // NOT technical — they may contain low-cardinality business values (MOTO/PAY/BT).
    //
    // Note: xlsx can produce column names with trailing newlines (__EMPTY\n).
    // We test both the raw name and a trimmed version to handle this.
    const columnTrimmed = column.trim();
    const isTechnicalByName = TECHNICAL_COLUMN_NAME_PATTERNS.some(
      p => p.test(column) || p.test(columnTrimmed)
    );
    const uuidLikeValueCount = nonEmptyValues.filter(
      v => UUID_VALUE_PATTERN.test(v) || HASH_VALUE_PATTERN.test(v)
    ).length;
    const isTechnicalByValues =
      nonEmptyValues.length > 0 &&
      uuidLikeValueCount / nonEmptyValues.length > 0.5;

    if (isTechnicalByName || isTechnicalByValues) {
      dirtySignals.push({
        kind: "technical_column",
        column,
        severity: "info",
        message: "Technical column should be hidden from business questions.",
        evidence: isTechnicalByValues
          ? [`${uuidLikeValueCount}/${nonEmptyValues.length} values look like UUIDs/hashes`]
          : [column]
      });
    }

    // -- Formula errors --
    if (nonEmptyValues.some(v => FORMULA_ERROR_VALUES.has(v))) {
      dirtySignals.push({
        kind: "formula_error",
        column,
        severity: "warning",
        message: "Formula/export error values were detected.",
        evidence: topValues.map(item => `${item.value}: ${item.count}`)
      });
    }

    // -- Excel serial dates --
    // Heuristic: column name looks like a date AND most values are numbers
    // in the valid Excel serial range (2000–2040).
    const isDateNamedColumn = /date|ngày|ngay|thời gian|tg_/i.test(column);
    if (isDateNamedColumn && nonEmptyValues.length > 0) {
      const numericVals = nonEmptyValues
        .map(v => Number(v.replace(/[,\.]/g, "")))
        .filter(n => Number.isFinite(n));
      const serialCount = numericVals.filter(
        n => n >= EXCEL_SERIAL_MIN && n <= EXCEL_SERIAL_MAX
      ).length;
      if (serialCount / Math.max(nonEmptyValues.length, 1) > 0.5) {
        dirtySignals.push({
          kind: "excel_serial_date",
          column,
          severity: "warning",
          message: "Date-like column appears to contain Excel serial values.",
          evidence: nonEmptyValues.slice(0, 5)
        });
      }
    }

    // -- Money embedded in text --
    // Detect note/charge/fee columns with currency-like values:
    // thousands-separated (10,000 or 10.000), bare number + đ/VND, etc.
    const isTextMoneyColumn = /note|ghi ch\u00fa|charge|ti\u1ec1n|fee|ph\u00ed/i.test(column);
    if (isTextMoneyColumn && nonEmptyValues.length > 0) {
      // Single-line regex: thousands-sep OR bare >=4digit number + currency suffix
      const moneyLike = nonEmptyValues.filter(v =>
        /\d{1,3}([.,]\d{3})+/.test(v) ||
        /\d{4,}[\u0111\u0110]/.test(v) ||
        /\d+\s*(vn\u0111|vnd|tri\u1ec7u|\bk\b)/i.test(v)
      );
      if (moneyLike.length > 0) {
        dirtySignals.push({
          kind: "money_embedded_in_text",
          column,
          severity: "warning",
          message: "Money-like values are embedded in a text field.",
          evidence: moneyLike.slice(0, 5)
        });
      }
    }

    // -- Dominant single value --
    if (dominanceRatio != null && dominanceRatio > 0.9 && distinctCount > 1) {
      dirtySignals.push({
        kind: "dominant_single_value",
        column,
        severity: "info",
        message:
          "One value dominates this field; it should not be promoted as a primary distribution by default.",
        evidence: topValues.slice(0, 3).map(item => `${item.value}: ${item.count}`)
      });
    }

    return {
      name: column,
      normalizedName: normalizeColumnName(column),
      health: {
        inferredType,
        nonEmptyCount: nonEmptyValues.length,
        parseSuccessRate:
          nonEmptyValues.length === 0
            ? 0
            : Math.max(numericCount, booleanCount) / nonEmptyValues.length,
        distinctCount,
        dominanceRatio,
        topValues
      }
    };
  });

  const documentType = inferDocumentType(columns, dirtySignals);
  const blockedReasons = dirtySignals
    .filter(s => s.severity === "blocking")
    .map(s => s.message);

  return {
    source: {
      fileNames: input.fileNames,
      sheetNames: input.sheetNames ?? [],
      sourceRowCount: input.sourceRowCount ?? rows.length,
      sourceColumnCount: columns.length,
      parsedRowCount: rows.length,
      sampleRowCount: rows.length
    },
    quality: {
      headerStatus: blockedReasons.length > 0 ? "failed" : "clean",
      dirtySignals,
      blockedReasons
    },
    profile: {
      grain: inferGrain(documentType),
      documentType,
      detectedDomains: inferDomains(documentType)
    },
    columns: profiledColumns
  };
}
