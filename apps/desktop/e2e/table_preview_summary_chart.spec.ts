import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

test.describe("table preview summary and chart", () => {
  test.setTimeout(180000);

  test("shows logistics information and a chart together", async ({ page }) => {
    const filePath = path.resolve("../../sample data/bcctnhapTTKT_19122024.xlsx");
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    await page.goto("http://127.0.0.1:5173/");
    await page.waitForSelector('input[type="file"]', { state: "attached" });
    await page.setInputFiles('input[type="file"]', [filePath]);

    const useDataset = page.locator('button:has-text("Use this dataset"), button:has-text("Use selected dataset")');
    await expect(useDataset).toBeVisible({ timeout: 120000 });
    await useDataset.click();

    const coverageQuestion = page
      .locator("div.rounded-md")
      .filter({ has: page.getByText("Document and transaction structure", { exact: true }) })
      .filter({ has: page.getByRole("button", { name: "Investigate" }) })
      .first();
    await expect(coverageQuestion).toBeVisible({ timeout: 30000 });
    await coverageQuestion.getByRole("button", { name: "Investigate" }).click();

    const runPreview = page.getByRole("button", { name: "Run preview" }).first();
    await expect(runPreview).toBeVisible({ timeout: 30000 });
    await runPreview.click();

    await expect(page.getByText("EXECUTED", { exact: true })).toBeVisible({ timeout: 120000 });
    await expect(page.getByText("Logistics Dataset Summary", { exact: true })).toBeVisible();
    const chart = page.getByTestId("chart-preview-canvas");
    await expect(chart).toBeVisible();
    await expect(chart.locator("canvas")).toHaveCount(1);

    await page.screenshot({
      path: "../../ui-audit/table-preview-summary-and-chart.png",
      fullPage: true
    });
  });
});
