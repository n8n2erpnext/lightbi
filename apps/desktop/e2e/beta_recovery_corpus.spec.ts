import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const corpus = [
  { name: 'DATA_XUAT.xlsx', source: '../../sample data/DATA_XUAT.xlsx', expected: /revenue|inventory|operations|performance/i },
  { name: 'bcctnhapTTKT_19122024.xlsx', source: '../../sample data/bcctnhapTTKT_19122024.xlsx', expected: /operations|performance/i },
  { name: 'Logistics_ERP_June_2026.csv', source: '../../sample-corpus/anchors/1.3.0/Logistics_ERP_June_2026.csv', expected: /operations|performance/i },
  { name: 'Amazon_1-level_46-MB_minified.json', source: '../../sample data/Amazon_1-level_46-MB_minified.json', expected: /revenue|inventory|finance|customer/i },
];

test.describe('Beta recovery sample corpus', () => {
  test.setTimeout(240_000);

  for (const fixture of corpus) {
    test(`${fixture.name} exposes multiple useful perspectives and an executable answer`, async ({ page }) => {
      const filePath = path.resolve(fixture.source);
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      await page.goto('http://localhost:5173/');
      await page.waitForSelector('input[type="file"]', { state: 'attached' });
      await page.setInputFiles('input[type="file"]', filePath);
      await expect(page.getByTestId('use-single-source')).toBeVisible({ timeout: 180_000 });
      await page.getByTestId('use-single-source').click();

      const selector = page.getByTestId('canonical-business-perspectives');
      await expect(selector).toBeVisible({ timeout: 90_000 });
      const perspectiveButtons = selector.locator('button[data-testid^="business-perspective-"]');
      expect(await perspectiveButtons.count()).toBeGreaterThanOrEqual(2);
      const perspectiveIds = await perspectiveButtons.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid') ?? '').join('\n'));
      expect(perspectiveIds).toMatch(fixture.expected);

      const selected = perspectiveButtons.filter({ hasText: /Ready to analyze|Sẵn sàng phân tích/i }).first();
      await expect(selected).toBeVisible();
      await selected.click();
      const analyze = page.locator('[data-testid="canonical-analyze-perspective"], [data-testid="universal-analyze-perspective"]').first();
      await expect(analyze).toBeVisible({ timeout: 30_000 });
      await analyze.click();
      await expect(page).toHaveURL(/\/investigation/, { timeout: 30_000 });
      await expect(page.getByRole('heading', { name: /Decision workspace|Không gian phân tích quyết định/i })).toBeVisible({ timeout: 90_000 });

      await expect(page.getByTestId('investigation-preflight-blocked')).toHaveCount(0);
      const chart = page.getByTestId('chart-preview-canvas');
      await chart.waitFor({ state: 'visible', timeout: 90_000 }).catch(async () => {
        const runPreview = page.locator('[data-run-preview="true"]');
        await expect(runPreview).toBeEnabled();
        await runPreview.click();
        await chart.waitFor({ state: 'visible', timeout: 90_000 });
      });
      await expect(page.getByRole('button', { name: /Analyze deeper|Phân tích sâu/i }).first()).toBeEnabled();

      const body = await page.locator('body').innerText();
      if (/Analysis Blocked|Execution Boundary Failed|DUCKDB error|Failed to fetch|Analysis unavailable/i.test(body)) {
        throw new Error(`A technical runtime failure leaked for ${fixture.name}.`);
      }
      await page.screenshot({ path: `../../ui-audit/beta-recovery-${fixture.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`, fullPage: true });
    });
  }
});
