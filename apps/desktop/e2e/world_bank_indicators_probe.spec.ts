import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';

test.describe('World Bank Indicators probe', () => {
  test.setTimeout(120000);

  test.beforeAll(() => {
    mkdirSync('../../ui-audit/world-bank-indicators-probe-2026-06-16', { recursive: true });
  });

  test('runs local physical-header action without canonical projection failure', async ({ page }) => {
    const fileName = 'World Bank Indicators.xlsx';
    const filePath = path.resolve('../../sample data', fileName);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    await page.goto('http://localhost:5173/');
    await page.waitForSelector('input[type="file"]', { state: 'attached' });
    await page.setInputFiles('input[type="file"]', [filePath]);

    await page.waitForSelector('button:has-text("Use this dataset"), button:has-text("Use selected dataset")', { timeout: 120000 });
    await page.screenshot({
      path: '../../ui-audit/world-bank-indicators-probe-2026-06-16/home.png',
      fullPage: true
    });

    await page.click('button:has-text("Use this dataset"), button:has-text("Use selected dataset")');
    await expect(page.getByText('What do you want to understand?')).toBeVisible({ timeout: 30000 });
    await page.getByText('What do you want to understand?').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '../../ui-audit/world-bank-indicators-probe-2026-06-16/orientation.png',
      fullPage: true
    });

    const orientationText = await page.locator('body').innerText();
    if (orientationText.includes('No columns detected. Cannot suggest analysis capabilities.')) {
      throw new Error('No-columns warning leaked for World Bank Indicators');
    }
    for (const expected of [
      'Indicator trend',
      'Indicator over time',
      'Indicator comparison',
      'Indicator by country or region',
      'Header matched indicator.metric'
    ]) {
      if (!orientationText.includes(expected)) {
        throw new Error(`Missing World Bank indicator orientation: ${expected}`);
      }
    }
    if (orientationText.includes('Header matched money.revenue: Health: Health expenditure, total (% GDP)')) {
      throw new Error('World Bank health indicator was misclassified as money.revenue');
    }
    if (orientationText.includes('Header matched entity.employee: Business: Internet users (per 100 people)')) {
      throw new Error('World Bank internet users indicator was misclassified as entity.employee');
    }

    const firstActionCard = page
      .locator('div.rounded-md')
      .filter({ has: page.getByText('Indicator over time', { exact: true }) })
      .filter({ has: page.getByRole('button', { name: 'Investigate' }) })
      .first();
    await expect(firstActionCard).toBeVisible({ timeout: 10000 });
    await firstActionCard.getByRole('button', { name: 'Investigate' }).click();

    await page.waitForSelector('button:has-text("Run preview")', { timeout: 30000 });
    await page.screenshot({
      path: '../../ui-audit/world-bank-indicators-probe-2026-06-16/investigation_before.png',
      fullPage: true
    });

    await page.getByRole('button', { name: 'Run preview' }).first().click();
    await expect(page.getByText('EXECUTED')).toBeVisible({ timeout: 30000 });
    await page.screenshot({
      path: '../../ui-audit/world-bank-indicators-probe-2026-06-16/investigation_after.png',
      fullPage: true
    });

    const afterText = await page.locator('body').innerText();
    for (const forbidden of [
      'Execution Boundary Failed',
      'CANONICAL',
      'DUCKDB',
      'SQL preview is empty or blocked',
      'Trend shape expects a date/time dimension',
      'Summary shape requires at least one measure'
    ]) {
      if (afterText.includes(forbidden)) {
        throw new Error(`World Bank runtime leaked forbidden error: ${forbidden}`);
      }
    }
  });
});
