import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ORIGIN = process.env.LIGHTBI_NEXT_E2E_BASE_URL ?? 'http://100.94.184.141:5273/app/';
const AUDIT_DIR = path.resolve('../../ui-audit/dpr0-next-ce5c961');
const ANCHORS = path.resolve('../../sample-corpus/anchors/1.3.0');
const MULTI_FILES = [
  'Sales_ERP_May_2026.xlsx', 'Sales_ERP_June_2026.xlsx',
  'Accounting_ERP_May_2026.csv', 'Accounting_ERP_June_2026.csv',
  'Logistics_ERP_May_2026.csv', 'Logistics_ERP_June_2026.csv',
].map(name => path.join(ANCHORS, name));
const INVENTORY = path.resolve('../../sample-corpus/versions/1.4.0/fixtures/inventory-projection-sanitized.xlsx');

async function prepare(page: Page) {
  const url = new URL(ORIGIN);
  if (url.port !== '5273' || !url.pathname.startsWith('/app')) throw new Error('DPR-0 visual baseline must run on NEXT 5273 /app');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('lightbi-display-preferences', JSON.stringify({
      state: { preferences: { language: 'en', locale: 'en-US', currencyCode: 'USD' } }, version: 2,
    }));
  });
}

async function dismissLearning(page: Page) {
  const notNow = page.getByRole('button', { name: /Not now/i }).first();
  if (await notNow.isVisible({ timeout: 2500 }).catch(() => false)) await notNow.click();
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: path.join(AUDIT_DIR, `${name}.png`), fullPage: true, animations: 'disabled' });
}

test.beforeAll(() => mkdirSync(AUDIT_DIR, { recursive: true }));
test.describe.configure({ mode: 'serial' });
test.setTimeout(6 * 60_000);

test('captures corrected multi-file terminal workflow on NEXT', async ({ page }) => {
  await prepare(page);
  await page.goto(ORIGIN);
  await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 30_000 });
  await dismissLearning(page);
  await capture(page, '01-home');

  await page.locator('input[type="file"]').setInputFiles(MULTI_FILES);
  await expect(page.getByTestId('canonical-multisource-review')).toBeVisible({ timeout: 180_000 });
  await dismissLearning(page);
  await capture(page, '02-understanding-multisource');

  await page.getByTestId('business-perspective-executive_overview').click();
  const analyze = page.getByTestId('analyze-selected-perspective');
  await expect(analyze).toBeEnabled({ timeout: 60_000 });
  await analyze.click();
  await expect(page.getByTestId('collection-decision-workspace')).toBeVisible({ timeout: 180_000 });
  await capture(page, '03-multifile-decision-workspace');

  const deep = page.getByRole('button', { name: /What drove the change/i }).first();
  await expect(deep).toBeVisible({ timeout: 30_000 });
  await deep.click();
  await expect(page.getByTestId('collection-deep-perspective-surface')).toBeVisible({ timeout: 60_000 });
  await capture(page, '04-multifile-deep-ba');
  await page.getByTestId('collection-deep-perspective-back').click();
  await expect(page.getByTestId('collection-decision-workspace')).toBeVisible();

  const point = page.getByTestId('collection-chart-point-2026-05-gross_profit');
  await expect(point).toBeVisible({ timeout: 30_000 });
  await point.click();
  await expect(page.getByTestId('collection-evidence-drill-surface')).toBeVisible();
  await capture(page, '05-multifile-evidence-drill');

  await page.getByRole('button', { name: /Deep BA analysis · Step 2/i }).click();
  await expect(page.getByTestId('collection-deep-selected-surface')).toBeVisible({ timeout: 120_000 });
  await capture(page, '06-multifile-step2');
  await page.getByTestId('collection-deep-selected-back').click();
  await page.getByTestId('collection-evidence-back').click();
  await expect(page.getByTestId('collection-decision-workspace')).toBeVisible();

  await page.getByTestId('collection-create-dashboard').click();
  await expect(page).toHaveURL(/\/app\/dashboards\/dash-/, { timeout: 60_000 });
  await expect(page.getByTestId('perspective-dashboard')).toBeVisible({ timeout: 60_000 });
  await capture(page, '07-dashboard');
});

test('captures single-file Decision Workspace and Deep BA on NEXT', async ({ page }) => {
  await prepare(page);
  await page.goto(ORIGIN);
  await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 30_000 });
  await dismissLearning(page);
  await page.locator('input[type="file"]').setInputFiles(INVENTORY);

  const analyzeSheets = page.getByTestId('analyze-selected-sheets');
  await expect(page.locator('[data-testid="use-single-source"], [data-testid="analyze-selected-sheets"]').first()).toBeVisible({ timeout: 180_000 });
  await dismissLearning(page);
  if (await analyzeSheets.isVisible().catch(() => false)) await analyzeSheets.click();
  await expect(page.getByTestId('use-single-source')).toBeVisible({ timeout: 180_000 });
  await page.getByTestId('use-single-source').click();

  const perspectives = page.getByTestId('canonical-business-perspectives');
  await expect(perspectives).toBeVisible({ timeout: 120_000 });
  const ready = perspectives.locator('button[data-testid^="business-perspective-"]').filter({ hasText: /Ready to analyze/i }).first();
  await expect(ready).toBeVisible();
  await ready.click();
  const analyze = page.locator('[data-testid="canonical-analyze-perspective"], [data-testid="universal-analyze-perspective"]').first();
  await expect(analyze).toBeEnabled();
  await analyze.click();

  await expect(page).toHaveURL(/\/app\/investigation/, { timeout: 60_000 });
  await expect(page.getByText(/Decision workspace/i).first()).toBeVisible({ timeout: 120_000 });
  await capture(page, '08-singlefile-decision-workspace');

  const deeper = page.getByTestId('perspective-deep-analysis-button');
  await expect(deeper).toBeEnabled({ timeout: 120_000 });
  await deeper.click();
  await expect(page.getByTestId('deep-analysis-export-surface')).toBeVisible({ timeout: 120_000 });
  await capture(page, '09-singlefile-deep-ba');
});
