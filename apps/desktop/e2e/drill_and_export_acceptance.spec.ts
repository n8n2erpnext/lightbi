import { expect, test, type Locator, type Page } from '@playwright/test';
import * as path from 'node:path';

async function clickADataPoint(page: Page, chart: Locator) {
  const canvas = chart.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 90_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Chart canvas has no bounding box');
  const xRatios = [0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85];
  const yRatios = [0.72, 0.58, 0.82, 0.45];
  for (const yRatio of yRatios) {
    for (const xRatio of xRatios) {
      await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
      try {
        await page.getByTestId('investigation-drill-through').waitFor({ state: 'visible', timeout: 2_500 });
        return;
      } catch {
        // Try the next plot coordinate. A governed drill may need a short
        // round-trip before its result panel is mounted.
      }
    }
  }
  throw new Error('No governed chart point opened drill-through');
}

test.describe('Drill-through detail and evidence export', () => {
  test.setTimeout(5 * 60_000);

  test('opens a chart group, explains its distribution and exports all matching rows', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('lightbi-display-preferences', JSON.stringify({
        state: { preferences: { language: 'vi', locale: 'vi-VN', currencyCode: 'VND' } },
        version: 2,
      }));
    });
    const fixture = path.resolve('../../sample data/TỒN DỰ KIẾN HUBLAN.xlsx');
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('input[type="file"]', { state: 'attached' });
    await page.setInputFiles('input[type="file"]', fixture);
    await expect(page.getByTestId('use-single-source')).toBeVisible({ timeout: 180_000 });
    await page.getByTestId('use-single-source').click();

    const selector = page.getByTestId('canonical-business-perspectives');
    await expect(selector).toBeVisible({ timeout: 90_000 });
    const operations = selector.locator('button[data-testid^="business-perspective-"]')
      .filter({ hasText: /Operations|Vận hành|logistics/i }).first();
    await expect(operations).toBeVisible();
    await operations.click();

    const preferred = page.locator('[data-testid^="canonical-ready-angle-"]')
      .filter({ hasText: /current location|vị trí hiện tại|service group|dịch vụ/i }).first();
    if (await preferred.isVisible().catch(() => false)) {
      await preferred.click();
    } else {
      const ready = page.locator('[data-testid^="canonical-ready-angle-"]').first();
      if (await ready.isVisible().catch(() => false)) await ready.click();
      else await page.locator('[data-testid="canonical-analyze-perspective"], [data-testid="universal-analyze-perspective"]').first().click();
    }

    await expect(page).toHaveURL(/\/investigation/, { timeout: 60_000 });
    const chart = page.getByTestId('chart-preview-canvas').first();
    await expect(chart).toBeVisible({ timeout: 120_000 });
    await clickADataPoint(page, chart);

    const drill = page.getByTestId('investigation-drill-through');
    await expect(drill).toBeVisible();
    await expect(drill).toContainText(/bản ghi phù hợp|records matched/i);
    await expect(drill.locator('tbody tr').first()).toBeVisible({ timeout: 60_000 });
    expect(await drill.locator('section').count()).toBeGreaterThanOrEqual(1);

    const csvDownload = page.waitForEvent('download');
    await drill.getByRole('button', { name: 'CSV' }).click();
    expect((await csvDownload).suggestedFilename()).toMatch(/\.csv$/i);
    const excelDownload = page.waitForEvent('download');
    await drill.getByRole('button', { name: 'Excel' }).click();
    expect((await excelDownload).suggestedFilename()).toMatch(/\.xlsx$/i);
  });
});
