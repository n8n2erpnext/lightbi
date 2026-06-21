import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

test.describe('bank-additional-full probe', () => {
  test.setTimeout(120000);

  test('uploads bank-additional-full.xlsx and probes orientation/runtime', async ({ page }) => {
    const fileName = 'bank-additional-full.xlsx';
    const filePath = path.resolve('../../sample data', fileName);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    await page.goto('http://localhost:5173/');
    await page.waitForSelector('input[type="file"]', { state: 'attached' });
    await page.setInputFiles('input[type="file"]', [filePath]);

    await page.waitForSelector('button:has-text("Use this dataset"), button:has-text("Use selected dataset")', { timeout: 120000 });
    await page.screenshot({ path: '../../ui-audit/bank-additional-full-probe-home.png', fullPage: true });

    await page.click('button:has-text("Use this dataset"), button:has-text("Use selected dataset")');
    await expect(page.getByText('What do you want to understand?')).toBeVisible({ timeout: 30000 });
    await page.getByText('What do you want to understand?').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '../../ui-audit/bank-additional-full-probe-orientation.png', fullPage: true });

    const orientationText = await page.locator('body').innerText();
    console.log('--- BANK ORIENTATION START ---');
    console.log(
      orientationText
        .split('\n')
        .filter(line =>
          /Dataset Profile|Detected Domains|What do you want|READY|PARTIAL|Money|Payment|Status|Actor|Customer|Item|Location|Quality|Performance|Campaign|Control|Document|Inventory|Finance|Not implemented|Needs more signals/i.test(line)
        )
        .slice(0, 120)
        .join('\n')
    );
    console.log('--- BANK ORIENTATION END ---');

    if (orientationText.includes('Execution Boundary Failed')) throw new Error('Execution Boundary Failed leaked on orientation');
    if (orientationText.includes('DUCKDB')) throw new Error('DUCKDB error leaked on orientation');
    if (orientationText.includes('No columns detected. Cannot suggest analysis capabilities.')) {
      throw new Error('No-columns warning leaked for bank-additional-full');
    }
    for (const expected of [
      'Response outcome',
      'Response or conversion overview',
      'Audience segment performance',
      'Response by audience segment',
      'Contact channel performance',
      'Response by contact channel',
      'Campaign effort',
      'Campaign effort and prior outcome review'
    ]) {
      if (!orientationText.includes(expected)) {
        throw new Error(`Missing bank/campaign orientation: ${expected}`);
      }
    }
    if (orientationText.includes('Header matched money.receivable: emp.var.rate')) {
      throw new Error('Macro-economic field emp.var.rate was misclassified as receivable money');
    }

    const responseBySegmentCard = page
      .locator('div.rounded-md')
      .filter({ has: page.getByText('Response by audience segment', { exact: true }) })
      .filter({ has: page.getByRole('button', { name: 'Investigate' }) })
      .first();
    await expect(responseBySegmentCard).toBeVisible({ timeout: 10000 });
    await responseBySegmentCard.getByRole('button', { name: 'Investigate' }).click();
    await page.waitForSelector('button:has-text("Run preview")', { timeout: 30000 });
    await page.screenshot({ path: '../../ui-audit/bank-additional-full-probe-investigation-before.png', fullPage: true });

    const beforeText = await page.locator('body').innerText();
    if (beforeText.includes('Data Quality Review Required')) {
      console.log('BANK_PROBE_RESULT=DATA_QUALITY_REVIEW_ONLY');
      return;
    }

    await page.getByRole('button', { name: 'Run preview' }).first().click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '../../ui-audit/bank-additional-full-probe-investigation-after.png', fullPage: true });

    const afterText = await page.locator('body').innerText();
    if (afterText.includes('Execution Boundary Failed')) throw new Error('Execution Boundary Failed after run');
    if (afterText.includes('CANONICAL')) throw new Error('CANONICAL error after run');
    if (afterText.includes('DUCKDB')) throw new Error('DUCKDB error after run');
    if (afterText.includes('SQL preview is empty or blocked')) throw new Error('SQL preview is empty or blocked after run');
    if (!afterText.includes('response_rate')) throw new Error('response_rate derived metric was not visible after run');
    if (!afterText.includes('positive_count')) throw new Error('positive_count derived metric was not visible after run');
    if (!afterText.includes('total_count')) throw new Error('total_count derived metric was not visible after run');
    await expect(page.getByText('EXECUTED')).toBeVisible({ timeout: 10000 });
  });
});
