import { describe, expect, it } from "vitest";
import { createUnderstandingCoreResult } from "./question-engine";
import type { UnderstandingCoreInput } from "./contracts";
import { adaptCoreToUnderstandingNext } from "./next-adapter";

function makeRows<T extends Record<string, unknown>>(count: number, row: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => row(index));
}

function input(columns: string[], rows: Record<string, unknown>[], sourceRowCount = rows.length): UnderstandingCoreInput {
  return {
    fileNames: ["random-user-export.xlsx"],
    sheetNames: ["Sheet 1"],
    columns,
    rows,
    sourceRowCount
  };
}

function questionIds(result: ReturnType<typeof createUnderstandingCoreResult>): string[] {
  return result.questions.map(question => question.id);
}

describe("understanding-core universal signal ontology", () => {
  it("uses money/time/location/payment questions for retail-like sales without needing a retail domain first", () => {
    const result = createUnderstandingCoreResult(input(
      ["Ngày xuất", "Mã kho xuất", "Tổng tiền", "Tiền mặt khách đưa", "Tiền cà thẻ", "Mã nhân viên xuất", "Khách hàng"],
      makeRows(100, index => ({
        "Ngày xuất": 44459 + (index % 5),
        "Mã kho xuất": `S${index % 6}`,
        "Tổng tiền": 100000 + index * 1000,
        "Tiền mặt khách đưa": index % 2 === 0 ? 50000 : 0,
        "Tiền cà thẻ": index % 2 === 1 ? 75000 : 0,
        "Mã nhân viên xuất": `E${index % 10}`,
        "Khách hàng": index < 95 ? "Khách lẻ" : `C${index}`
      })),
      14862
    ));

    expect(result.overlays).toContain("generic_business");
    expect(result.overlays).toContain("retail");
    expect(questionIds(result)).toContain("money_over_time");
    expect(questionIds(result)).toContain("money_by_location");
    expect(questionIds(result)).toContain("payment_mix");
    expect(questionIds(result)).toContain("actor_value");
    expect(result.questions.find(question => question.id === "customer_or_patient_value")?.action).toBeUndefined();
  });

  it("applies the same money questions to B2B invoices through vendor/customer/document signals", () => {
    const result = createUnderstandingCoreResult(input(
      ["Invoice Date", "Invoice No", "Customer", "Supplier", "Region", "Amount Due", "VAT"],
      makeRows(80, index => ({
        "Invoice Date": `2024-12-${String((index % 20) + 1).padStart(2, "0")}`,
        "Invoice No": `INV-${1000 + index}`,
        "Customer": `Customer ${index % 12}`,
        "Supplier": `Supplier ${index % 4}`,
        "Region": `Region ${index % 3}`,
        "Amount Due": 2500000 + index * 20000,
        "VAT": 200000
      }))
    ));

    expect(result.overlays).toContain("b2b");
    expect(questionIds(result)).toContain("money_over_time");
    expect(questionIds(result)).toContain("money_by_location");
    expect(questionIds(result)).toContain("customer_or_patient_value");
    expect(questionIds(result)).toContain("document_coverage");
  });

  it("runs payment mix as a real group_by when payment method is one categorical column", () => {
    const result = createUnderstandingCoreResult(input(
      ["OrderDate", "Store", "Payment", "Revenue"],
      makeRows(120, index => ({
        OrderDate: `2026-05-${String((index % 28) + 1).padStart(2, "0")}`,
        Store: `S${index % 4}`,
        Payment: ["Tiền mặt", "Trả góp", "Chuyển khoản"][index % 3],
        Revenue: 1000000 + index * 1000
      }))
    ));

    const paymentQuestion = result.questions.find(question => question.id === "payment_mix");
    expect(paymentQuestion?.action?.actionKind).toBe("group_by");
    expect(paymentQuestion?.action?.dimensions).toEqual(["Payment"]);
    expect(paymentQuestion?.action?.measures).toEqual(["Revenue"]);
  });

  it("lets healthcare billing inherit business questions while adding healthcare overlay signals", () => {
    const result = createUnderstandingCoreResult(input(
      ["Ngày khám", "Bệnh nhân", "Bác sĩ", "Tên thuốc", "Dịch vụ", "Tiền phải thu", "Tiền mặt", "Trạng thái thanh toán"],
      makeRows(60, index => ({
        "Ngày khám": `2025-01-${String((index % 28) + 1).padStart(2, "0")}`,
        "Bệnh nhân": `BN${index % 20}`,
        "Bác sĩ": `DR${index % 5}`,
        "Tên thuốc": index % 2 === 0 ? "Amoxicillin" : "Paracetamol",
        "Dịch vụ": index % 3 === 0 ? "Khám tổng quát" : "Bán thuốc",
        "Tiền phải thu": 150000 + index * 5000,
        "Tiền mặt": 100000,
        "Trạng thái thanh toán": index % 4 === 0 ? "Chưa thu" : "Đã thu"
      }))
    ));

    expect(result.overlays).toContain("healthcare");
    expect(questionIds(result)).toContain("money_over_time");
    expect(questionIds(result)).toContain("item_value");
    expect(questionIds(result)).toContain("actor_value");
    expect(questionIds(result)).toContain("customer_or_patient_value");
    expect(questionIds(result)).toContain("payment_mix");
  });

  it("detects profit and margin questions for broad business performance exports", () => {
    const result = createUnderstandingCoreResult(input(
      ["Tháng", "Khu vực", "Sản phẩm", "Doanh thu", "Giá vốn", "Lợi nhuận", "Biên lợi nhuận"],
      makeRows(36, index => ({
        "Tháng": `2025-${String((index % 12) + 1).padStart(2, "0")}`,
        "Khu vực": `Region ${index % 3}`,
        "Sản phẩm": `Item ${index % 6}`,
        "Doanh thu": 10000000 + index * 100000,
        "Giá vốn": 7000000 + index * 50000,
        "Lợi nhuận": 3000000 + index * 50000,
        "Biên lợi nhuận": 0.3
      }))
    ));

    expect(result.signals.map(signal => signal.id)).toContain("money.profit");
    expect(result.signals.map(signal => signal.id)).toContain("money.margin");
    expect(questionIds(result)).toContain("profit_or_margin");
    expect(result.questions.find(question => question.id === "profit_or_margin")?.action?.actionKind).toBe("group_by");
  });

  it("detects receivable, payable, debt, and balance review for accounting-like exports", () => {
    const result = createUnderstandingCoreResult(input(
      ["Kỳ", "Khách hàng", "Nhà cung cấp", "Công nợ", "Phải thu", "Phải trả", "Số dư cuối"],
      makeRows(40, index => ({
        "Kỳ": `2025-${String((index % 12) + 1).padStart(2, "0")}`,
        "Khách hàng": `Customer ${index % 8}`,
        "Nhà cung cấp": `Supplier ${index % 5}`,
        "Công nợ": 2000000 + index * 10000,
        "Phải thu": 1500000 + index * 10000,
        "Phải trả": 500000 + index * 5000,
        "Số dư cuối": 1000000 + index * 2000
      }))
    ));

    expect(result.signals.map(signal => signal.id)).toContain("money.receivable");
    expect(result.signals.map(signal => signal.id)).toContain("money.payable");
    expect(result.signals.map(signal => signal.id)).toContain("money.debt");
    expect(result.signals.map(signal => signal.id)).toContain("money.closing_balance");
    expect(questionIds(result)).toContain("receivable_payable_balance");
  });

  it("detects stock movement questions from purchase/sales/return quantities", () => {
    const result = createUnderstandingCoreResult(input(
      ["Ngày", "Mã hàng", "Tên hàng", "Kho", "Số lượng đặt", "Số lượng nhận", "Số lượng bán", "Số lượng trả", "Phiếu nhập", "Chuyển kho"],
      makeRows(50, index => ({
        "Ngày": `2025-02-${String((index % 20) + 1).padStart(2, "0")}`,
        "Mã hàng": `SKU${index % 10}`,
        "Tên hàng": `Product ${index % 10}`,
        "Kho": `WH${index % 3}`,
        "Số lượng đặt": 100 + index,
        "Số lượng nhận": 90 + index,
        "Số lượng bán": 60 + index,
        "Số lượng trả": index % 5,
        "Phiếu nhập": `GRN${index}`,
        "Chuyển kho": `TF${index % 12}`
      }))
    ));

    expect(result.signals.map(signal => signal.id)).toContain("quantity.received");
    expect(result.signals.map(signal => signal.id)).toContain("quantity.sold");
    expect(result.signals.map(signal => signal.id)).toContain("quantity.returned");
    expect(questionIds(result)).toContain("stock_movement");
    expect(result.questions.find(question => question.id === "stock_movement")?.action?.actionKind).toBe("group_by");
  });

  it("detects approval and reconciliation control-status questions", () => {
    const result = createUnderstandingCoreResult(input(
      ["Ngày tạo", "Số chứng từ", "Người tạo", "Trạng thái phê duyệt", "Trạng thái đối soát", "Tổng tiền"],
      makeRows(30, index => ({
        "Ngày tạo": `2025-03-${String((index % 20) + 1).padStart(2, "0")}`,
        "Số chứng từ": `DOC${index}`,
        "Người tạo": `User ${index % 6}`,
        "Trạng thái phê duyệt": index % 3 === 0 ? "Chờ duyệt" : "Đã duyệt",
        "Trạng thái đối soát": index % 4 === 0 ? "Chưa đối soát" : "Đã đối soát",
        "Tổng tiền": 500000 + index * 1000
      }))
    ));

    expect(result.signals.map(signal => signal.id)).toContain("status.approval");
    expect(result.signals.map(signal => signal.id)).toContain("status.reconciliation");
    expect(questionIds(result)).toContain("approval_or_reconciliation_flow");
  });

  it("detects response/campaign questions without requiring a banking domain or filename", () => {
    const result = createUnderstandingCoreResult(input(
      ["age", "job", "marital", "education", "housing", "loan", "contact", "month", "duration", "campaign", "previous", "poutcome", "emp.var.rate", "y"],
      makeRows(120, index => ({
        age: 25 + (index % 40),
        job: ["admin.", "technician", "services", "management"][index % 4],
        marital: index % 2 === 0 ? "married" : "single",
        education: ["basic.9y", "university.degree", "high.school"][index % 3],
        housing: index % 2 === 0 ? "yes" : "no",
        loan: index % 5 === 0 ? "yes" : "no",
        contact: index % 3 === 0 ? "telephone" : "cellular",
        month: ["may", "jun", "jul"][index % 3],
        duration: 100 + index,
        campaign: 1 + (index % 6),
        previous: index % 4,
        poutcome: index % 5 === 0 ? "success" : "nonexistent",
        "emp.var.rate": 1.1,
        y: index % 8 === 0 ? "yes" : "no"
      }))
    ));

    expect(result.overlays).toContain("campaign");
    expect(result.signals.map(signal => signal.id)).toContain("engagement.outcome");
    expect(result.signals.map(signal => signal.id)).toContain("engagement.segment");
    expect(result.signals.map(signal => signal.id)).toContain("engagement.contact_channel");
    expect(result.signals.some(signal => signal.id === "money.receivable" && signal.physicalColumn === "emp.var.rate")).toBe(false);
    expect(questionIds(result)).toContain("engagement_outcome_overview");
    expect(questionIds(result)).toContain("engagement_by_segment");
    expect(questionIds(result)).toContain("engagement_by_contact_channel");
    expect(questionIds(result)).toContain("campaign_effort_review");
    expect(result.questions.find(question => question.id === "engagement_by_segment")?.action?.actionKind).toBe("group_by");
    expect(result.questions.find(question => question.id === "engagement_by_segment")?.action?.dimensions).toEqual(["job"]);
    expect(result.questions.find(question => question.id === "engagement_by_segment")?.action?.derivedMeasures?.[0]?.label).toBe("response_rate");
  });

  it("keeps imbalanced binary response outcomes usable for campaign questions", () => {
    const result = createUnderstandingCoreResult(input(
      ["job", "contact", "campaign", "y"],
      makeRows(100, index => ({
        job: ["admin.", "technician", "services", "management"][index % 4],
        contact: index % 3 === 0 ? "telephone" : "cellular",
        campaign: 1 + (index % 6),
        y: index < 94 ? "no" : "yes"
      }))
    ));

    const outcome = result.signals.find(signal => signal.id === "engagement.outcome");
    expect(outcome?.usableForDefaultQuestion).toBe(true);
    expect(result.questions.find(question => question.id === "engagement_outcome_overview")?.action?.actionKind).toBe("distribution");
    expect(result.questions.find(question => question.id === "engagement_by_segment")?.action?.actionKind).toBe("group_by");
    expect(result.questions.find(question => question.id === "engagement_by_segment")?.action?.derivedMeasures?.[0]?.sourceColumn).toBe("y");
  });

  it("uses full-file column profiles when preview rows hide later values", () => {
    const result = createUnderstandingCoreResult({
      ...input(
        ["job", "contact", "campaign", "y"],
        makeRows(100, index => ({
          job: ["admin.", "technician", "services", "management"][index % 4],
          contact: "telephone",
          campaign: 1 + (index % 6),
          y: index < 94 ? "no" : "yes"
        })),
        41188
      ),
      columnProfiles: {
        contact: {
          name: "contact",
          dataType: "string",
          distinctCount: 2,
          nullPercent: 0,
          topValues: ["cellular", "telephone"],
          topValueCounts: [
            { value: "cellular", count: 26144 },
            { value: "telephone", count: 15044 }
          ],
          nonEmptyCount: 41188,
          dominanceRatio: 26144 / 41188,
          profiledRowCount: 41188,
          profilingScope: "full"
        },
        y: {
          name: "y",
          dataType: "string",
          distinctCount: 2,
          nullPercent: 0,
          topValues: ["no", "yes"],
          topValueCounts: [
            { value: "no", count: 36548 },
            { value: "yes", count: 4640 }
          ],
          nonEmptyCount: 41188,
          dominanceRatio: 36548 / 41188,
          profiledRowCount: 41188,
          profilingScope: "full"
        }
      }
    });

    const contactSignal = result.signals.find(signal => signal.id === "engagement.contact_channel");
    expect(contactSignal?.health.distinctCount).toBe(2);
    expect(contactSignal?.health.topValues.map(value => value.value)).toEqual(["cellular", "telephone"]);
    expect(contactSignal?.usableForDefaultQuestion).toBe(true);
    expect(questionIds(result)).toContain("engagement_by_contact_channel");
    expect(result.questions.find(question => question.id === "engagement_by_contact_channel")?.action?.dimensions).toEqual(["contact"]);
  });

  it("treats wide public indicator datasets as indicators, not revenue or employee activity", () => {
    const result = createUnderstandingCoreResult(input(
      [
        "Country Name",
        "Date",
        "Business: Internet users (per 100 people)",
        "Health: Health expenditure, total (% GDP)",
        "Population: Total (count)"
      ],
      makeRows(120, index => ({
        "Country Name": ["Vietnam", "Thailand", "Indonesia", "Malaysia"][index % 4],
        Date: 36526 + index,
        "Business: Internet users (per 100 people)": 10 + (index % 80),
        "Health: Health expenditure, total (% GDP)": 5 + (index % 8),
        "Population: Total (count)": 1000000 + index * 1000
      }))
    ));

    const signalIds = result.signals.map(signal => `${signal.id}:${signal.physicalColumn}`);
    expect(signalIds).toContain("indicator.metric:Business: Internet users (per 100 people)");
    expect(signalIds).toContain("indicator.metric:Health: Health expenditure, total (% GDP)");
    expect(result.signals.some(signal => signal.id === "money.revenue" && signal.physicalColumn.includes("Health expenditure"))).toBe(false);
    expect(result.signals.some(signal => signal.id === "entity.employee" && signal.physicalColumn.includes("Internet users"))).toBe(false);
    expect(questionIds(result).slice(0, 4)).toContain("indicator_over_time");
    expect(questionIds(result).slice(0, 4)).toContain("indicator_by_country_or_region");
    expect(result.questions.find(question => question.id === "indicator_over_time")?.action?.measureAggregations).toEqual({
      "Business: Internet users (per 100 people)": "AVG"
    });
  });

  it("does not classify Postal Code as COD money in retail order exports", () => {
    const result = createUnderstandingCoreResult(input(
      ["Order Date", "Postal Code", "Region", "Category", "Sales", "Quantity", "Discount", "Profit"],
      makeRows(80, index => ({
        "Order Date": 40548 + index,
        "Postal Code": 90000 + index,
        Region: ["West", "East", "South", "Central"][index % 4],
        Category: ["Furniture", "Office Supplies", "Technology"][index % 3],
        Sales: 100 + index * 3,
        Quantity: 1 + (index % 5),
        Discount: 0,
        Profit: 20 + index
      }))
    ));

    expect(result.signals.some(signal => signal.family === "money" && signal.physicalColumn === "Postal Code")).toBe(false);
    expect(result.signals.some(signal => signal.id === "money.revenue" && signal.physicalColumn === "Sales")).toBe(true);
    expect(result.questions.find(question => question.id === "money_over_time")?.action?.measures).toEqual(["Sales"]);
    expect(result.questions.find(question => question.id === "money_over_time")?.action?.measureAggregations).toEqual({
      Sales: "SUM"
    });
  });

  it("understands people-team-event datasets without forcing a business-money domain", () => {
    const result = createUnderstandingCoreResult(input(
      ["RoundID", "MatchID", "Team Initials", "Coach Name", "Line-up", "Shirt Number", "Player Name", "Position", "Event"],
      makeRows(120, index => ({
        RoundID: 201 + (index % 4),
        MatchID: 1000 + Math.floor(index / 22),
        "Team Initials": ["FRA", "MEX", "BRA", "ARG"][index % 4],
        "Coach Name": ["Coach A", "Coach B", "Coach C", "Coach D"][index % 4],
        "Line-up": index % 11 === 0 ? "S" : "N",
        "Shirt Number": 1 + (index % 23),
        "Player Name": `Player ${index % 80}`,
        Position: ["GK", "DF", "MF", "FW"][index % 4],
        Event: index % 15 === 0 ? "G40'" : ""
      }))
    ));

    const signalIds = result.signals.map(signal => `${signal.id}:${signal.physicalColumn}`);
    expect(signalIds).toContain("entity.team:Team Initials");
    expect(signalIds).toContain("entity.person:Player Name");
    expect(signalIds).toContain("entity.coach:Coach Name");
    expect(signalIds).toContain("entity.role:Position");
    expect(signalIds).toContain("event.lineup:Line-up");
    expect(signalIds).toContain("event.activity:Event");
    expect(result.signals.some(signal => signal.id === "money.rounding" && signal.physicalColumn === "RoundID")).toBe(false);

    const topQuestions = questionIds(result).slice(0, 4);
    expect(topQuestions).toContain("participation_by_group");
    expect(topQuestions).toContain("role_or_lineup_mix");
    expect(result.questions.find(question => question.id === "participation_by_group")?.action?.measures).toEqual(["record_count"]);
    expect(result.questions.find(question => question.id === "participation_by_group")?.action?.measureAggregations).toEqual({
      record_count: "COUNT"
    });
    expect(questionIds(result)).not.toContain("money_over_time");
  });

  it("treats inventory aging as inventory backlog, not as logistics SLA", () => {
    const result = createUnderstandingCoreResult(input(
      ["Mã phiếu gửi", "Bưu cục hiện tại", "Ngưỡng tồn", "Thời gian tồn", "Tiền thu hộ", "Tổng cước", "Tình trạng tải"],
      makeRows(120, index => ({
        "Mã phiếu gửi": `PG${index}`,
        "Bưu cục hiện tại": `HUB${index % 4}`,
        "Ngưỡng tồn": index % 3 === 0 ? "ton12-24h" : "ton<3h",
        "Thời gian tồn": index % 3 === 0 ? 18 : 2,
        "Tiền thu hộ": 300000 + index * 1000,
        "Tổng cước": 12000 + index,
        "Tình trạng tải": index % 4 === 0 ? "Chưa tải" : "Đã tải"
      }))
    ));

    expect(result.overlays).toContain("inventory");
    const topQuestions = result.questions.slice(0, 4).map(question => question.id);
    expect(topQuestions).toContain("inventory_aging_backlog");
    expect(questionIds(result)).toContain("inventory_value_exposure");
    expect(result.questions.find(question => question.id === "inventory_value_exposure")?.action?.dimensions).toContain("Bưu cục hiện tại");
    expect(questionIds(result)).not.toContain("sla_by_route");
  });

  it("never treats a numeric shipment identifier as an additive measure", () => {
    const result = createUnderstandingCoreResult(input(
      ["Ngày Báo Cáo", "Mã Phiếu Gửi", "Trạng Thái", "Bưu Cục Hiện Tại", "Mã Dịch vụ", "Ngày Tạo Đơn", "Tiền COD", "Trọng lượng", "Tiền Cước"],
      makeRows(120, index => ({
        "Ngày Báo Cáo": "2025-02-08",
        "Mã Phiếu Gửi": 1770239946411 + index,
        "Trạng Thái": index % 4 === 0 ? "Chưa kết nối" : "Đang xử lý",
        "Bưu Cục Hiện Tại": `HUB-${index % 5}`,
        "Mã Dịch vụ": ["LCOD", "VTK", "VCN"][index % 3],
        "Ngày Tạo Đơn": `2025-02-${String((index % 7) + 1).padStart(2, "0")}`,
        "Tiền COD": 100000 + index * 1000,
        "Trọng lượng": 500 + index,
        "Tiền Cước": 12000 + index * 10
      }))
    ));

    expect(result.signals.some(signal => signal.id === "document.shipment" && signal.physicalColumn === "Mã Phiếu Gửi")).toBe(true);
    expect(result.signals.filter(signal => signal.physicalColumn === "Mã Phiếu Gửi" && signal.role === "measure")
      .every(signal => signal.usableForDefaultQuestion === false)).toBe(true);
    expect(result.actions.flatMap(action => action.measures)).not.toContain("Mã Phiếu Gửi");
    expect(result.questions.find(question => question.id === "money_over_time")?.action?.measures).not.toEqual(["Mã Phiếu Gửi"]);
    expect(result.signals.some(signal => signal.id === "money.cod" && signal.physicalColumn === "Tiền COD" && signal.usableForDefaultQuestion)).toBe(true);
    expect(result.signals.some(signal => signal.id === "money.fee" && signal.physicalColumn === "Tiền Cước" && signal.usableForDefaultQuestion)).toBe(true);
    expect(result.signals.some(signal => signal.id === "status.delivery" && signal.physicalColumn === "Huyện Nhận")).toBe(false);
    expect(result.questions.find(question => question.id === "shipment_backlog_by_status")?.action?.dimensions).toEqual(["Trạng Thái"]);
    expect(result.questions.find(question => question.id === "shipment_backlog_by_status")?.action?.measures).toEqual(["record_count"]);
    expect(result.questions.find(question => question.id === "shipment_backlog_by_location")?.action?.dimensions).toEqual(["Bưu Cục Hiện Tại"]);
    const adapted = adaptCoreToUnderstandingNext(result);
    expect(adapted.recommendedQuestions.find(question => question.id === "money_over_time")?.domain).toBe("revenue");
    expect(adapted.recommendedQuestions.find(question => question.id === "delivery_completion_mix")?.domain).toBe("operations");
  });

  it("puts data quality review first for dirty manual exports", () => {
    const result = createUnderstandingCoreResult(input(
      ["Date", "AREA CLASS", "__PowerAppsId__", "NOTE", "Amount"],
      makeRows(20, index => ({
        Date: 43738 + index,
        "AREA CLASS": index % 2 === 0 ? "#REF!" : "North",
        "__PowerAppsId__": `a886d124-31d9-4a9a-a3e2-${String(index).padStart(12, "0")}`,
        NOTE: index % 3 === 0 ? "paid 120,000 cash" : "normal",
        Amount: 1000 + index
      }))
    ));

    expect(result.overlays).toContain("dirty_manual");
    expect(result.questions[0].id).toBe("quality_review_before_analysis");
    expect(result.questions[0].action?.actionKind).toBe("data_quality_review");
  });

  it("recognizes abbreviated ERP customer, area, warehouse, employee, order, and Excel-date fields without treating technical columns as analysis dimensions", () => {
    const columns = ["DATE", "WHA. ID", "ORD. TITLE", "ORD. CODE", "CUST. NAME", "AREA", "AREA ID", "AREA CLASS", "CHARGE", "MET. ID", "EMP. ID", "__PowerAppsId__"];
    const rows = makeRows(120, index => ({
      DATE: 43738 + (index % 26),
      "WHA. ID": index % 3 === 0 ? "Q12" : "BT",
      "ORD. TITLE": ["ATK", "NNQT", "RD"][index % 3],
      "ORD. CODE": `ORD-${1000 + index}`,
      "CUST. NAME": `Customer ${index % 24}`,
      AREA: `Q${(index % 12) + 1}`,
      "AREA ID": `BTQ${(index % 12) + 1}`,
      "AREA CLASS": "#REF!",
      CHARGE: index % 40 === 0 ? 15000 : 10000,
      "MET. ID": ["MOTO", "PAY", "PAY+"][index % 3],
      "EMP. ID": `EMP-${index % 14}`,
      "__PowerAppsId__": `powerapps-${index}`,
    }));
    const result = createUnderstandingCoreResult(input(columns, rows));

    expect(result.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "time.transaction_date", physicalColumn: "DATE", role: "time" }),
      expect.objectContaining({ id: "location.warehouse", physicalColumn: "WHA. ID" }),
      expect.objectContaining({ id: "document.order", physicalColumn: "ORD. CODE", role: "identifier" }),
      expect.objectContaining({ id: "entity.customer", physicalColumn: "CUST. NAME" }),
      expect.objectContaining({ id: "location.region", physicalColumn: "AREA" }),
      expect.objectContaining({ id: "entity.employee", physicalColumn: "EMP. ID" }),
      expect.objectContaining({ id: "quality.technical_column", physicalColumn: "__PowerAppsId__" }),
    ]));
    expect(result.questions.find(question => question.id === "customer_activity_volume")?.action).toMatchObject({ dimensions: ["CUST. NAME"], measures: ["record_count"] });
    expect(result.questions.find(question => question.id === "operational_volume_by_location")?.action).toMatchObject({ dimensions: ["WHA. ID"], measures: ["record_count"] });
    expect(result.questions.find(question => question.id === "operational_workload_by_actor")?.action).toMatchObject({ dimensions: ["EMP. ID"], measures: ["record_count"] });
    expect(result.questions[0].id).not.toBe("quality_review_before_analysis");
    expect(result.actions.flatMap(action => action.measures)).not.toContain("DATE");
    expect(result.actions.filter(action => action.actionKind !== "data_quality_review").flatMap(action => action.dimensions)).not.toContain("__PowerAppsId__");
  });

  it("is invariant to file names and sheet names for the same columns and values", () => {
    const columns = ["Ngày xuất", "Mã kho", "Tổng tiền", "Tiền mặt"];
    const rows = makeRows(40, index => ({
      "Ngày xuất": `2024-12-${String((index % 20) + 1).padStart(2, "0")}`,
      "Mã kho": `K${index % 4}`,
      "Tổng tiền": 200000 + index,
      "Tiền mặt": 100000
    }));

    const a = createUnderstandingCoreResult({ fileNames: ["BHX_PHIEUXUAT.xlsx"], sheetNames: ["A"], columns, rows });
    const b = createUnderstandingCoreResult({ fileNames: ["totally-random-medical-export.xlsx"], sheetNames: ["Random"], columns, rows });

    expect(a.signals.map(signal => signal.id).sort()).toEqual(b.signals.map(signal => signal.id).sort());
    expect(a.questions.map(question => question.id)).toEqual(b.questions.map(question => question.id));
  });

  it("does not turn a reporting range embedded in a KPI header into a row-level time axis", () => {
    const columns = ["Xếp hạng", "MSNV Quản lý", "Họ tên Quản lý", "Tổng sao từ T6/2016 đến T05/2017", "Trung bình điểm 4 tiêu chí", "Ghi chú"];
    const rows = makeRows(40, index => ({
      "Xếp hạng": index + 1,
      "MSNV Quản lý": `QL-${index + 1}`,
      "Họ tên Quản lý": `Quản lý ${index + 1}`,
      "Tổng sao từ T6/2016 đến T05/2017": 90 - index,
      "Trung bình điểm 4 tiêu chí": 9 - index / 20,
      "Ghi chú": index % 2 ? "Đạt" : "Cần theo dõi",
    }));
    const result = createUnderstandingCoreResult(input(columns, rows));

    expect(result.signals.filter(signal => signal.role === "time" && signal.usableForDefaultQuestion)).toHaveLength(0);
    expect(result.questions.find(question => question.id === "indicator_over_time")?.action).toBeUndefined();
    expect(result.questions.find(question => question.id === "performance_indicator_by_owner_or_team")?.action).toBeDefined();
    expect(result.questions.find(question => question.id === "performance_indicator_by_owner_or_team")?.action?.dimensions).toEqual(["Họ tên Quản lý"]);
    expect(result.questions.find(question => question.id === "secondary_indicator_by_owner_or_team")?.action).toBeDefined();
  });

  it("offers value and activity-volume views for item-level money data", () => {
    const columns = ["Sản phẩm", "Doanh thu"];
    const rows = makeRows(40, index => ({
      "Sản phẩm": `Mặt hàng ${index % 5}`,
      "Doanh thu": 100000 + index * 1000,
    }));
    const result = createUnderstandingCoreResult(input(columns, rows));

    expect(result.questions.find(question => question.id === "item_value")?.action?.measures).toEqual(["Doanh thu"]);
    expect(result.questions.find(question => question.id === "item_activity_volume")?.action).toMatchObject({
      dimensions: ["Sản phẩm"],
      measures: ["record_count"],
    });
    const adapted = adaptCoreToUnderstandingNext(result);
    expect(adapted.recommendedQuestions.find(question => question.id === "item_activity_volume")?.domain).toBe("revenue");
  });

  it("creates reusable route and vehicle delivery comparisons from operational semantics", () => {
    const columns = ["Ngày báo cáo", "Mã tải kiện", "Xe đến đúng hẹn", "Tuyến xe", "Chuyến xe", "Lái xe", "Thời gian chờ"];
    const rows = makeRows(80, index => ({
      "Ngày báo cáo": `2024-12-${String((index % 20) + 1).padStart(2, "0")}`,
      "Mã tải kiện": `TK-${index + 1}`,
      "Xe đến đúng hẹn": index % 5 === 0 ? "Không đúng hẹn" : "Đúng hẹn",
      "Tuyến xe": `Tuyến ${index % 6}`,
      "Chuyến xe": `Xe ${index % 8}`,
      "Lái xe": `Tài xế ${index % 10}`,
      "Thời gian chờ": 10 + (index % 15),
    }));
    const result = createUnderstandingCoreResult(input(columns, rows));

    expect(result.signals.some(signal => signal.id === "entity.vehicle" && signal.physicalColumn === "Chuyến xe")).toBe(true);
    expect(result.questions.find(question => question.id === "delivery_volume_by_route_or_resource")?.action?.dimensions).toEqual(["Tuyến xe"]);
    expect(result.questions.find(question => question.id === "delivery_on_time_by_route_or_resource")?.action?.dimensions).toEqual(["Tuyến xe"]);
    const adapted = adaptCoreToUnderstandingNext(result);
    expect(adapted.recommendedQuestions.find(question => question.id === "delivery_on_time_by_route_or_resource")?.domain).toBe("performance");
  });

  it("creates reusable catalog breakdowns from product-master semantics", () => {
    const columns = ["SKU", "Product Name", "Category", "Brand", "Supplier"];
    const rows = makeRows(60, index => ({
      SKU: `SKU-${index + 1}`,
      "Product Name": `Product ${index + 1}`,
      Category: `Category ${index % 5}`,
      Brand: `Brand ${index % 4}`,
      Supplier: `Supplier ${index % 3}`,
    }));
    const result = createUnderstandingCoreResult(input(columns, rows));

    expect(result.signals.some(signal => signal.id === "item.category" && signal.physicalColumn === "Category")).toBe(true);
    expect(result.signals.some(signal => signal.id === "item.brand" && signal.physicalColumn === "Brand")).toBe(true);
    expect(result.questions.find(question => question.id === "catalog_composition_by_category")?.action?.dimensions).toEqual(["Category"]);
    expect(result.questions.find(question => question.id === "catalog_composition_by_brand_or_supplier")?.action?.dimensions).toEqual(["Brand"]);
    expect(result.questions.find(question => question.id === "catalog_records_by_item")?.action?.dimensions).toEqual(["Product Name"]);
    const adapted = adaptCoreToUnderstandingNext(result);
    expect(adapted.recommendedQuestions.find(question => question.id === "catalog_composition_by_category")?.domain).toBe("inventory");
  });
});
