/**
 * Unit tests for understanding-next pure lib.
 *
 * Tests are EVIDENCE-BASED: they assert on inferred structure (headers, profiles,
 * value distributions, dirty signals, field relationships) — not on file names.
 *
 * Each describe block mimics a real sample archetype, but the input is constructed
 * from representative column names and row data — never from file paths or file names.
 */

import { describe, it, expect } from "vitest";
import { buildDatasetProfile } from "./dataset-profiler";
import { detectBusinessSignals } from "./signal-detector";
import { generateQuestionFit } from "./question-fit-engine";
import { createGuardedActions } from "./runtime-action-guard";
import { createDatasetUnderstandingResult } from "./orchestrator";
import type { UnderstandingInput } from "./contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(
  columns: string[],
  rows: Record<string, unknown>[],
  sourceRowCount?: number,
  fileNames: string[] = ["dataset.xlsx"]
): UnderstandingInput {
  return { fileNames, columns, rows, sourceRowCount };
}

function makeRow(columns: string[], values: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of columns) {
    row[col] = values[col] ?? "";
  }
  return row;
}

// ---------------------------------------------------------------------------
// BHX-like retail sales document
// ---------------------------------------------------------------------------

describe("BHX-like retail sales document", () => {
  const COLUMNS = [
    "Ngày xuất",
    "Mã phiếu xuất",
    "Tên kho xuất",
    "Khách hàng",
    "Nhân viên xuất",
    "Tổng tiền",
    "Tiền phải thu",
    "Tiền mặt",
    "Cà thẻ",
    "Số lượng",
    "Chứng từ liên quan",
    "Ghi chú"
  ];

  // Simulate 100 sample rows from a ~14862 source row dataset.
  // "Khách hàng" is dominated by "Khách lẻ" (>90% of rows).
  const ROWS = Array.from({ length: 100 }, (_, i) => ({
    "Ngày xuất": `2024-01-${String((i % 28) + 1).padStart(2, "0")}`,
    "Mã phiếu xuất": `PX${String(i + 1).padStart(5, "0")}`,
    "Tên kho xuất": i % 5 === 0 ? "Kho B" : "Kho A",
    "Khách hàng": i < 95 ? "Khách lẻ" : `Cty ${i}`, // dominance ~0.95
    "Nhân viên xuất": `NV${(i % 8) + 1}`,
    "Tổng tiền": 100000 + i * 1000,
    "Tiền phải thu": 95000 + i * 1000,
    "Tiền mặt": i % 2 === 0 ? 50000 : 0,
    "Cà thẻ": i % 2 === 1 ? 50000 : 0,
    "Số lượng": (i % 10) + 1,
    "Chứng từ liên quan": i % 3 === 0 ? "" : `CT${i}`,
    "Ghi chú": ""
  }));

  const INPUT = makeInput(COLUMNS, ROWS, 14862);

  it("identifies documentType as retail_sales_document", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.profile.documentType).toBe("retail_sales_document");
  });

  it("detects revenue domain", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.profile.detectedDomains).toContain("revenue");
  });

  it("source row count reflects the full dataset not sample", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.source.sourceRowCount).toBe(14862);
    expect(profile.source.sampleRowCount).toBe(100);
    expect(profile.source.sampleRowCount).toBeLessThan(profile.source.sourceRowCount);
  });

  it("detects dominant_single_value signal on Khách hàng", () => {
    const profile = buildDatasetProfile(INPUT);
    const dominated = profile.quality.dirtySignals.filter(
      s => s.kind === "dominant_single_value" && s.column === "Khách hàng"
    );
    expect(dominated.length).toBeGreaterThan(0);
  });

  it("customer signal is NOT usable for default question when dominanceRatio > 0.9", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const customerSignal = signals.find(s => s.canonicalId === "customer");
    expect(customerSignal).toBeDefined();
    expect(customerSignal!.usableForDefaultQuestion).toBe(false);
    expect(customerSignal!.dominanceRatio).toBeGreaterThan(0.9);
  });

  it("recommended questions prioritise revenue, store, payment before customer distribution", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const { questions } = generateQuestionFit(profile, signals);

    const topQuestions = questions.slice(0, 4);
    const topDomains = topQuestions.map(q => q.domain);
    const topKinds = topQuestions.map(q => q.actionKind);

    // Revenue/store questions should dominate top slots
    expect(topDomains).not.toEqual(["customer", "customer", "customer", "customer"]);
    expect(topKinds.some(k => k === "trend" || k === "group_by")).toBe(true);

    // Revenue or branch should appear in top 3
    const hasRevenueOrBranch = topQuestions.some(
      q => q.domain === "revenue" || q.dimensions.some(d => /kho|branch|store/i.test(d))
    );
    expect(hasRevenueOrBranch).toBe(true);
  });

  it("customer distribution question has fitScore < 20 or is demoted", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const { questions } = generateQuestionFit(profile, signals);

    const customerDist = questions.find(
      q => q.domain === "customer" && q.actionKind === "distribution"
    );
    // Either absent or has very low fit score
    if (customerDist) {
      expect(customerDist.fitScore).toBeLessThan(20);
    }
  });

  it("employee signal is detected and usable", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const empSignal = signals.find(s => s.canonicalId === "employee");
    expect(empSignal).toBeDefined();
    expect(empSignal!.usableForDefaultQuestion).toBe(true);
  });

  it("payment signals (cash, card) are detected", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const cashSignal = signals.find(s => s.canonicalId === "payment_cash");
    const cardSignal = signals.find(s => s.canonicalId === "payment_card");
    expect(cashSignal).toBeDefined();
    expect(cardSignal).toBeDefined();
  });

  it("orchestrator result has availableActions for revenue domain", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const revenueActions = result.availableActions.filter(a =>
      result.recommendedQuestions.some(q => q.id === a.questionId && q.domain === "revenue")
    );
    expect(revenueActions.length).toBeGreaterThan(0);
  });

  it("creates lens-first orientation for retail revenue documents", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const lensIds = result.lenses.map(lens => lens.id);
    expect(lensIds).toContain("revenue_over_time");
    expect(lensIds).toContain("store_performance");
    expect(lensIds).toContain("payment_mix");
    expect(lensIds).toContain("employee_performance");
    expect(lensIds).toContain("exception_checks");
  });

  it("customer lens is partial and low priority when customer is dominated", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const customerLens = result.lenses.find(lens => lens.id === "customer_concentration");
    expect(customerLens).toBeDefined();
    expect(customerLens!.availability).toBe("partial");
    expect(customerLens!.priority).toBeLessThan(50);
  });

  it("payment mix lens exposes a safe evidence preview instead of an invalid aggregate", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const paymentLens = result.lenses.find(lens => lens.id === "payment_mix");
    expect(paymentLens).toBeDefined();
    expect(paymentLens!.questions[0].blockedReasons).not.toContain("group_by requires at least 1 dimension");
    expect(paymentLens!.questions[0].defaultAction).toBeDefined();
    expect(paymentLens!.questions[0].defaultAction!.actionKind).toBe("table_preview");
  });

  it("does not expose structurally blocked group_by actions as executable", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const invalidGroupBy = result.availableActions.filter(a =>
      a.actionKind === "group_by" && (a.dimensions.length === 0 || a.measures.length === 0)
    );
    expect(invalidGroupBy).toHaveLength(0);
  });

  it("never marks a lens ready unless it has an executable orientation action", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const readyWithoutAction = result.lenses.filter(lens =>
      lens.availability === "ready" &&
      !lens.questions.some(question => question.defaultAction)
    );
    expect(readyWithoutAction).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TTKT-like logistics intake
// ---------------------------------------------------------------------------

describe("TTKT-like logistics intake report", () => {
  const COLUMNS = [
    "Ngày",
    "Tuyến xe",
    "Chuyến xe",
    "Biển kiểm soát",
    "Lái xe",
    "Nhân viên nhận",
    "Thời gian checkin",
    "Thời gian checkout",
    "Xe đến đúng hẹn",
    "Thời gian chờ",
    "Trọng lượng",
    "Trọng tải",
    "Đánh giá"
  ];

  const ROWS = Array.from({ length: 80 }, (_, i) => ({
    "Ngày": `2024-12-${String((i % 6) + 19).padStart(2, "0")}`,
    "Tuyến xe": `T${(i % 5) + 1}`,
    "Chuyến xe": `CH${String(i + 1).padStart(3, "0")}`,
    "Biển kiểm soát": `51G-${10000 + i}`,
    "Lái xe": `LX${(i % 10) + 1}`,
    "Nhân viên nhận": `NV${(i % 8) + 1}`,
    "Thời gian checkin": `07:${String(i % 60).padStart(2, "0")}`,
    "Thời gian checkout": `08:${String((i + 30) % 60).padStart(2, "0")}`,
    "Xe đến đúng hẹn": i % 3 === 0 ? "Không" : "Có",
    "Thời gian chờ": (i % 45) + 5,
    "Trọng lượng": 100 + i * 10,
    "Trọng tải": 500,
    "Đánh giá": i % 4 === 0 ? "Trễ" : "Đúng giờ"
  }));

  const INPUT = makeInput(COLUMNS, ROWS, 320);

  it("identifies documentType as logistics_intake_report", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.profile.documentType).toBe("logistics_intake_report");
  });

  it("detects operations domain", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.profile.detectedDomains).toContain("operations");
  });

  it("detects on_time_status signal", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const onTimeSignal = signals.find(s => s.canonicalId === "on_time_status");
    expect(onTimeSignal).toBeDefined();
  });

  it("detects waiting_time signal", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const waitingSignal = signals.find(s => s.canonicalId === "waiting_time");
    expect(waitingSignal).toBeDefined();
  });

  it("detects route and trip signals", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const routeSignal = signals.find(s => s.canonicalId === "route");
    const tripSignal = signals.find(s => s.canonicalId === "trip");
    expect(routeSignal).toBeDefined();
    expect(tripSignal).toBeDefined();
  });

  it("detects vehicle and driver signals", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const vehicleSignal = signals.find(s => s.canonicalId === "vehicle");
    const driverSignal = signals.find(s => s.canonicalId === "driver");
    expect(vehicleSignal).toBeDefined();
    expect(driverSignal).toBeDefined();
  });

  it("recommended questions prioritise on-time/waiting/route before generic counts", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const { questions } = generateQuestionFit(profile, signals);

    expect(questions.length).toBeGreaterThan(0);

    const opQuestions = questions.filter(q => q.domain === "operations");
    expect(opQuestions.length).toBeGreaterThan(0);

    // On-time or waiting time should appear early
    const topLabels = questions.slice(0, 4).map(q => q.label.toLowerCase());
    const hasOnTimeOrWaiting = topLabels.some(
      l => l.includes("on-time") || l.includes("waiting") || l.includes("route") || l.includes("trip")
    );
    expect(hasOnTimeOrWaiting).toBe(true);
  });

  it("creates operations lenses for SLA, waiting time, and route/trip/vehicle flow", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const lensIds = result.lenses.map(lens => lens.id);
    expect(lensIds).toContain("operations_sla");
    expect(lensIds).toContain("operations_waiting_time");
    expect(lensIds).toContain("route_trip_vehicle");
  });

  it("source/sample/result rows are distinguished", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    expect(result.source.sourceRowCount).toBe(320);
    expect(result.source.sampleRowCount).toBe(80);
    expect(result.source.sampleRowCount).toBeLessThan(result.source.sourceRowCount);
  });
});

