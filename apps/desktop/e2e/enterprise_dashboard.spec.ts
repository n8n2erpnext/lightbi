import { expect, test } from '@playwright/test';
import * as path from 'node:path';

test.describe('Perspective enterprise dashboard', () => {
  test.setTimeout(5 * 60_000);

  test('carries selected-perspective deep BA evidence into the dashboard', async ({ page }) => {
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
    const use = page.getByTestId('use-single-source');
    await expect(use).toBeVisible({ timeout: 180_000 });
    await use.click();

    const selector = page.getByTestId('canonical-business-perspectives');
    await expect(selector).toBeVisible({ timeout: 90_000 });
    const ready = selector.locator('button[data-testid^="business-perspective-"]').filter({ hasText: /Ready to analyze|Sẵn sàng phân tích/i }).first();
    await expect(ready).toBeVisible();
    await ready.click();
    const analyze = page.locator('[data-testid="canonical-analyze-perspective"], [data-testid="universal-analyze-perspective"]').first();
    await expect(analyze).toBeEnabled();
    await analyze.click();

    await expect(page).toHaveURL(/\/investigation/, { timeout: 30_000 });
    const deeper = page.getByRole('button', { name: /Analyze deeper|Phân tích sâu/i }).first();
    await expect(deeper).toBeEnabled({ timeout: 120_000 });
    await deeper.click();
    const cta = page.getByTestId('deep-analysis-dashboard-cta');
    await expect(cta).toBeVisible();

    const imageDownload = page.waitForEvent('download');
    await page.getByTestId('deep-analysis-export-image').click();
    expect((await imageDownload).suggestedFilename()).toMatch(/-BA\.png$/i);
    const pdfDownload = page.waitForEvent('download');
    await page.getByTestId('deep-analysis-export-pdf').click();
    expect((await pdfDownload).suggestedFilename()).toMatch(/-BA\.pdf$/i);

    // Closing the deep-analysis step must return to the executed analysis
    // without discarding the imported source or its generated result.
    const deepAnalysisBack = page.getByTestId('deep-analysis-back');
    await expect(deepAnalysisBack).toBeVisible();
    await deepAnalysisBack.click();
    await expect(cta).not.toBeVisible();
    await expect(page).toHaveURL(/\/investigation/);

    await deeper.click();
    await expect(cta).toBeVisible();
    await cta.getByRole('button').click();

    await expect(page).toHaveURL(/\/dashboards\/dash-/, { timeout: 60_000 });
    await expect(page.getByTestId('dashboard-executive-brief')).toBeVisible();
    await expect(page.getByTestId('dashboard-executive-summary')).not.toBeEmpty();
    const deepBA = page.getByTestId('dashboard-deep-ba');
    await expect(deepBA).toBeVisible();
    await expect(page.getByText('Dashboard theo góc nhìn có quản trị')).toBeVisible();
    const dashboardText = await page.locator('[data-testid="perspective-dashboard"]').innerText();
    expect(dashboardText).not.toContain('Governed perspective dashboard');
    expect(dashboardText).not.toContain('Recommended actions');
    expect(dashboardText).not.toContain('Evidence limits');
    await expect(deepBA).toContainText(/BA|Phát hiện|Recommended|Hành động/i);
    await expect(page.getByTestId('dashboard-widget')).toHaveCount(await page.getByTestId('dashboard-widget').count());
    expect(await page.getByTestId('dashboard-widget').count()).toBeGreaterThanOrEqual(4);
    expect(await page.locator('body').innerText()).not.toMatch(/\b\d{13}\b/);

    // Dashboard -> analysis -> perspectives is a reversible path. The source
    // remains in memory, so the user is never forced through import again.
    await page.getByTestId('dashboard-back').click();
    await expect(page).toHaveURL(/\/investigation/);
    await page.getByTestId('investigation-back-to-perspectives').click();
    await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
    await expect(page.getByTestId('canonical-business-perspectives')).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
  });
});
