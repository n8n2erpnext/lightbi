import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

test.describe('Beta recovery capability ladder', () => {
  test.setTimeout(180_000);

  test('an unresolved single source reaches useful governed analyses', async ({ page }) => {
    const filePath = path.resolve('../../sample data', 'bank-additional-full.xlsx');
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    await page.goto('http://localhost:5173/');
    await page.waitForSelector('input[type="file"]', { state: 'attached' });
    await page.setInputFiles('input[type="file"]', filePath);
    await expect(page.getByTestId('use-single-source')).toBeVisible({ timeout: 120_000 });
    await page.getByTestId('use-single-source').click();

    await expect(page.getByTestId('canonical-business-perspectives')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('business-perspective-customer')).toBeVisible();
    await expect(page.getByTestId('business-perspective-performance')).toBeVisible();
    await expect(page.getByTestId('business-perspective-operations')).toBeVisible();
    await page.screenshot({ path: '../../ui-audit/beta-recovery-bank-capabilities.png', fullPage: true });

    await page.getByTestId('business-perspective-customer').click();
    await expect(page.getByTestId('canonical-primary-analysis')).toBeVisible();
    await expect(page.getByTestId('universal-ready-angles')).toBeVisible();
    await page.getByTestId('canonical-analyze-perspective').click();
    await expect(page).toHaveURL(/\/investigation/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /Decision workspace|Không gian phân tích quyết định/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('investigation-preflight-blocked')).toHaveCount(0);
    const chart = page.getByTestId('chart-preview-canvas').first();
    await chart.waitFor({ state: 'visible', timeout: 90_000 }).catch(async () => {
      const runPreview = page.locator('[data-run-preview="true"]');
      await expect(runPreview).toBeEnabled();
      await runPreview.click();
      await chart.waitFor({ state: 'visible', timeout: 90_000 });
    });
    const primaryQuestion = (await page.locator('h1').first().innerText()).trim();
    const analyzeDeeper = page.getByRole('button', { name: /Analyze deeper|Phân tích sâu/i }).first();
    await expect(analyzeDeeper).toBeEnabled();
    await analyzeDeeper.click();
    await expect(page.locator('aside h2').filter({ hasText: primaryQuestion })).toBeVisible();
    const deepBA = page.getByTestId('single-source-ba-overview');
    await expect(deepBA).toBeVisible();
    await expect(deepBA).toContainText(/Theo poutcome|previous campaign outcome/i);
    await page.screenshot({ path: '../../ui-audit/beta-recovery-bank-investigation.png', fullPage: true });

    const body = await page.locator('body').innerText();
    if (/Analysis Blocked|Execution Boundary Failed|DUCKDB error|Failed to fetch|Analysis unavailable/i.test(body)) {
      throw new Error('A technical runtime failure leaked into Easy Mode.');
    }
  });
});
