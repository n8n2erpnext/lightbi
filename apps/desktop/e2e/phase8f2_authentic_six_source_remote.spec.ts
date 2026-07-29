import { expect, test } from "@playwright/test";
import path from "node:path";

const ORIGIN = "http://100.94.184.141:5173";
const ANCHORS = path.resolve("../../sample-corpus/anchors/1.3.0");
const SIX_ERP_FILES = [
  "Sales_ERP_May_2026.xlsx",
  "Sales_ERP_June_2026.xlsx",
  "Accounting_ERP_May_2026.csv",
  "Accounting_ERP_June_2026.csv",
  "Logistics_ERP_May_2026.csv",
  "Logistics_ERP_June_2026.csv",
].map((name) => path.join(ANCHORS, name));

test("authentic six-source corpus projects canonical roles, periods, and governed bundles on the actual origin", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(ORIGIN);
  await page.locator('input[type="file"]').setInputFiles(SIX_ERP_FILES);
  const review = page.getByTestId("canonical-multisource-review");
  await expect(review).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId("business-perspective-executive_overview")).toBeVisible();
  await page.getByTestId("business-perspective-profitability").click();
  await expect(review.getByTestId("governed-bundle-gross_profit_period").first()).toBeVisible();
  await expect(review.getByText("Suggested by LightBI: sales")).toHaveCount(2);
  await expect(review.getByText("Suggested by LightBI: accounting")).toHaveCount(2);
  await expect(review.getByText("Suggested by LightBI: logistics")).toHaveCount(2);
  await expect(review.getByTestId("governed-bundle-gross_profit_period")).toHaveCount(2);
  await page.getByTestId("business-perspective-fulfillment_operations").click();
  await expect(review.getByTestId("governed-bundle-delivery_source_local").first()).toBeVisible();
  await expect(review.getByTestId("governed-bundle-delivery_source_local")).toHaveCount(2);
  await expect(review.locator('input[type="checkbox"]:checked')).toHaveCount(0);
  await expect(review.getByText("Currency: Missing")).toHaveCount(6);
});

test("authentic six-source journey builds and executes the governed May profitability angle", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(ORIGIN);
  await page.locator('input[type="file"]').setInputFiles(SIX_ERP_FILES);
  const review = page.getByTestId("canonical-multisource-review");
  await expect(review).toBeVisible({ timeout: 120_000 });
  await page.getByTestId("business-perspective-profitability").click();

  const mayBundle = review.getByTestId("governed-bundle-gross_profit_period").filter({ hasText: "2026-05" });
  await expect(mayBundle).toBeVisible();
  await mayBundle.getByRole("button", { name: "Review bundle" }).click();
  await expect(review.locator('input[type="checkbox"]:checked')).toHaveCount(2);
  await expect(review.getByText("Suggested shared identity: OrderID")).toHaveCount(2);

  const selectedSources = review.locator('details:has(input[type="checkbox"]:checked)');
  await expect(selectedSources).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    const source = selectedSources.nth(index);
    await source.locator("summary").click();
    await source.getByRole("button", { name: "Accept suggestions" }).click();
    await source.locator('input[aria-label^="Currency for"]').fill("VND");
  }

  const build = review.getByTestId("build-canonical-multisource");
  await expect(build).toBeEnabled();
  await build.click();
  await expect(page.getByTestId("active-canonical-multisource")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId("active-canonical-multisource")).toContainText("2 independently profiled sources");

  await page.getByTestId("business-perspective-finance").click();
  const grossProfitAnalysis = page.getByTestId(/^canonical-analysis-/).filter({ hasText: /gross profit/i }).first();
  await expect(grossProfitAnalysis).toBeVisible();
  await grossProfitAnalysis.getByRole("button", { name: "Investigate" }).click();
  await expect(page).toHaveURL(/\/investigation$/);
  await expect(page.getByTestId("governed-result-summary")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId("governed-result-summary")).toContainText("gross_profit");
  await expect(page.getByTestId("governed-result-summary")).toContainText("3,075,721,244");
  await expect(page.getByTestId("multisource-result-lineage")).toContainText("1,500 / 1,500 rows");
  const analyzeDeeper = page.getByRole("button", { name: "Analyze deeper" }).first();
  await expect(analyzeDeeper).toBeEnabled();
  await analyzeDeeper.click();
  await expect(page.getByText("Deep BA Analysis")).toBeVisible();
  await expect(page.getByText("Governed analysis scope").first()).toBeVisible();
});
