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
    await expect(page.getByText('What do you want to understand?')).toBeVisible({ timeout: 30000 });
    await page.getByText('What do you want to understand?').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '../../ui-audit/world-cup-players-probe-2026-06-17/orientation.png', fullPage: true });

    const orientationText = await page.locator('body').innerText();
    console.log('--- WORLD CUP ORIENTATION START ---');
    console.log(orientationText.split('\n').filter(Boolean).slice(0, 180).join('\n'));
    console.log('--- WORLD CUP ORIENTATION END ---');

    for (const forbidden of [
      'Something went wrong',
      'Cannot convert a BigInt value to a number',
      'Execution Boundary Failed',
      'CANONICAL',
      'DUCKDB',
      'SQL preview is empty or blocked',
      'money.rounding',
      'Header matched money.rounding: RoundID'
    ]) {
      if (orientationText.includes(forbidden)) {
        throw new Error(`WorldCupPlayers leaked forbidden error on Home: ${forbidden}`);
      }
    }

    for (const expected of [
      'Participation by team or group',
      'Role or participation mix',
      'Activity by person or participant'
    ]) {
      if (!orientationText.includes(expected)) {
        throw new Error(`WorldCupPlayers did not show expected people/team/event question: ${expected}`);
      }
    }

    const firstAction = page
      .locator('div')
      .filter({ hasText: 'Participation by team or group' })
      .getByRole('button', { name: 'Investigate' })
      .first();
    if (await firstAction.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstAction.click();
      await page.waitForSelector('button:has-text("Run preview")', { timeout: 30000 });
      await page.screenshot({ path: '../../ui-audit/world-cup-players-probe-2026-06-17/investigation_before.png', fullPage: true });

      await page.getByRole('button', { name: 'Run preview' }).first().click();
      await page.waitForFunction(() => {
        const text = document.body.innerText;
        return text.includes('EXECUTED') || text.includes('FAILED') || text.includes('Execution Failed');
      }, null, { timeout: 30000 });
      await page.screenshot({ path: '../../ui-audit/world-cup-players-probe-2026-06-17/investigation_after.png', fullPage: true });

      const investigationText = await page.locator('body').innerText();
      console.log('--- WORLD CUP INVESTIGATION START ---');
      console.log(investigationText.split('\n').filter(Boolean).slice(0, 160).join('\n'));
      console.log('--- WORLD CUP INVESTIGATION END ---');

      for (const forbidden of [
        'Something went wrong',
        'Cannot convert a BigInt value to a number',
        'Execution Boundary Failed',
        'CANONICAL',
        'DUCKDB',
        'SQL preview is empty or blocked',
        'money.rounding'
      ]) {
        if (investigationText.includes(forbidden)) {
          throw new Error(`WorldCupPlayers leaked forbidden error in Investigation: ${forbidden}`);
        }
      }

      if (!investigationText.includes('EXECUTED')) {
        throw new Error('WorldCupPlayers participation preview did not execute.');
      }
      if (!investigationText.includes('Team Initials') || !investigationText.includes('record_count')) {
        throw new Error('WorldCupPlayers participation preview did not use team + record_count output.');
      }
    } else {
      throw new Error('WorldCupPlayers has no runnable Participation by team or group action.');
    }
  });
});
