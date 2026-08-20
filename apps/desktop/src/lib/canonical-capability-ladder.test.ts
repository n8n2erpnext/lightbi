import { describe, expect, it } from "vitest";
import { projectCanonicalDomainPerspectives } from "./canonical-source-candidate-projection";
import { getOrBuildCanonicalConsumerArtifact } from "./understanding-core/canonical-consumer-boundary";
import { projectCanonicalCapabilityLadder } from "./canonical-capability-ladder";

describe("canonical capability ladder", () => {
  it("keeps safe universal analysis available when a domain pack has no governed metric", () => {
    const columns = ["contact_date", "customer_id", "branch", "campaign", "duration", "status", "amount", "subscribed"];
    const rows = [
      { contact_date: "2026-01-01", customer_id: "C1", branch: "North", campaign: "A", duration: 30, status: "contacted", amount: 1200, subscribed: "yes" },
      { contact_date: "2026-01-02", customer_id: "C2", branch: "South", campaign: "B", duration: 10, status: "pending", amount: 900, subscribed: "no" },
      { contact_date: "2026-01-03", customer_id: "C3", branch: "North", campaign: "A", duration: 45, status: "converted", amount: 1500, subscribed: "yes" },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({
      datasetId: "held-out-bank-campaign",
      sourceKind: "local_file",
      sourceLabel: "held-out.xlsx",
      columns,
      rows,
      sourceRowCount: rows.length,
    });
    const result = projectCanonicalCapabilityLadder(
      artifact,
      projectCanonicalDomainPerspectives(artifact),
      { sourceKind: "local_file", sourceLabel: "held-out.xlsx", fileNames: ["held-out.xlsx"], columns, rows, sourceRowCount: rows.length },
    );

    expect(result.understanding.availableActions.some((action) => action.id.startsWith("universal:"))).toBe(true);
    expect(result.understanding.recommendedQuestions.filter((question) => question.executionScope !== "not_supported").length).toBeGreaterThan(2);
    expect(result.perspectives.filter((perspective) => perspective.state === "governed_action_available").length).toBeGreaterThan(1);
    expect(result.perspectives.some((perspective) => perspective.perspectiveId === "customer")).toBe(true);
  });

  it("does not use filenames to activate capability", () => {
    const columns = ["event_date", "route", "driver", "delivery_status", "waiting_time"];
    const rows = [
      { event_date: "2026-02-01", route: "R1", driver: "D1", delivery_status: "late", waiting_time: 40 },
      { event_date: "2026-02-02", route: "R2", driver: "D2", delivery_status: "on time", waiting_time: 5 },
    ];
    const build = (sourceLabel: string) => {
      const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: sourceLabel, sourceKind: "local_file", sourceLabel, columns, rows, sourceRowCount: rows.length });
      return projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel, columns, rows, sourceRowCount: rows.length });
    };
    const first = build("arbitrary-a.xlsx");
    const second = build("unrelated-b.csv");
    expect(first.understanding.availableActions.map((action) => action.label)).toEqual(second.understanding.availableActions.map((action) => action.label));
  });

  it("does not mistake generic indicator quantities for stock movement", () => {
    const columns = ["country", "report_date", "indicator", "value", "population"];
    const rows = [
      { country: "VN", report_date: "2024-01-01", indicator: "GDP growth", value: 6.1, population: 100_000_000 },
      { country: "TH", report_date: "2024-01-01", indicator: "GDP growth", value: 2.8, population: 71_000_000 },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: "indicators", sourceKind: "local_file", sourceLabel: "indicators.xlsx", columns, rows, sourceRowCount: rows.length });
    const result = projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel: "indicators.xlsx", columns, rows, sourceRowCount: rows.length });

    expect(result.understanding.availableActions.some((action) => action.questionId.includes("stock_movement"))).toBe(false);
    expect(result.perspectives.find((perspective) => perspective.perspectiveId === "inventory")?.state).not.toBe("governed_action_available");
  });

  it("ranks shipment operations ahead of incidental quantity domains", () => {
    const columns = ["shipment_id", "delivery_date", "route", "vehicle", "driver", "delivery_status", "weight"];
    const rows = [
      { shipment_id: "S1", delivery_date: "2026-01-01", route: "R1", vehicle: "V1", driver: "D1", delivery_status: "late", weight: 120 },
      { shipment_id: "S2", delivery_date: "2026-01-02", route: "R2", vehicle: "V2", driver: "D2", delivery_status: "on time", weight: 90 },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: "shipments", sourceKind: "local_file", sourceLabel: "shipments.csv", columns, rows, sourceRowCount: rows.length });
    const result = projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel: "shipments.csv", columns, rows, sourceRowCount: rows.length });

    expect(result.perspectives.find((perspective) => perspective.state === "governed_action_available")?.perspectiveId).toBe("operations");
    expect(result.understanding.availableActions.some((action) => action.questionId.includes("stock_movement"))).toBe(false);
  });

  it("keeps explicit stock evidence ranked as inventory", () => {
    const columns = ["sku", "warehouse", "stock_status", "stock_qty", "snapshot_date"];
    const rows = [
      { sku: "A", warehouse: "W1", stock_status: "available", stock_qty: 12, snapshot_date: "2026-01-01" },
      { sku: "B", warehouse: "W2", stock_status: "blocked", stock_qty: 4, snapshot_date: "2026-01-01" },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: "inventory", sourceKind: "local_file", sourceLabel: "inventory.csv", columns, rows, sourceRowCount: rows.length });
    const result = projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel: "inventory.csv", columns, rows, sourceRowCount: rows.length });

    expect(result.perspectives.find((perspective) => perspective.state === "governed_action_available")?.perspectiveId).toBe("inventory");
    expect(result.understanding.availableActions.some((action) => action.questionId.includes("stock_movement"))).toBe(true);
  });

  it("ranks explicit financial statements ahead of generic performance signals", () => {
    const columns = ["period", "revenue_total", "cost_total", "profit_net", "margin_pct", "expense_misc", "discount_amt", "purchase_cost_amt", "operational_cost_amt", "supplier_cost_amt"];
    const rows = [
      { period: "2023-Q1", revenue_total: 150000, cost_total: 100000, profit_net: 50000, margin_pct: 33.3, expense_misc: 5000, discount_amt: 2000, purchase_cost_amt: 60000, operational_cost_amt: 35000, supplier_cost_amt: 20000 },
      { period: "2023-Q2", revenue_total: 160000, cost_total: 105000, profit_net: 55000, margin_pct: 34.3, expense_misc: 5200, discount_amt: 2500, purchase_cost_amt: 62000, operational_cost_amt: 37800, supplier_cost_amt: 21000 },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: "finance", sourceKind: "local_file", sourceLabel: "arbitrary.csv", columns, rows, sourceRowCount: rows.length });
    const result = projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel: "arbitrary.csv", columns, rows, sourceRowCount: rows.length });

    expect(
      result.perspectives.find((perspective) => perspective.state === "governed_action_available")?.perspectiveId,
      JSON.stringify({ signals: result.understanding.signals.map((signal) => signal.canonicalId), perspectives: result.perspectives }),
    ).toBe("finance");
  });

  it("ranks localized financial statements by semantic evidence", () => {
    const columns = ["kỳ", "doanh thu", "chi phí", "lợi nhuận", "biên LN", "chi tiêu", "chiết khấu", "giá mua", "cp hoạt động", "cp ncc"];
    const rows = [
      { "kỳ": "2023-Q1", "doanh thu": 150000, "chi phí": 100000, "lợi nhuận": 50000, "biên LN": 33.3, "chi tiêu": 5000, "chiết khấu": 2000, "giá mua": 60000, "cp hoạt động": 35000, "cp ncc": 20000 },
      { "kỳ": "2023-Q2", "doanh thu": 160000, "chi phí": 105000, "lợi nhuận": 55000, "biên LN": 34.3, "chi tiêu": 5200, "chiết khấu": 2500, "giá mua": 62000, "cp hoạt động": 37800, "cp ncc": 21000 },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: "localized-finance", sourceKind: "local_file", sourceLabel: "localized.csv", columns, rows, sourceRowCount: rows.length });
    const result = projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel: "localized.csv", columns, rows, sourceRowCount: rows.length });

    expect(
      result.perspectives.find((perspective) => perspective.state === "governed_action_available")?.perspectiveId,
      JSON.stringify({ signals: result.understanding.signals.map((signal) => signal.canonicalId), perspectives: result.perspectives }),
    ).toBe("finance");
  });

  it("ranks a localized sales issue document by its commercial evidence", () => {
    const columns = ["Mã phiếu xuất", "Ngày xuất", "Mã kho xuất", "Tên kho xuất", "Loại phiếu xuất", "Tổng tiền", "Tiền phải thu", "Tiền mặt khách đưa", "Tiền cà thẻ", "Phí giao hàng", "Khách hàng", "Mã nhân viên xuất", "Nhân viên xuất"];
    const rows = [
      { "Mã phiếu xuất": "PX1", "Ngày xuất": "2/2/24", "Mã kho xuất": "K1", "Tên kho xuất": "Kho A", "Loại phiếu xuất": "Bán", "Tổng tiền": 517, "Tiền phải thu": 517, "Tiền mặt khách đưa": 517, "Tiền cà thẻ": 0, "Phí giao hàng": 20, "Khách hàng": "C1", "Mã nhân viên xuất": "NV1", "Nhân viên xuất": "An" },
      { "Mã phiếu xuất": "PX2", "Ngày xuất": "3/2/24", "Mã kho xuất": "K2", "Tên kho xuất": "Kho B", "Loại phiếu xuất": "Bán", "Tổng tiền": 534, "Tiền phải thu": 534, "Tiền mặt khách đưa": 0, "Tiền cà thẻ": 534, "Phí giao hàng": 15, "Khách hàng": "C2", "Mã nhân viên xuất": "NV2", "Nhân viên xuất": "Bình" },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: "localized-sales", sourceKind: "local_file", sourceLabel: "document.xlsx", columns, rows, sourceRowCount: rows.length });
    const result = projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel: "document.xlsx", columns, rows, sourceRowCount: rows.length });

    expect(
      result.perspectives.find((perspective) => perspective.state === "governed_action_available")?.perspectiveId,
      JSON.stringify({ signals: result.understanding.signals.map((signal) => signal.canonicalId), perspectives: result.perspectives }),
    ).toBe("revenue");
  });

  it("offers multiple inventory analyses for a localized product catalog", () => {
    const columns = ["Mã sản phẩm", "Tên sản phẩm", "Nhóm sản phẩm", "Đơn vị tính", "Barcode"];
    const rows = [
      { "Mã sản phẩm": "P1", "Tên sản phẩm": "Cá A", "Nhóm sản phẩm": "Hải sản", "Đơn vị tính": "Kg", Barcode: "1001" },
      { "Mã sản phẩm": "P2", "Tên sản phẩm": "Rau B", "Nhóm sản phẩm": "Rau", "Đơn vị tính": "Gói", Barcode: "1002" },
      { "Mã sản phẩm": "P3", "Tên sản phẩm": "Cá C", "Nhóm sản phẩm": "Hải sản", "Đơn vị tính": "Gói", Barcode: "1003" },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: "localized-catalog", sourceKind: "local_file", sourceLabel: "catalog.xlsx", columns, rows, sourceRowCount: rows.length });
    const result = projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel: "catalog.xlsx", columns, rows, sourceRowCount: rows.length });
    const inventory = result.perspectives.find((perspective) => perspective.perspectiveId === "inventory");

    expect(inventory?.state).toBe("governed_action_available");
    expect(
      inventory?.actionCandidateIds.length,
      JSON.stringify({ signals: result.understanding.signals.map((signal) => ({ id: signal.canonicalId, column: signal.physicalColumn })), inventory }),
    ).toBeGreaterThan(2);
    const categoryAction = result.understanding.availableActions.find((action) => action.id.endsWith("catalog_composition_by_category"));
    const itemAction = result.understanding.availableActions.find((action) => action.id.endsWith("catalog_records_by_item"));
    expect(categoryAction?.dimensions).toEqual(["Nhóm sản phẩm"]);
    expect(itemAction?.dimensions).toEqual(["Tên sản phẩm"]);
  });

  it("offers management workload and performance without relying on a filename", () => {
    const columns = ["manager_id", "manager_name", "rank", "quality_score", "average_score"];
    const rows = [
      { manager_id: "M1", manager_name: "A", rank: 1, quality_score: 94, average_score: 4.7 },
      { manager_id: "M2", manager_name: "B", rank: 2, quality_score: 88, average_score: 4.4 },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: "management", sourceKind: "local_file", sourceLabel: "arbitrary.xlsx", columns, rows, sourceRowCount: rows.length });
    const result = projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel: "arbitrary.xlsx", columns, rows, sourceRowCount: rows.length });

    expect(result.perspectives.filter((perspective) => perspective.state === "governed_action_available").map((perspective) => perspective.perspectiveId)).toEqual(expect.arrayContaining(["operations", "performance"]));
  });

  it("turns wide public indicators into finance, operations, and performance views", () => {
    const columns = ["Country Name", "Date", "Transit: Railways, (million passenger-km)", "Health: Life expectancy at birth, total (years)", "Population: Total (count)", "Finance: GDP (current US$)"];
    const rows = [
      { "Country Name": "A", Date: "2024-01-01", "Transit: Railways, (million passenger-km)": 12, "Health: Life expectancy at birth, total (years)": 71, "Population: Total (count)": 10_000, "Finance: GDP (current US$)": 1_000_000 },
      { "Country Name": "B", Date: "2024-02-01", "Transit: Railways, (million passenger-km)": 18, "Health: Life expectancy at birth, total (years)": 74, "Population: Total (count)": 12_000, "Finance: GDP (current US$)": 1_400_000 },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: "public", sourceKind: "local_file", sourceLabel: "public.xlsx", columns, rows, sourceRowCount: rows.length });
    const result = projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel: "public.xlsx", columns, rows, sourceRowCount: rows.length });
    const ready = result.perspectives.filter((perspective) => perspective.state === "governed_action_available").map((perspective) => perspective.perspectiveId);

    expect(ready).toEqual(expect.arrayContaining(["finance", "operations", "performance"]));
    expect(result.understanding.availableActions.some((action) => action.questionId.includes("stock_movement"))).toBe(false);
  });

  it("offers governed customer geography and profile analyses without grouping by customer keys", () => {
    const columns = ["customer_key", "name", "gender", "city", "state_code", "state", "zip_code", "country", "continent", "birthday"];
    const rows = Array.from({ length: 240 }, (_, index) => ({
      customer_key: `C${String(index + 1).padStart(4, "0")}`,
      name: `Customer ${index + 1}`,
      gender: index % 2 === 0 ? "Female" : "Male",
      city: ["Hanoi", "Da Nang", "Ho Chi Minh City"][index % 3],
      state_code: ["HN", "DN", "HCM"][index % 3],
      state: ["Ha Noi", "Da Nang", "Ho Chi Minh"][index % 3],
      zip_code: ["100000", "500000", "700000"][index % 3],
      country: "Vietnam",
      continent: "Asia",
      birthday: `19${70 + (index % 25)}-01-01`,
    }));
    const build = (sourceKind: "local_file" | "database_table") => {
      const artifact = getOrBuildCanonicalConsumerArtifact({
        datasetId: `customer-master-${sourceKind}`,
        sourceKind,
        sourceLabel: sourceKind === "local_file" ? "customers.json" : "retails.customers",
        columns,
        rows,
        sourceRowCount: rows.length,
      });
      return projectCanonicalCapabilityLadder(
        artifact,
        projectCanonicalDomainPerspectives(artifact),
        { sourceKind, sourceLabel: "customers", columns, rows, sourceRowCount: rows.length },
      );
    };

    const local = build("local_file");
    const database = build("database_table");
    const localCustomer = local.perspectives.find((perspective) => perspective.perspectiveId === "customer");
    const customerActions = local.understanding.availableActions.filter((action) =>
      action.questionId.includes("customer_geographic_distribution") || action.questionId.includes("customer_profile_distribution"),
    );

    expect(localCustomer?.state).toBe("governed_action_available");
    expect(localCustomer?.actionCandidateIds.length).toBeGreaterThanOrEqual(2);
    expect(customerActions.map((action) => action.dimensions[0])).toEqual(expect.arrayContaining(["city", "gender"]));
    expect(customerActions.flatMap((action) => action.dimensions)).not.toContain("customer_key");
    expect(local.understanding.signals.some((signal) => signal.canonicalId === "location.state_province" && signal.physicalColumn === "state_code")).toBe(true);
    expect(local.understanding.signals.some((signal) => signal.canonicalId === "location.postal_code" && signal.physicalColumn === "zip_code")).toBe(true);
    expect(local.understanding.signals.find((signal) => signal.canonicalId === "status.lifecycle" && signal.physicalColumn === "state")?.usableForDefaultQuestion).toBe(false);
    expect(local.perspectives.find((perspective) => perspective.state === "governed_action_available")?.perspectiveId).toBe("customer");
    expect(database.understanding.availableActions.map((action) => action.questionId)).toEqual(local.understanding.availableActions.map((action) => action.questionId));
  });
});
