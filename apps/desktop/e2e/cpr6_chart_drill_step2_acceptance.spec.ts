import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.LIGHTBI_E2E_BASE_URL ?? 'http://localhost:5173';

function numericRevenueCsv(): string {
  return [
    'Ngày xuất,Mã kho,Tổng tiền,Tiền phải thu',
    ...Array.from({ length: 40 }, (_, index) => [
      `2025-01-${String((index % 20) + 1).padStart(2, '0')}`,
      `WH${index % 5}`,
      1_000_000 + index * 10_000,
      900_000 + index * 9_000,
    ].join(',')),
  ].join('\n');
}

async function dismissMicroBrainConsent(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: 'Meet Micro Brain' });
  if (!await dialog.isVisible().catch(() => false)) return;
  await dialog.getByRole('button', { name: 'Not now' }).click();
  await expect(dialog).toBeHidden();
}

async function clickGovernedChartMark(page: Page, chart: Locator): Promise<void> {
  const canvas = chart.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Chart canvas has no bounding box');
  const xRatios = [0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85];
  const yRatios = [0.72, 0.58, 0.82, 0.45, 0.35];
  for (const yRatio of yRatios) {
    for (const xRatio of xRatios) {
      await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
      if (await page.getByTestId('investigation-drill-through').isVisible().catch(() => false)) return;
      await page.waitForTimeout(150);
    }
  }
  throw new Error('No governed chart point opened drill-through');
}

test.describe('CPR-6 browser chart drill to BA Step 2', () => {
  test.setTimeout(120_000);

  test('drills a governed chart mark into selected-evidence analysis', async ({ page }) => {
    await page.goto(`${BASE_URL}/app`);
    await dismissMicroBrainConsent(page);
    await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 30_000 });
    await page.setInputFiles('input[type="file"]', {
      name: 'cpr6_numeric_revenue.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(numericRevenueCsv(), 'utf-8'),
    });

    await expect(page.getByTestId('use-single-source')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('use-single-source').click();
    await expect(page.getByTestId('business-perspective-revenue')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('business-perspective-revenue').click();
    await expect(page.getByTestId('universal-analyze-perspective')).toBeVisible();
    await page.getByTestId('universal-analyze-perspective').click();
    await expect(page).toHaveURL(/\/investigation/, { timeout: 60_000 });

    const chart = page.getByTestId('chart-preview-canvas').first();
    await expect(chart).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('chart-drill-affordance').first()).toBeVisible({ timeout: 30_000 });
    await clickGovernedChartMark(page, chart);

    const analyzeSelected = page.getByTestId('analyze-selected-rows');
    await expect(analyzeSelected).toBeVisible({ timeout: 60_000 });
    await expect(analyzeSelected).toBeEnabled({ timeout: 60_000 });
    await analyzeSelected.click();

    await expect(page.getByTestId('deep-analysis-shell')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('filtered-deep-analysis-scope')).toBeVisible({ timeout: 30_000 });
    const selectedSubject = page.getByTestId('selected-subject-investigation');
    await expect(selectedSubject).toBeVisible({ timeout: 30_000 });
    await expect(selectedSubject).toContainText(/selected-subject investigation/i);
    await expect(selectedSubject).toContainText(/source rows remain separate/i);
  });
});
