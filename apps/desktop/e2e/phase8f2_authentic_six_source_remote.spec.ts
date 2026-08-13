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
const JUNE_ERP_FILES = [
  "Sales_ERP_June_2026.xlsx",
  "Accounting_ERP_June_2026.csv",
  "Logistics_ERP_June_2026.csv",
].map((name) => path.join(ANCHORS, name));

async function importSixSources(page: import("@playwright/test").Page) {
  await page.goto(ORIGIN);
  await page.locator('input[type="file"]').setInputFiles(SIX_ERP_FILES);
  const review = page.getByTestId("canonical-multisource-review");
  await expect(review).toBeVisible({ timeout: 120_000 });
  return review;
}

test("authentic six-source corpus exposes governed cross-source perspectives", async ({ page }) => {
  test.setTimeout(180_000);
  const review = await importSixSources(page);
  const selector = page.getByTestId("canonical-business-perspectives");
  const perspectives = selector.locator('button[data-testid^="business-perspective-"]');

  await expect(perspectives).toHaveCount(8);
  await page.getByTestId("business-perspective-profitability").click();
  await expect(page.getByTestId("analyze-selected-perspective")).toBeEnabled();
  await expect(review.getByLabel("Compare")).toHaveValue("2026-05");
  await expect(review.getByLabel("Period")).toHaveValue("2026-06");

  await page.getByTestId("business-perspective-fulfillment_operations").click();
  await expect(page.getByTestId("analyze-selected-perspective")).toBeEnabled();

  await review.getByText(/Review technical evidence/i).click();
  for (const file of SIX_ERP_FILES) {
    await expect(review.getByText(path.basename(file), { exact: true })).toBeVisible();
  }
});

test("authentic six-source journey compares May with June and produces deep profitability BA", async ({ page }) => {
  test.setTimeout(300_000);
  const review = await importSixSources(page);
  await page.getByTestId("business-perspective-profitability").click();
  await review.getByLabel("Compare").selectOption("2026-05");
  await review.getByLabel("Period").selectOption("2026-06");

  const analyze = page.getByTestId("analyze-selected-perspective");
  await expect(analyze).toBeEnabled();
  await analyze.click();
  const result = page.getByTestId("perspective-collection-result");
  await expect(result).toBeVisible({ timeout: 120_000 });
  await expect(result).toContainText(/Gross Profit|Lợi nhuận gộp/i);
  await expect(result.locator("canvas")).toBeVisible();

  const analyzeDeeper = result.getByRole("button", { name: /What drove|Điều gì làm/i }).first();
  await expect(analyzeDeeper).toBeEnabled();
  await analyzeDeeper.click();
  const deepBA = page.getByTestId("governed-ba-deep-dive");
  await expect(deepBA).toBeVisible();
  expect((await deepBA.innerText()).length).toBeGreaterThan(300);

  await page.getByTestId("easy-mode-back-to-perspectives").click();
  await expect(page.getByTestId("canonical-business-perspectives")).toBeVisible();
});

test("authentic six-source executive chart opens period evidence and Deep BA step 2", async ({ page }) => {
  test.setTimeout(300_000);
  const review = await importSixSources(page);
  await page.getByTestId("business-perspective-executive_overview").click();
  await review.getByLabel("Compare").selectOption("2026-05");
  await review.getByLabel("Period").selectOption("2026-06");
  await page.getByTestId("analyze-selected-perspective").click();

  const result = page.getByTestId("perspective-collection-result");
  await expect(result).toBeVisible({ timeout: 120_000 });
  await result.getByTestId("collection-chart-point-2026-05-sales_revenue").click();

  const drill = page.getByTestId("collection-chart-drill");
  await expect(drill).toBeVisible();
  await expect(drill).toContainText(/2026-05/);
  await expect(drill).toContainText(/Sales_ERP_May_2026\.xlsx/);
  await drill.getByRole("button", { name: /Deep BA analysis · Step 2|Phân tích BA chuyên sâu · Bước 2/i }).click();
  const subset = page.getByTestId("collection-subset-deep-ba");
  await expect(subset).toBeVisible();
  await expect(subset.getByTestId("single-source-ba-overview")).toBeVisible();
  await expect(subset.getByTestId("deep-ba-selected-scope")).toBeVisible();
});

test("three same-period ERP sources render a governed snapshot and open Deep BA", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto(ORIGIN);
  await page.locator('input[type="file"]').setInputFiles(JUNE_ERP_FILES);
  const review = page.getByTestId("canonical-multisource-review");
  await expect(review).toBeVisible({ timeout: 120_000 });
  await page.getByTestId("business-perspective-executive_overview").click();
  await page.getByTestId("analyze-selected-perspective").click();

  const result = page.getByTestId("perspective-collection-result");
  await expect(result).toBeVisible({ timeout: 120_000 });
  await expect(result.getByTestId("collection-chart-point-2026-06-sales_revenue")).toBeVisible();
  await expect(result.getByTestId("collection-chart-point-2026-06-delivery_count")).toBeVisible();
  await expect(result.getByTestId("collection-chart-point-2026-06-gross_profit")).toBeVisible();
  await expect(result).toContainText(/Single-period snapshot|Ảnh chụp một kỳ/i);
  await expect(result).not.toContainText("0.0%");

  const focus = result.getByRole("button", { name: /What explains the composition|Yếu tố nào giải thích cơ cấu/i }).first();
  await expect(focus).toBeEnabled();
  await focus.click();
  await expect(page.getByTestId("collection-chart-drill")).toBeVisible();
  await expect(page.getByTestId("collection-subset-deep-ba")).toBeVisible();
  await expect(page.getByTestId("collection-deep-export-image")).toBeVisible();
  await expect(page.getByTestId("collection-deep-export-pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: /Clean and export sources|Làm sạch và xuất các nguồn/i })).toBeVisible();
  const imageDownload = page.waitForEvent("download");
  await page.getByTestId("collection-deep-export-image").click();
  expect((await imageDownload).suggestedFilename()).toMatch(/-BA\.png$/);
  const pdfDownload = page.waitForEvent("download");
  await page.getByTestId("collection-deep-export-pdf").click();
  expect((await pdfDownload).suggestedFilename()).toMatch(/-BA\.pdf$/);
  await page.getByTestId("collection-create-dashboard").click();
  await expect(page.getByTestId("perspective-dashboard")).toBeVisible();
  expect(await page.getByTestId("dashboard-widget").count()).toBeGreaterThanOrEqual(4);
});
