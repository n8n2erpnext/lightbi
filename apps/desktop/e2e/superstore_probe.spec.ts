import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';

test.describe('Sample Superstore probe', () => {
  test.setTimeout(120000);

  test.beforeAll(() => {
    mkdirSync('../../ui-audit/superstore-probe-2026-06-16', { recursive: true });
  });

  test('runs a local retail/order action without BigInt route crash', async ({ page }) => {
    const fileName = 'Sample - Superstore for Tableau 9.x versions.xls';
    const filePath = path.resolve('../../sample data', fileName);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    await page.goto('http://localhost:5173/');
    await page.waitForSelector('input[type="file"]', { state: 'attached' });
    await page.setInputFiles('input[type="file"]', [filePath]);

    await page.waitForSelector('button:has-text("Use this dataset"), button:has-text("Use selected dataset")', { timeout: 120000 });
    await page.screenshot({ path: '../../ui-audit/superstore-probe-2026-06-16/home.png', fullPage: true });

    await page.click('button:has-text("Use this dataset"), button:has-text("Use selected dataset")');
    await expect(page.getByText('What do you want LightBI to investigate?')).toBeVisible({ timeout: 30000 });
    await page.getByText('What do you want LightBI to investigate?').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '../../ui-audit/superstore-probe-2026-06-16/orientation.png', fullPage: true });

    const orientationText = await page.locator('body').innerText();
    for (const expected of ['Revenue', 'Customer', 'Inventory', 'Finance']) {
      if (!orientationText.includes(expected)) {
        throw new Error(`Missing Superstore business perspective: ${expected}`);
      }
    }

    await page.getByRole('button', { name: /Questions available Revenue/ }).click();
    await expect(page.getByTestId('canonical-guided-setup')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('canonical-guided-setup')).toContainText('Sales = revenue');
    await page.getByRole('button', { name: 'Confirm LightBI setup' }).click();

    await expect(page.getByTestId('canonical-count-ready')).toContainText('5', { timeout: 30000 });
    const actionCard = page
      .locator('article')
      .filter({ hasText: 'Which products contribute the most sales revenue?' });
    await expect(actionCard).toBeVisible({ timeout: 10000 });
    await actionCard.getByRole('button', { name: 'Investigate' }).click();

    await expect(page.getByRole('heading', { name: 'Which products contribute the most sales revenue?' })).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: '../../ui-audit/superstore-probe-2026-06-16/investigation_before.png', fullPage: true });

    await expect(page.getByText('EXECUTED')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: '../../ui-audit/superstore-probe-2026-06-16/investigation_after.png', fullPage: true });

    const pageText = await page.locator('body').innerText();
    if (!pageText.includes('sales_revenue')) {
      throw new Error('Superstore runtime did not use the governed sales revenue metric');
    }
    await page.getByText('Raw rows evidence').click();
    const rawRowsText = await page.locator('table').last().innerText({ timeout: 10000 });
    console.log('--- SUPERSTORE RAW RESULT START ---');
    console.log(rawRowsText.split('\n').slice(0, 8).join('\n'));
    console.log('--- SUPERSTORE RAW RESULT END ---');
    if (!/\bsales_revenue\b/i.test(rawRowsText)) {
      throw new Error('Superstore raw result does not include sales_revenue');
    }
    const currencyValues = [...rawRowsText.matchAll(/\$([0-9,]+\.\d{2})/g)]
      .map(match => Number(match[1].replace(/,/g, '')));
    const nonCountLikeSalesValues = currencyValues.filter(value => value > 10);
    if (nonCountLikeSalesValues.length < 5) {
      throw new Error(`Superstore Sales values still look like COUNT output: ${rawRowsText.slice(0, 500)}`);
    }
    for (const forbidden of [
      'Something went wrong',
      'Cannot convert a BigInt value to a number',
      'Execution Boundary Failed',
      'CANONICAL',
      'DUCKDB',
      'SQL preview is empty or blocked'
    ]) {
      if (pageText.includes(forbidden)) {
        throw new Error(`Superstore leaked forbidden error: ${forbidden}`);
      }
    }
  });
});
