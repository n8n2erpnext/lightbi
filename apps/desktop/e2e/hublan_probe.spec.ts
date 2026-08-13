import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

test('TỒN DỰ KIẾN HUBLAN reaches perspective-aligned deep BA', async ({ page }) => {
  test.setTimeout(240_000);
  const filePath = path.resolve('../../sample data/TỒN DỰ KIẾN HUBLAN.xlsx');
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('input[type="file"]', { state: 'attached' });
  await page.setInputFiles('input[type="file"]', filePath);
  await expect(page.getByTestId('use-single-source')).toBeVisible({ timeout: 180_000 });
  await page.getByTestId('use-single-source').click();

  const selector = page.getByTestId('canonical-business-perspectives');
  await expect(selector).toBeVisible({ timeout: 90_000 });
  const perspectives = selector.locator('button[data-testid^="business-perspective-"]');
  const perspectiveSummary = await perspectives.evaluateAll((nodes) =>
    nodes.map((node) => ({ id: node.getAttribute('data-testid'), text: (node.textContent ?? '').trim() })),
  );

  const operations = perspectives.filter({ hasText: /Operations|Vận hành|Hoàn tất đơn hàng|logistics/i }).first();
  const selected = await operations.count() > 0
    ? operations
    : perspectives.filter({ hasText: /Ready to analyze|Sẵn sàng phân tích/i }).first();
  await expect(selected).toBeVisible();
  await selected.click();
  const selectedPerspective = await selected.getAttribute('data-testid');
  const primary = page.locator('[data-testid="canonical-primary-analysis"], [data-testid="universal-primary-analysis"]').first();
  await expect(primary).toBeVisible({ timeout: 30_000 });
  const primaryText = (await primary.innerText()).trim();

  const analyze = page.locator('[data-testid="canonical-analyze-perspective"], [data-testid="universal-analyze-perspective"]').first();
  await expect(analyze).toBeEnabled();
  await analyze.click();
  await expect(page).toHaveURL(/\/investigation/, { timeout: 30_000 });
  await expect(page.getByTestId('investigation-preflight-blocked')).toHaveCount(0);

  const chart = page.getByTestId('chart-preview-canvas').first();
  await chart.waitFor({ state: 'visible', timeout: 90_000 }).catch(async () => {
    const runPreview = page.locator('[data-run-preview="true"]');
    await expect(runPreview).toBeEnabled();
    await runPreview.click();
    await chart.waitFor({ state: 'visible', timeout: 90_000 });
  });
  const investigationTitle = (await page.locator('h1').first().innerText()).trim();
  await expect.poll(async () => page.getByTestId('supporting-analysis-chart').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
  const supportCharts = await page.getByTestId('supporting-analysis-chart').count();

  const analyzeDeeper = page.getByRole('button', { name: /Analyze deeper|Phân tích sâu/i }).first();
  await expect(analyzeDeeper).toBeEnabled();
  await analyzeDeeper.click();
  const specializedBA = page.getByTestId('single-source-ba-overview');
  const deepBA = await specializedBA.count() > 0
    ? specializedBA
    : page.getByRole('complementary').filter({ hasText: /Deep BA analysis|Phân tích BA chuyên sâu/i }).last();
  await expect(deepBA).toBeVisible({ timeout: 60_000 });
  const deepBAText = (await deepBA.innerText()).trim();

  const report = {
    perspectiveSummary,
    selectedPerspective,
    primaryText,
    investigationTitle,
    supportCharts,
    deepBAText,
  };
  fs.writeFileSync('../../ui-audit/hublan-probe.json', JSON.stringify(report, null, 2), 'utf8');
  await page.screenshot({ path: '../../ui-audit/hublan-probe.png', fullPage: true });

  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/Analysis Blocked|Execution Boundary Failed|DUCKDB error|Failed to fetch|Analysis unavailable/i);
  expect(body).not.toMatch(/Measures\s+Mã Phiếu Gửi/i);
  expect(deepBAText).not.toMatch(/Mã Phiếu Gửi\s+(?:increased|decreased|varies|is the largest contributor)/i);
  expect(deepBAText).not.toMatch(/0 (?:positive rows|bản ghi có trạng thái hoàn tất)/i);
  expect(deepBAText).toMatch(/Bưu Cục Hiện Tại|vị trí hiện tại/i);
  expect(supportCharts).toBeGreaterThanOrEqual(2);
});
