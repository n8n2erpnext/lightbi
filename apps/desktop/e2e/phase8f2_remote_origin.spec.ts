import { expect, test, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

const ORIGIN = "http://100.94.184.141:5173";

function csv(headers: string[], rows: Array<Array<string | number>>): Buffer {
  return Buffer.from([headers.join(","), ...rows.map((row) => row.join(","))].join("\n"));
}

function rows(count: number, make: (index: number) => Array<string | number>): Array<Array<string | number>> {
  return Array.from({ length: count }, (_, index) => make(index));
}

function xlsx(name: string, headers: string[], values: Array<Array<string | number>>) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ...values]), "Data");
  return { name, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer };
}

function sixSyntheticSources() {
  const salesRows = (month: "05" | "06") => rows(40, (index) => [
    `ORD-${month}-${index + 1}`, `2026-${month}-${String((index % 28) + 1).padStart(2, "0")}`,
    `SKU-${index % 8}`, 1_000_000 + index * 10_000, 1 + index % 4, index % 2 ? "Cash" : "Card", `EMP-${index % 5}`,
  ]);
  const accountingRows = (month: "05" | "06") => rows(40, (index) => [
    `ORD-${month}-${index + 1}`, `2026-${month}-${String((index % 28) + 1).padStart(2, "0")}`,
    1_000_000 + index * 10_000, 650_000 + index * 5_000, 350_000 + index * 5_000,
  ]);
  const logisticsRows = (month: "05" | "06") => rows(40, (index) => [
    `SHP-${month}-${index + 1}`, `2026-${month}-${String((index % 28) + 1).padStart(2, "0")}`,
    index % 5 ? "Delivered" : "Retry", 50_000 + index * 100, `CAR-${index % 3}`, 1,
  ]);
  return [
    xlsx("source-a.xlsx", ["Order", "Order Date", "Product", "Revenue", "Sold Qty", "Payment Method", "Salesperson"], salesRows("05")),
    xlsx("source-b.xlsx", ["Order", "Order Date", "Product", "Revenue", "Sold Qty", "Payment Method", "Salesperson"], salesRows("06")),
    { name: "source-c.csv", mimeType: "text/csv", buffer: csv(["Order", "Posting Date", "Invoice Total", "Total Cost", "Gross Profit"], accountingRows("05")) },
    { name: "source-d.csv", mimeType: "text/csv", buffer: csv(["Order", "Posting Date", "Invoice Total", "Total Cost", "Gross Profit"], accountingRows("06")) },
    { name: "source-e.csv", mimeType: "text/csv", buffer: csv(["Shipment", "time_period", "Delivery Status", "Delivery Fee", "Carrier", "Delivered Qty"], logisticsRows("05")) },
    { name: "source-f.csv", mimeType: "text/csv", buffer: csv(["Shipment", "time_period", "Delivery Status", "Delivery Fee", "Carrier", "Delivered Qty"], logisticsRows("06")) },
  ];
}

function captureBrowserFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`pageerror:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console:${message.text()}`);
  });
  page.on("requestfailed", (request) => failures.push(`network:${request.url()}:${request.failure()?.errorText ?? "failed"}`));
  return failures;
}

test.describe("Phase 8F.2 actual remote origin", () => {
  test.setTimeout(180_000);

  test("projects six canonical sources into explicit candidates and governed bundles", async ({ page }) => {
    const failures = captureBrowserFailures(page);
    await page.goto(ORIGIN);
    await page.locator('input[type="file"]').setInputFiles(sixSyntheticSources());
    const review = page.getByTestId("canonical-multisource-review");
    await expect(review).toBeVisible({ timeout: 120_000 });
    await expect(review.getByText("LightBI found 6 sources")).toBeVisible();
    await expect(review.getByText("Suggested by LightBI: sales")).toHaveCount(2);
    await expect(review.getByText("Suggested by LightBI: accounting")).toHaveCount(2);
    await expect(review.getByText("Suggested by LightBI: logistics")).toHaveCount(2);
    await expect(review.getByTestId("governed-bundle-gross_profit_period")).toHaveCount(2);
    await expect(review.getByTestId("governed-bundle-delivery_source_local")).toHaveCount(2);
    await page.getByTestId("business-perspective-sales_performance").click();
    await expect(review.getByTestId("governed-bundle-revenue_period_comparison")).toBeVisible();
    await expect(review.getByTestId("governed-bundle-revenue_period_comparison")).toContainText("Needs confirmation");
    await expect(review.getByTestId("governed-bundle-revenue_period_comparison")).toContainText("Review bundle");
    await expect(review.locator('input[type="checkbox"]:checked')).toHaveCount(0);
    expect(failures.filter((failure) => /crypto\.subtle|digest|worker|wasm|dynamic import/i.test(failure))).toEqual([]);
  });

  test("executes Logistics June without a remote-origin digest failure", async ({ page }) => {
    const failures = captureBrowserFailures(page);
    await page.goto(ORIGIN);
    const deliveryRows = rows(1_500, (index) => [
      `SHP-${index + 1}`, `2026-06-${String((index % 28) + 1).padStart(2, "0")}`,
      index % 5 ? "Delivered" : "Retry", 50_000 + index, `CAR-${index % 4}`, 1,
    ]);
    const csvText = csv(["Shipment", "time_period", "Delivery Status", "Delivery Fee", "Carrier", "Delivered Qty"], deliveryRows).toString("utf8");
    const result = await page.evaluate(async (text) => {
      const [{ materializeRuntimeDatasetSource }, { browserSha256 }, { executeLocalDuckDB }] = await Promise.all([
        import("/src/lib/full-file-runtime-materializer.ts"),
        import("/src/lib/browser-sha256.ts"),
        import("/src/lib/local-duckdb-executor.ts"),
      ]);
      const file = new File([text], "remote-delivery-source.csv", { type: "text/csv" });
      const fingerprint = await browserSha256(await file.arrayBuffer());
      const binding = {
        datasetId: "remote-delivery",
        sourceId: "remote-delivery:data",
        sourceFingerprint: fingerprint,
        inspectionGeneration: "inspection-1",
        profileGeneration: "profile-1",
      };
      const materialized = await materializeRuntimeDatasetSource({
        kind: "local_files",
        files: [{ file }],
        sourceRowCount: 1_500,
        binding,
      }, undefined, binding);
      const execution = await executeLocalDuckDB({
        runtimePlan: { id: "phase8f2-remote-delivery", requiredColumns: ["Shipment"], warnings: [] } as never,
        safeSqlPreview: {
          id: "phase8f2-remote-delivery-sql",
          sql: "SELECT COUNT(*) AS delivery_count FROM __LIGHTBI_PREVIEW_TABLE__",
        } as never,
        runtimeDatasetSource: {
          kind: "local_files",
          files: [{ file }],
          sourceRowCount: 1_500,
          binding,
        },
        expectedRuntimeBinding: binding,
        rows: [],
      });
      return {
        rowCount: materialized.rowCount,
        fingerprint,
        secureContext: window.isSecureContext,
        subtleAvailable: Boolean(globalThis.crypto?.subtle),
        execution,
      };
    }, csvText);
    expect(result.rowCount).toBe(1_500);
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.secureContext).toBe(false);
    expect(result.execution.status, result.execution.errorMessage).toBe("executed");
    expect(result.execution.executionScope).toBe("full_file");
    expect(result.execution.materializedRowCount).toBe(1_500);
    expect(result.execution.rows[0].delivery_count).toBe(1_500);
    expect(failures.filter((failure) => /crypto\.subtle|reading 'digest'/i.test(failure))).toEqual([]);
  });
});
