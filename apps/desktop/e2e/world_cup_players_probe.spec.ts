import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';

test.describe('WorldCupPlayers simple-mode probe', () => {
  test.setTimeout(120000);

  test.beforeAll(() => {
    mkdirSync('../../ui-audit/world-cup-players-probe-2026-06-17', { recursive: true });
  });

  test('uploads WorldCupPlayers.xlsx and captures actual understanding/runtime behavior', async ({ page }) => {
    const fileName = 'WorldCupPlayers.xlsx';
    const filePath = path.resolve('../../sample data', fileName);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('input[type="file"]', { state: 'attached' });
    await page.setInputFiles('input[type="file"]', [filePath]);

    await page.waitForSelector('button:has-text("Use this dataset"), button:has-text("Use selected dataset")', { timeout: 120000 });
    await page.screenshot({ path: '../../ui-audit/world-cup-players-probe-2026-06-17/home.png', fullPage: true });

    await page.click('button:has-text("Use this dataset"), button:has-text("Use selected dataset")');
    await expect(page.getByText('What do you want LightBI to investigate?')).toBeVisible({ timeout: 30000 });
    await page.getByText('What do you want LightBI to investigate?').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '../../ui-audit/world-cup-players-probe-2026-06-17/orientation.png', fullPage: true });

    const orientationText = await page.locator('body').innerText();
    console.log('--- WORLD CUP ORIENTATION START ---');
    console.log(orientationText.split('\n').filter(Boolean).slice(0, 180).join('\n'));
    console.log('--- WORLD CUP ORIENTATION END ---');

    for (const forbidden of [
      'Something went wrong',
      'Cannot convert a BigInt value to a number',
      'Execution Boundary Failed',
      'DUCKDB',
      'SQL preview is empty or blocked',
      'money.rounding',
      'Header matched money.rounding: RoundID'
    ]) {
      if (orientationText.includes(forbidden)) {
        throw new Error(`WorldCupPlayers leaked forbidden error on Home: ${forbidden}`);
      }
    }

    for (const expected of ['Performance', 'Operations', 'Customer', 'Person / Participant']) {
      if (!orientationText.includes(expected)) {
        throw new Error(`WorldCupPlayers did not preserve expected understanding evidence: ${expected}`);
      }
    }

    await page.getByTestId('business-perspective-performance').click();
    await expect(page.getByTestId('canonical-count-ready')).not.toContainText('Ready now: 0', { timeout: 10000 });
    await expect(page.getByText('How are source records distributed by person or participant?')).toBeVisible();
    await expect(page.getByText('How are source records distributed by coach or lead?')).toBeVisible();
    const investigate = page.getByRole('button', { name: 'Investigate' }).first();
    await expect(investigate).toBeVisible();
    await investigate.click();
    await expect(page.getByText('EXECUTED')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('source_record_count', { exact: true }).first()).toBeVisible();
  });
});
