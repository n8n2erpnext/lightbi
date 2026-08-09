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