// ---------------------------------------------------------------------------
// Motodetail-like dirty operational export
// ---------------------------------------------------------------------------

describe("Motodetail-like dirty operational export", () => {
  // Columns that mirror real motodetail.xlsx structure (with newlines as they appear
  // when parsed from xlsx). The __PowerAppsId__ is the TRUE technical column.
  // MET.\nID contains MOTO/PAY/PAY+ — it is a BUSINESS signal, not technical.
  const COLUMNS = [
    "MET.\nID",           // normalized = "met. id" — row_type signal via name OR values
    "Date",
    "ORD.\nTITLE",
    "CUST.\nNAME",
    "AREA\nCLASS",
    "NOTE",
    "EMP.\nID",
    "LOAI",
    "CHARGE",
    "__PowerAppsId__"    // true technical column
  ];

  const ROWS = Array.from({ length: 60 }, (_, i) => ({
    "MET.\nID": i % 3 === 0 ? "MOTO" : i % 3 === 1 ? "PAY" : "PAY+",  // business codes
    "Date": 44278 + i,                          // Excel serial dates
    "ORD.\nTITLE": `Order ${i}`,
    "CUST.\nNAME": `Customer ${i % 20}`,
    "AREA\nCLASS": i % 10 === 0 ? "#REF!" : `Zone${i % 5}`,  // formula errors
    "NOTE": i % 4 === 0 ? `Phí giao: ${(i + 1) * 10000}đ` : "giao hàng",  // money in text
    "EMP.\nID": `EMP${i % 8}`,
    "LOAI": i % 3 === 0 ? "MOTO" : i % 3 === 1 ? "PAY" : "PAY+",
    "CHARGE": i % 5 === 0 ? "#REF!" : String(i * 5000),
    "__PowerAppsId__": `powerapps-uuid-${i}`    // system identifier
  }));

  const INPUT = makeInput(COLUMNS, ROWS, 1461);

  it("identifies documentType as dirty_operational_export", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.profile.documentType).toBe("dirty_operational_export");
  });

  it("detects excel_serial_date signal on Date column", () => {
    const profile = buildDatasetProfile(INPUT);
    const serialDateSignals = profile.quality.dirtySignals.filter(
      s => s.kind === "excel_serial_date" && s.column === "Date"
    );
    expect(serialDateSignals.length).toBeGreaterThan(0);
  });

  it("detects formula_error signal on AREA CLASS or CHARGE", () => {
    const profile = buildDatasetProfile(INPUT);
    const formulaErrors = profile.quality.dirtySignals.filter(s => s.kind === "formula_error");
    expect(formulaErrors.length).toBeGreaterThan(0);
    const affectedColumns = formulaErrors.map(s => s.column);
    expect(
      affectedColumns.some(c => c === "AREA\nCLASS" || c === "CHARGE")
    ).toBe(true);
  });

  it("detects money_embedded_in_text signal on NOTE", () => {
    const profile = buildDatasetProfile(INPUT);
    const moneySignals = profile.quality.dirtySignals.filter(
      s => s.kind === "money_embedded_in_text" && s.column === "NOTE"
    );
    expect(moneySignals.length).toBeGreaterThan(0);
  });

  it("__PowerAppsId__ is classified as technical_column", () => {
    const profile = buildDatasetProfile(INPUT);
    const techSignals = profile.quality.dirtySignals.filter(
      s => s.kind === "technical_column" && s.column === "__PowerAppsId__"
    );
    expect(techSignals.length).toBeGreaterThan(0);
  });

  it("MET.\\nID is NOT classified as technical_column (it has MOTO/PAY business values)", () => {
    const profile = buildDatasetProfile(INPUT);
    const metIdTech = profile.quality.dirtySignals.filter(
      s => s.kind === "technical_column" && s.column === "MET.\nID"
    );
    // MET.\nID must NOT be technical — it contains low-cardinality business codes
    expect(metIdTech.length).toBe(0);
  });

  it("MET.\\nID is detected as row_type signal (by name or value)", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const rowTypeSignal = signals.find(
      s => s.canonicalId === "row_type" && s.physicalColumn === "MET.\nID"
    );
    // Either: name match via met.\s*id pattern, or value-based detection
    expect(rowTypeSignal).toBeDefined();
    expect(rowTypeSignal!.role).toBe("dimension");
    expect(rowTypeSignal!.usableForDefaultQuestion).toBe(true);
  });

  it("data_quality_review is the first recommended question", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const { questions } = generateQuestionFit(profile, signals);

    expect(questions.length).toBeGreaterThan(0);
    const topQuestion = questions[0];
    expect(topQuestion.actionKind).toBe("data_quality_review");
  });

  it("data_quality_review question has highest fitScore for dirty exports", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const { questions } = generateQuestionFit(profile, signals);

    const dqr = questions.find(q => q.actionKind === "data_quality_review");
    expect(dqr).toBeDefined();

    const maxOtherScore = questions
      .filter(q => q.actionKind !== "data_quality_review")
      .reduce((max, q) => Math.max(max, q.fitScore), 0);

    expect(dqr!.fitScore).toBeGreaterThan(maxOtherScore);
  });

  it("data_quality_review becomes an availableAction (not blocked) for dirty exports", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const dqrAction = result.availableActions.find(a => {
      const q = result.recommendedQuestions.find(q => q.id === a.questionId);
      return q?.actionKind === "data_quality_review";
    });
    expect(dqrAction).toBeDefined();
  });

  it("aggregate chart actions are not available as primary for dirty exports (blocked or demoted)", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const dqrActions = result.availableActions.filter(a => {
      const q = result.recommendedQuestions.find(q => q.id === a.questionId);
      return q?.actionKind === "data_quality_review";
    });
    // DQR must exist as available
    expect(dqrActions.length).toBeGreaterThan(0);
    // DQR must have higher fitScore than any aggregate question
    const dqrQ = result.recommendedQuestions.find(q => q.actionKind === "data_quality_review");
    const aggrQ = result.recommendedQuestions.find(q => q.actionKind === "trend" || q.actionKind === "group_by");
    if (dqrQ && aggrQ) {
      expect(dqrQ.fitScore).toBeGreaterThan(aggrQ.fitScore);
    }
  });

  it("source row count is not confused with sample row count", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    expect(result.source.sourceRowCount).toBe(1461);
    expect(result.source.sampleRowCount).toBe(60);
  });

  it("dirty export creates a data quality review lens before runtime analysis", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const reviewLens = result.lenses.find(lens => lens.id === "data_quality_review");
    expect(reviewLens).toBeDefined();
    expect(reviewLens!.availability).toBe("ready");
    expect(reviewLens!.questions[0].intent).toBe("quality_review");
  });
});


