import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

test.describe("bank-additional-full trend runtime", () => {
  test.setTimeout(180000);

  test("executes month trend against the full local file", async ({ page }) => {
    const filePath = path.resolve("../../sample data/bank-additional-full.xlsx");
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    await page.goto("http://127.0.0.1:5173/");
    await page.waitForSelector('input[type="file"]', { state: "attached" });
    await page.setInputFiles('input[type="file"]', [filePath]);

    const useDataset = page.locator('button:has-text("Use this dataset"), button:has-text("Use selected dataset")');
    await expect(useDataset).toBeVisible({ timeout: 120000 });
    await useDataset.click();

    await expect(page.getByText(/Understanding: .* representative rows/)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Runtime: full local file/)).toBeVisible();

    const trendQuestion = page
      .locator("div.rounded-md")
      .filter({ has: page.getByText("Indicator over time", { exact: true }) })
      .filter({ has: page.getByRole("button", { name: "Investigate" }) })
      .first();
    await expect(trendQuestion).toBeVisible({ timeout: 30000 });
    await trendQuestion.getByRole("button", { name: "Investigate" }).click();

    const runPreview = page.getByRole("button", { name: "Run preview" }).first();
    await expect(runPreview).toBeVisible({ timeout: 30000 });
    await runPreview.click();

    await expect(page.getByText("EXECUTED", { exact: true })).toBeVisible({ timeout: 120000 });
    await expect(page.getByText("Full file", { exact: true })).toBeVisible();

    const body = await page.locator("body").innerText();
    expect(body).not.toContain("DUCKDB_");
    expect(body).not.toContain("SQL preview is empty or blocked");
    expect(body).not.toContain("Trend shape expects a date/time dimension");
    expect(body).not.toContain("No data rows available to query");

    await page.screenshot({
      path: "../../ui-audit/bank-additional-full-trend-full-file.png",
      fullPage: true
    });
  });
});
