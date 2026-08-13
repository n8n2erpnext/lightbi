import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';

test.describe('Clean Data handoff', () => {
  test.setTimeout(4 * 60_000);

  test('preserves the raw source and exports an analyst-ready Power BI workbook', async ({ page }) => {
    const fixture = path.resolve('../../sample data/bcctnhapTTKT_19122024.xlsx');
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('input[type="file"]', { state: 'attached' });
    await page.setInputFiles('input[type="file"]', fixture);
    const use = page.getByTestId('use-single-source');
    await expect(use).toBeVisible({ timeout: 180_000 });
    await use.click();
    await expect(page.getByTestId('canonical-business-perspectives')).toBeVisible({ timeout: 90_000 });

    await page.locator('a[href="/datasets"]').first().click();
    await expect(page).toHaveURL(/\/datasets$/);
    const prepare = page.getByTestId('prepare-clean-handoff');
    await expect(prepare).toBeEnabled();
    await prepare.click();
    const result = page.getByTestId('clean-handoff-result');
    await expect(result).toBeVisible({ timeout: 120_000 });
    await expect(result).toContainText(/Preserved|giữ nguyên/i);
    await expect(result).toContainText(/Data Dictionary|Từ điển dữ liệu/i);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-powerbi-package').click();
    const download = await downloadPromise;
    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    const workbook = XLSX.read(fs.readFileSync(downloadedPath!), { type: 'buffer' });
    expect(workbook.SheetNames).toEqual(expect.arrayContaining([
      'Clean Data',
      'Data Dictionary',
      'Transformation Audit',
      'Handoff Manifest',
    ]));
    const cleanRows = XLSX.utils.sheet_to_json(workbook.Sheets['Clean Data']);
    expect(cleanRows.length).toBeGreaterThan(1_000);
  });
});