// ---------------------------------------------------------------------------
// PLU/product master
// ---------------------------------------------------------------------------

describe("PLU/product master", () => {
  const COLUMNS = [
    "PLU",
    "Barcode",
    "Tên hàng",
    "Mã hàng",
    "Nhóm hàng",
    "Đơn vị tính",
    "Giá bán",
    "Tồn kho"
  ];

  const ROWS = Array.from({ length: 200 }, (_, i) => ({
    "PLU": `PLU${String(i + 1).padStart(4, "0")}`,
    "Barcode": `890${String(1000000 + i)}`,
    "Tên hàng": `Sản phẩm ${i + 1}`,
    "Mã hàng": `MH${i + 1}`,
    "Nhóm hàng": `Nhóm ${(i % 10) + 1}`,
    "Đơn vị tính": i % 3 === 0 ? "Cái" : i % 3 === 1 ? "Hộp" : "Kg",
    "Giá bán": 5000 + i * 100,
    "Tồn kho": i % 20
  }));

  const INPUT = makeInput(COLUMNS, ROWS, 2500);

  it("identifies documentType as product_master", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.profile.documentType).toBe("product_master");
  });

  it("detects inventory domain", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.profile.detectedDomains).toContain("inventory");
  });

  it("detects SKU signal", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const skuSignal = signals.find(s => s.canonicalId === "sku");
    expect(skuSignal).toBeDefined();
  });

  it("grain is master_data", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.profile.grain).toBe("master_data");
  });

  it("recommended questions are inventory-oriented", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const { questions } = generateQuestionFit(profile, signals);

    expect(questions.length).toBeGreaterThan(0);
    const inventoryQ = questions.filter(q => q.domain === "inventory");
    expect(inventoryQ.length).toBeGreaterThan(0);
  });

  it("PLU column is detected as identifier (high cardinality, not default dimension)", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const skuSignal = signals.find(s => s.canonicalId === "sku");
    expect(skuSignal).toBeDefined();
    // High cardinality identifier should not be usable for default distribution
    expect(skuSignal!.usableForDefaultQuestion).toBe(false);
  });

  it("creates inventory lenses for product overview and stock health", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const lensIds = result.lenses.map(lens => lens.id);
    expect(lensIds).toContain("product_overview");
    expect(lensIds).toContain("stock_health");
  });
});

