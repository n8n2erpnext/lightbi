import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const AUDIT_DIR = '../../ui-audit/online-source-intake-2026-06-18';

function csvFixture(rowCount = 1205): string {
  const rows = ['Ngày bán,Mã kho xuất,Tổng tiền,Tiền mặt khách đưa,Tiền cà thẻ,Khách hàng'];
  for (let i = 0; i < rowCount; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    const branch = `STORE-${String((i % 7) + 1).padStart(2, '0')}`;
    const revenue = 100000 + (i % 17) * 25000;
    const cash = i % 3 === 0 ? revenue : 0;
    const card = i % 3 === 0 ? 0 : revenue;
    const customer = i % 20 === 0 ? `CUSTOMER-${i}` : 'Khách lẻ';
    rows.push(`2024-12-${day},${branch},${revenue},${cash},${card},${customer}`);
  }
  return rows.join('\n');
}

test.describe('Online source intake probe', () => {
  test.setTimeout(120000);

  test.beforeAll(() => {
    mkdirSync(AUDIT_DIR, { recursive: true });
  });

  test('Google Sheets public CSV export feeds the shared understanding and runtime path', async ({ page }) => {
    const publicSheetUrl = 'https://docs.google.com/spreadsheets/d/public-demo/edit#gid=0';
    const exportUrl = 'https://docs.google.com/spreadsheets/d/public-demo/export?format=csv&gid=0';

    await page.route(exportUrl, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        body: csvFixture()
      });
    });

    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('http://localhost:5173/');

    const input = page.getByPlaceholder('Ask a question about your data...');
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.fill(publicSheetUrl);

    await expect(page.getByText('Connect Google Sheets')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Continue|Connect|Inspect/i }).click();

    await expect(page.getByText('Source inspected')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('1205')).toBeVisible();
    await page.screenshot({ path: `${AUDIT_DIR}/google_sheet_inspected.png`, fullPage: true });

    await page.getByRole('button', { name: 'Use this dataset' }).click();

    await expect(page.getByText('Connected Data: Google Sheet')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('What do you want to understand?')).toBeVisible({ timeout: 30000 });
    await page.getByText('What do you want to understand?').scrollIntoViewIfNeeded();

    const orientationText = await page.locator('body').innerText();
    for (const expected of ['Money trend', 'Location performance', 'Payment mix']) {
      if (!orientationText.includes(expected)) {
        throw new Error(`Online Google Sheet did not expose expected business lens: ${expected}`);
      }
    }
    if (!orientationText.includes('Source Rows: 1,205') || !orientationText.includes('Sample Rows: 1,000')) {
      throw new Error('Online Google Sheet did not preserve source/sample row counts honestly.');
    }
    await page.screenshot({ path: `${AUDIT_DIR}/google_sheet_orientation.png`, fullPage: true });

    const moneyTrendIndex = orientationText.indexOf('Money trend');
    const locationIndex = orientationText.indexOf('Location performance');
    if (moneyTrendIndex === -1 || locationIndex === -1 || moneyTrendIndex > locationIndex) {
      throw new Error('Online Google Sheet must present Money trend as the first executable lens.');
    }
    await page
      .locator('xpath=//*[normalize-space()="Money over time"]/following::button[normalize-space()="Investigate"][1]')
      .first()
      .click();

    await page.waitForSelector('button:has-text("Run preview")', { timeout: 30000 });
    await page.screenshot({ path: `${AUDIT_DIR}/google_sheet_investigation_before.png`, fullPage: true });

    await page.getByRole('button', { name: 'Run preview' }).first().click();
    await expect(page.getByText('EXECUTED')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: `${AUDIT_DIR}/google_sheet_investigation_after.png`, fullPage: true });

    const pageText = await page.locator('body').innerText();
    for (const forbidden of [
      'Something went wrong',
      'Execution Boundary Failed',
      'CANONICAL',
      'DUCKDB',
      'SQL preview is empty or blocked'
    ]) {
      if (pageText.includes(forbidden)) {
        throw new Error(`Online Google Sheet leaked forbidden error: ${forbidden}`);
      }
    }
  });

  test('locked Google Sheet link fails cleanly without creating a dataset', async ({ page }) => {
    const lockedSheetUrl = 'https://docs.google.com/spreadsheets/d/19RjQTV6a2gh_migkKsgHtSUq8PFlUIfXI3m3Nbw7CfI/edit?usp=sharing';

    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('http://localhost:5173/');

    const input = page.getByPlaceholder('Ask a question about your data...');
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.fill(lockedSheetUrl);

    await expect(page.getByText('Connect Google Sheets')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Continue|Connect|Inspect/i }).click();

    await expect(page.getByText(/not found|access denied/i)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Source inspected')).not.toBeVisible();
    await expect(page.getByText('Use this dataset')).not.toBeVisible();
    await page.screenshot({ path: `${AUDIT_DIR}/locked_google_sheet_rejected.png`, fullPage: true });
  });

  test('real shared Google Sheet link can be inspected, oriented, and previewed', async ({ page }) => {
    const realSheetUrl = 'https://docs.google.com/spreadsheets/d/1llT_7ZfJT7ciA2bPlX4OmM8F2Wxnx6P5lp2BkjqYU00/edit?usp=sharing';

    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('http://localhost:5173/');

    const input = page.getByPlaceholder('Ask a question about your data...');
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.fill(realSheetUrl);

    await expect(page.getByText('Connect Google Sheets')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Continue|Connect|Inspect/i }).click();

    await expect(page.getByText('Source inspected')).toBeVisible({ timeout: 60000 });
    await page.screenshot({ path: `${AUDIT_DIR}/real_google_sheet_inspected.png`, fullPage: true });

    await page.getByRole('button', { name: 'Use this dataset' }).click();
    await expect(page.getByText('What do you want to understand?')).toBeVisible({ timeout: 30000 });
    await page.getByText('What do you want to understand?').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${AUDIT_DIR}/real_google_sheet_orientation.png`, fullPage: true });

    const orientationText = await page.locator('body').innerText();
    for (const expected of ['Inventory aging and backlog risk', 'Inventory value exposure', 'Document structure']) {
      if (!orientationText.includes(expected)) {
        throw new Error(`Real Google Sheet did not expose expected inventory/logistics lens: ${expected}`);
      }
    }
    for (const forbidden of [
      'Something went wrong',
      'Could not inspect Google Sheets',
      'Execution Boundary Failed',
      'CANONICAL',
      'DUCKDB'
    ]) {
      if (orientationText.includes(forbidden)) {
        throw new Error(`Real Google Sheet leaked forbidden state: ${forbidden}`);
      }
    }

    await page
      .locator('xpath=//*[normalize-space()="Inventory aging and backlog risk"]/following::button[normalize-space()="Investigate"][1]')
      .first()
      .click();
    await page.waitForSelector('button:has-text("Run preview")', { timeout: 30000 });
    await page.screenshot({ path: `${AUDIT_DIR}/real_google_sheet_investigation_before.png`, fullPage: true });

    await page.getByRole('button', { name: 'Run preview' }).first().click();
    await expect(page.getByText('EXECUTED')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: `${AUDIT_DIR}/real_google_sheet_investigation_after.png`, fullPage: true });

    const runtimeText = await page.locator('body').innerText();
    if (!/Ngưỡng tồn|record_count/.test(runtimeText)) {
      throw new Error('Real Google Sheet runtime did not use the inventory aging threshold action.');
    }
    for (const forbidden of [
      'Something went wrong',
      'Execution Boundary Failed',
      'CANONICAL',
      'DUCKDB',
      'SQL preview is empty or blocked'
    ]) {
      if (runtimeText.includes(forbidden)) {
        throw new Error(`Real Google Sheet runtime leaked forbidden state: ${forbidden}`);
      }
    }
  });
});
