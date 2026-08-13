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
    await expect(page.getByText('What do you want LightBI to investigate?')).toBeVisible({ timeout: 30000 });
    await page.getByText('What do you want LightBI to investigate?').scrollIntoViewIfNeeded();
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
    for (const expected of ['Performance', 'Customer', 'Operations', 'Previous Outcome', 'previous_contacts']) {
      if (!orientationText.includes(expected)) {
        throw new Error(`Missing bank/campaign understanding evidence: ${expected}`);
      }
    }
    if (orientationText.includes('Header matched money.receivable: emp.var.rate')) {
      throw new Error('Macro-economic field emp.var.rate was misclassified as receivable money');
    }

    await page.getByTestId('business-perspective-customer').click();
    await expect(page.getByTestId('canonical-count-ready')).not.toContainText('Ready now: 0', { timeout: 10000 });
    await expect(page.getByText('How are source records distributed by previous campaign outcome?')).toBeVisible();
    const investigate = page.getByRole('button', { name: 'Investigate' }).first();
    await expect(investigate).toBeVisible();
    await investigate.click();
    await expect(page.getByText('EXECUTED')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('source_record_count', { exact: true }).first()).toBeVisible();
  });
});