// ---------------------------------------------------------------------------
// Inventory aging / stock snapshot
// ---------------------------------------------------------------------------

describe("Inventory aging stock snapshot", () => {
  const COLUMNS = [
    "Mã phiếu gửi",
    "Bưu cục nhập máy",
    "User nhập máy",
    "Thời gian nhập máy",
    "Bưu cục hiện tại",
    "Mã dịch vụ",
    "Nhóm dịch vụ",
    "Loại hàng",
    "Khối lượng (gram)",
    "Bưu cục phát",
    "Tiền thu hộ (đồng)",
    "Tổng cước (đồng)",
    "Thời gian nhận",
    "Ngưỡng tồn",
    "Thời gian báo cáo",
    "Thời gian tồn",
    "Điểm đến",
    "Chi nhánh hiện tại",
    "Trạng thái",
    "Khai giá",
    "Nội dung hàng",
    "Tình trạng tải"
  ];

  const ROWS = Array.from({ length: 120 }, (_, i) => ({
    "Mã phiếu gửi": `PG${100000 + i}`,
    "Bưu cục nhập máy": `BCN${i % 4}`,
    "User nhập máy": `user${i % 8}`,
    "Thời gian nhập máy": "07:26 22-12-2024",
    "Bưu cục hiện tại": `HUB${i % 5}`,
    "Mã dịch vụ": i % 2 === 0 ? "VSL6" : "LCOD",
    "Nhóm dịch vụ": i % 3 === 0 ? "Chậm" : "Nhanh",
    "Loại hàng": i % 2 === 0 ? "Kiện" : "Thùng",
    "Khối lượng (gram)": 1000 + i,
    "Bưu cục phát": `BCP${i % 6}`,
    "Tiền thu hộ (đồng)": 50000 + i * 1000,
    "Tổng cước (đồng)": 12000 + i * 100,
    "Thời gian nhận": "09:34 27-12-2024",
    "Ngưỡng tồn": i % 4 === 0 ? "ton24-48h" : "ton12-24h",
    "Thời gian báo cáo": "09:12 28-12-2024",
    "Thời gian tồn": i % 4 === 0 ? 40 : 18,
    "Điểm đến": `DEST${i % 7}`,
    "Chi nhánh hiện tại": `CN${i % 3}`,
    "Trạng thái": i % 5 === 0 ? "500" : "400",
    "Khai giá": 50000 + i * 1000,
    "Nội dung hàng": "hàng hóa",
    "Tình trạng tải": i % 6 === 0 ? "chưa tải" : "đã tải"
  }));

  const INPUT = makeInput(COLUMNS, ROWS, 6386);

  it("identifies documentType as inventory_snapshot", () => {
    const profile = buildDatasetProfile(INPUT);
    expect(profile.profile.documentType).toBe("inventory_snapshot");
  });

  it("detects stock aging, current location, threshold, value, and load/status signals", () => {
    const profile = buildDatasetProfile(INPUT);
    const signals = detectBusinessSignals(profile);
    const ids = signals.map(signal => signal.canonicalId);
    expect(ids).toContain("shipment_id");
    expect(ids).toContain("current_location");
    expect(ids).toContain("stock_threshold");
    expect(ids).toContain("stock_age");
    expect(ids).toContain("cod_amount");
    expect(ids).toContain("freight_fee");
    expect(ids).toContain("service_group");
    expect(ids).toContain("load_status");
  });

  it("asks inventory-aging questions that a user can execute", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const lensIds = result.lenses.map(lens => lens.id);
    expect(lensIds).toContain("stock_health");
    expect(lensIds).toContain("inventory_value_exposure");
    expect(lensIds).toContain("inventory_structure");

    const agingLens = result.lenses.find(lens => lens.id === "stock_health");
    expect(agingLens?.label).toBe("Inventory aging and backlog risk");
    expect(agingLens?.questions[0].defaultAction?.actionKind).toBe("group_by");
    expect(agingLens?.questions[0].defaultAction?.measures).toEqual(["record_count"]);

    const labels = result.lenses.flatMap(lens => lens.questions.map(question => question.label));
    expect(labels).toContain("Aging risk by threshold");
    expect(labels).toContain("Value at risk by current location");
    expect(labels).toContain("Service or item mix in inventory");
  });

  it("does not promote operations/SLA lenses above inventory snapshot questions", () => {
    const result = createDatasetUnderstandingResult(INPUT);
    const topLabels = result.lenses.slice(0, 4).map(lens => lens.label);

    expect(topLabels).toEqual([
      "Inventory aging and backlog risk",
      "Inventory value exposure",
      "Service, item, and status structure",
      "Product and SKU overview"
    ]);
    expect(result.lenses.map(lens => lens.label)).not.toContain("SLA and on-time performance");
  });
});

