import { expect, test } from "@playwright/test";
import path from "node:path";

const ORIGIN = process.env.LIGHTBI_E2E_BASE_URL ?? "http://127.0.0.1:5183/app";
const ANCHORS = path.resolve("../../sample-corpus/anchors/1.3.0");
const FILES = [
  "Sales_ERP_May_2026.xlsx",
  "Sales_ERP_June_2026.xlsx",
  "Accounting_ERP_May_2026.csv",
  "Accounting_ERP_June_2026.csv",
  "Logistics_ERP_May_2026.csv",
  "Logistics_ERP_June_2026.csv",
].map((name) => path.join(ANCHORS, name));

async function importAndChooseExecutive(page: import("@playwright/test").Page) {
  await page.goto(ORIGIN);
  await page.locator('input[type="file"]').setInputFiles(FILES);
  const review = page.getByTestId("canonical-multisource-review");
  await expect(review).toBeVisible({ timeout: 120_000 });
  await page.getByTestId("business-perspective-executive_overview").click();
  await expect(page.getByTestId("analyze-selected-perspective")).toBeEnabled();
  return review;
}

async function summaryCards(page: import("@playwright/test").Page) {
  const result = page.getByTestId("perspective-collection-result");
  await expect(result).toBeVisible({ timeout: 120_000 });
  return result.locator("article").allInnerTexts();
}

test("multi-file Focus Subject preserves governed totals and scopes only exact source evidence", async ({ page }) => {
  test.setTimeout(420_000);

  await importAndChooseExecutive(page);
  await page.getByTestId("analyze-selected-perspective").click();
  const baselineCards = await summaryCards(page);
  expect(baselineCards.length).toBeGreaterThan(0);

  const review = await importAndChooseExecutive(page);
  const focus = page.getByTestId("multisource-focus-subject");
  await expect(focus).toBeVisible();
  await focus.getByTestId("add-focus-button").click();
  const typeSelect = focus.getByLabel("Focus subject type");
  const productOption = typeSelect.locator("option").filter({ hasText: /Product/i }).first();
  const productValue = await productOption.getAttribute("value");
  expect(productValue).toBeTruthy();
  await typeSelect.selectOption(productValue!);
  await focus.getByLabel("Search focus subject").fill("Aqua 250L");
  await focus.getByRole("button", { name: /Aqua 250L/i }).first().click();
  await expect(focus).toContainText(/6 exact source matches/i);
  await expect(focus).toContainText(/Governed totals and source relationships remain unchanged/i);

  await page.getByTestId("analyze-selected-perspective").click();
  const focusedCards = await summaryCards(page);
  expect(focusedCards).toEqual(baselineCards);

  const result = page.getByTestId("perspective-collection-result");
  await expect(result.getByTestId("collection-focus-badge")).toContainText("Aqua 250L");
  await expect(result).toContainText("Key attention");
  await expect(result).not.toContainText("BA focus");
  await result.getByTestId("collection-chart-point-2026-05-gross_profit").click();

  const drill = page.getByTestId("collection-chart-drill");
  await expect(drill).toBeVisible();
  const evidenceButtons = drill.locator("button").filter({ hasText: /focus match/i });
  expect(await evidenceButtons.count()).toBeGreaterThanOrEqual(2);
  const table = drill.getByRole("table");
  await expect(table).toBeVisible();
  const dataRows = table.locator("tbody tr");
  expect(await dataRows.count()).toBeGreaterThan(0);
  for (const text of await dataRows.allInnerTexts()) expect(text).toContain("Aqua 250L");

  await drill.getByRole("button", { name: /Deep BA analysis · Step 2/i }).click();
  await expect(page.getByTestId("collection-subset-deep-ba")).toBeVisible();
});
