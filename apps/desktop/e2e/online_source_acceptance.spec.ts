import { expect, test } from '@playwright/test';

const sheets = [
  'https://docs.google.com/spreadsheets/d/19RjQTV6a2gh_migkKsgHtSUq8PFlUIfXI3m3Nbw7CfI/edit?usp=drive_link',
  'https://docs.google.com/spreadsheets/d/17bcLiydWdhdNj2dtswRZrvgp00AVzyR0yGv2fzR7AG8/edit?usp=drive_link',
];

for (const sheetUrl of sheets) {
  test(`online source remains executable after navigation: ${sheetUrl.slice(39, 51)}`, async ({ page }) => {
    test.setTimeout(5 * 60_000);
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('lightbi-display-preferences', JSON.stringify({
        state: { preferences: { language: 'vi', locale: 'vi-VN', currencyCode: 'VND' } },
        version: 2,
      }));
    });
    await page.goto('http://localhost:5173/');
    const intake = page.locator('input[type="text"]').first();
    await expect(intake).toBeVisible();
    await intake.fill(sheetUrl);
    const urlInput = page.locator('input[type="url"]');
    await expect(urlInput).toBeVisible({ timeout: 15_000 });
    await expect(urlInput).toHaveValue(sheetUrl);
    await page.getByRole('button', { name: /Kiểm tra liên kết|Inspect|Continue/i }).click();
    await expect(page.getByText(/Đã đọc nguồn dữ liệu|Source inspected/i)).toBeVisible({ timeout: 120_000 });
    await page.getByRole('button', { name: /Dùng bộ dữ liệu này|Sử dụng bộ dữ liệu này|Use this dataset/i }).click();
    const perspectives = page.getByTestId('canonical-business-perspectives');
    await expect(perspectives).toBeVisible({ timeout: 180_000 });
    const ready = perspectives.locator('button[data-testid^="business-perspective-"]').filter({ hasText: /Sẵn sàng phân tích|Ready to analyze/i }).first();
    await expect(ready).toBeVisible({ timeout: 30_000 });
    await ready.click();
    const analyze = page.locator('[data-testid="canonical-analyze-perspective"], [data-testid="universal-analyze-perspective"]').first();
    await expect(analyze).toBeEnabled({ timeout: 30_000 });
    await analyze.click();
    await expect(page).toHaveURL(/\/investigation/, { timeout: 60_000 });
    await expect(page.getByTestId('runtime-source-reselection-required')).toHaveCount(0);
    await expect(page.getByTestId('investigation-stale-handoff')).toHaveCount(0);
    const back = page.getByTestId('investigation-back-to-perspectives');
    await expect(back).toBeVisible({ timeout: 30_000 });
    await back.click();
    await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
    await expect(page.getByTestId('canonical-business-perspectives')).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId('runtime-source-reselection-required')).toHaveCount(0);
  });
}