// ---------------------------------------------------------------------------
// Management ranking (BLOCKED if schema unrecoverable, or classified correctly)
// ---------------------------------------------------------------------------

describe("Management ranking document", () => {
  describe("with recoverable schema", () => {
    const COLUMNS = [
      "Tên Quản Lý",
      "Khu vực",
      "Xếp hạng",
      "KPI",
      "Target",
      "Achievement",
      "Rank"
    ];

    const ROWS = Array.from({ length: 50 }, (_, i) => ({
      "Tên Quản Lý": `Manager ${i + 1}`,
      "Khu vực": `Region ${(i % 5) + 1}`,
      "Xếp hạng": i + 1,
      "KPI": 80 + (i % 20),
      "Target": 100,
      "Achievement": 85 + (i % 15),
      "Rank": i + 1
    }));

    const INPUT = makeInput(COLUMNS, ROWS, 50);

    it("identifies documentType as management_ranking", () => {
      const profile = buildDatasetProfile(INPUT);
      expect(profile.profile.documentType).toBe("management_ranking");
    });

    it("detects performance domain", () => {
      const profile = buildDatasetProfile(INPUT);
      expect(profile.profile.detectedDomains).toContain("performance");
    });

    it("detects KPI signal", () => {
      const profile = buildDatasetProfile(INPUT);
      const signals = detectBusinessSignals(profile);
      const kpiSignal = signals.find(s => s.canonicalId === "kpi");
      expect(kpiSignal).toBeDefined();
    });

    it("grain is summary", () => {
      const profile = buildDatasetProfile(INPUT);
      expect(profile.profile.grain).toBe("summary");
    });

    it("generates performance questions (not blocked)", () => {
      const result = createDatasetUnderstandingResult(INPUT);
      expect(result.quality.blockedReasons.length).toBe(0);
      expect(result.availableActions.length).toBeGreaterThan(0);
    });
  });

  describe("with empty/unrecoverable schema (BLOCKED)", () => {
    const INPUT = makeInput([], [], 0);

    it("quality.headerStatus is failed", () => {
      const profile = buildDatasetProfile(INPUT);
      expect(profile.quality.headerStatus).toBe("failed");
    });

    it("has blocking dirtySignal empty_schema", () => {
      const profile = buildDatasetProfile(INPUT);
      const blocked = profile.quality.dirtySignals.filter(s => s.kind === "empty_schema");
      expect(blocked.length).toBeGreaterThan(0);
      expect(blocked[0].severity).toBe("blocking");
    });

    it("blockedReasons is non-empty", () => {
      const profile = buildDatasetProfile(INPUT);
      expect(profile.quality.blockedReasons.length).toBeGreaterThan(0);
    });

    it("orchestrator returns no availableActions when blocked", () => {
      const result = createDatasetUnderstandingResult(INPUT);
      expect(result.availableActions.length).toBe(0);
      expect(result.quality.blockedReasons.length).toBeGreaterThan(0);
    });

    it("orchestrator result preserves blockedReasons", () => {
      const result = createDatasetUnderstandingResult(INPUT);
      expect(result.quality.blockedReasons.some(r => /column|header|schema/i.test(r))).toBe(true);
    });

    it("blocked schema creates a schema recovery lens and no executable actions", () => {
      const result = createDatasetUnderstandingResult(INPUT);
      const schemaLens = result.lenses.find(lens => lens.id === "schema_blocked");
      expect(schemaLens).toBeDefined();
      expect(schemaLens!.availability).toBe("blocked");
      expect(result.availableActions).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Generic domain coverage — all declared domains must be reachable
// ---------------------------------------------------------------------------

describe("Domain coverage: all domains must have representable question templates", () => {
  it("operations domain produces questions from logistics-like columns", () => {
    const input = makeInput(
      ["Ngày", "Tuyến xe", "Đánh giá", "Thời gian chờ"],
      Array.from({ length: 30 }, (_, i) => ({
        "Ngày": `2024-01-${i + 1}`,
        "Tuyến xe": `T${i % 3}`,
        "Đánh giá": i % 2 === 0 ? "Đúng giờ" : "Trễ",
        "Thời gian chờ": i * 5
      }))
    );
    const result = createDatasetUnderstandingResult(input);
    const opQ = result.recommendedQuestions.filter(q => q.domain === "operations");
    expect(opQ.length).toBeGreaterThan(0);
  });

  it("revenue domain produces questions from retail-like columns", () => {
    const input = makeInput(
      ["Ngày xuất", "Tổng tiền", "Tên kho xuất"],
      Array.from({ length: 30 }, (_, i) => ({
        "Ngày xuất": `2024-01-${i + 1}`,
        "Tổng tiền": 100000 + i * 500,
        "Tên kho xuất": `Kho ${i % 3}`
      }))
    );
    const result = createDatasetUnderstandingResult(input);
    const revQ = result.recommendedQuestions.filter(q => q.domain === "revenue");
    expect(revQ.length).toBeGreaterThan(0);
  });

  it("inventory domain produces questions from PLU-like columns", () => {
    const input = makeInput(
      ["PLU", "Tên hàng", "Tồn kho"],
      Array.from({ length: 30 }, (_, i) => ({
        "PLU": `PLU${i}`,
        "Tên hàng": `Hàng ${i}`,
        "Tồn kho": i * 10
      }))
    );
    const result = createDatasetUnderstandingResult(input);
    const invQ = result.recommendedQuestions.filter(q => q.domain === "inventory");
    expect(invQ.length).toBeGreaterThan(0);
  });

  it("performance domain produces questions from KPI-like columns", () => {
    const input = makeInput(
      ["Tên Quản Lý", "KPI", "Xếp hạng"],
      Array.from({ length: 20 }, (_, i) => ({
        "Tên Quản Lý": `Manager ${i}`,
        "KPI": 80 + i,
        "Xếp hạng": i + 1
      }))
    );
    const result = createDatasetUnderstandingResult(input);
    const perfQ = result.recommendedQuestions.filter(q => q.domain === "performance");
    expect(perfQ.length).toBeGreaterThan(0);
  });

  it("finance domain is represented as not implemented, without executable actions", () => {
    const input = makeInput(
      ["Budget", "Cost", "Profit", "Fiscal Period"],
      Array.from({ length: 20 }, (_, i) => ({
        "Budget": 1000 + i,
        "Cost": 700 + i,
        "Profit": 300,
        "Fiscal Period": `P${i % 4}`
      }))
    );
    const result = createDatasetUnderstandingResult(input);
    const financeLens = result.lenses.find(lens => lens.id === "finance_not_implemented");
    expect(financeLens).toBeDefined();
    expect(financeLens!.availability).toBe("not_implemented");
    expect(result.availableActions.some(action => action.label.toLowerCase().includes("finance"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Source / Sample / Result row count contracts
// ---------------------------------------------------------------------------

describe("Source vs sample vs result row count contract", () => {
  it("when sourceRowCount > rows.length, sampleRowCount < sourceRowCount", () => {
    const input = makeInput(
      ["Ngày", "Tiền"],
      Array.from({ length: 50 }, (_, i) => ({ "Ngày": `2024-01-${i + 1}`, "Tiền": i * 1000 })),
      10000
    );
    const profile = buildDatasetProfile(input);
    expect(profile.source.sourceRowCount).toBe(10000);
    expect(profile.source.sampleRowCount).toBe(50);
    expect(profile.source.parsedRowCount).toBe(50);
  });

  it("when sourceRowCount is not provided, sourceRowCount = parsedRowCount = sampleRowCount", () => {
    const input = makeInput(
      ["Ngày", "Tiền"],
      Array.from({ length: 30 }, (_, i) => ({ "Ngày": `2024-01-${i + 1}`, "Tiền": i * 1000 }))
    );
    const profile = buildDatasetProfile(input);
    expect(profile.source.sourceRowCount).toBe(30);
    expect(profile.source.parsedRowCount).toBe(30);
    expect(profile.source.sampleRowCount).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// No hardcoding rule: code must not branch on file name
// ---------------------------------------------------------------------------

describe("No file-name hardcoding rule", () => {
  it("identical column structure with different file name produces same documentType", () => {
    const columns = ["Ngày xuất", "Tổng tiền", "Tên kho xuất", "Khách hàng", "Nhân viên xuất"];
    const rows = Array.from({ length: 10 }, (_, i) => ({
      "Ngày xuất": `2024-01-${i + 1}`,
      "Tổng tiền": i * 1000,
      "Tên kho xuất": `Kho ${i % 2}`,
      "Khách hàng": "Khách lẻ",
      "Nhân viên xuất": `NV${i}`
    }));

    const resultA = buildDatasetProfile({ fileNames: ["BHX_PHIEUXUAT.xlsx"], columns, rows });
    const resultB = buildDatasetProfile({ fileNames: ["sales_export_2024.xlsx"], columns, rows });
    const resultC = buildDatasetProfile({ fileNames: ["random_name.xlsx"], columns, rows });

    // All must produce same documentType regardless of file name
    expect(resultA.profile.documentType).toBe(resultB.profile.documentType);
    expect(resultB.profile.documentType).toBe(resultC.profile.documentType);
  });

  it("identical column structure with different sheet name produces same documentType", () => {
    const columns = ["Thời gian checkin", "Tuyến xe", "Xe đến đúng hẹn", "Thời gian chờ"];
    const rows = Array.from({ length: 10 }, (_, i) => ({
      "Thời gian checkin": `07:${i}0`,
      "Tuyến xe": `T${i}`,
      "Xe đến đúng hẹn": "Có",
      "Thời gian chờ": i * 5
    }));

    const resultA = buildDatasetProfile({ fileNames: ["a.xlsx"], sheetNames: ["bcctnhapTTKT"], columns, rows });
    const resultB = buildDatasetProfile({ fileNames: ["a.xlsx"], sheetNames: ["Sheet1"], columns, rows });

    expect(resultA.profile.documentType).toBe(resultB.profile.documentType);
  });
});
