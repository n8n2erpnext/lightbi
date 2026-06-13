import { test, expect } from '@playwright/test';
import path from 'path';

test('Verify DU-8 Concurrency: Multi-Dataset Execution', async ({ browser }) => {
  // We use two separate browser contexts to simulate two users or two concurrent tabs
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // 1. Upload Dataset A (Delivery)
  await pageA.goto('http://localhost:5173/');
  await pageA.waitForSelector('text=Upload your first spreadsheet', { state: 'visible' });
  await pageA.setInputFiles('input[type="file"]', path.resolve('../../delivery_performance_reports.csv'));
  await pageA.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 });
  await pageA.click('button:has-text("Use this dataset")');
  await pageA.waitForSelector('button:has-text("Investigate")');

  // 2. Upload Dataset B (Inventory)
  await pageB.goto('http://localhost:5173/');
  await pageB.waitForSelector('text=Upload your first spreadsheet', { state: 'visible' });
  await pageB.setInputFiles('input[type="file"]', path.resolve('../../inventory_aging_report.csv'));
  await pageB.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 });
  await pageB.click('button:has-text("Use this dataset")');
  await pageB.waitForSelector('button:has-text("Investigate")');

  // 3. Go to Investigation for A
  await pageA.locator('button:has-text("Investigate")').first().click();
  await pageA.waitForSelector('button:has-text("Run preview")', { timeout: 15000 });

  // 4. Go to Investigation for B
  await pageB.locator('button:has-text("Investigate")').first().click();
  await pageB.waitForSelector('button:has-text("Run preview")', { timeout: 15000 });

  // 5. Execute A
  await pageA.click('button:has-text("Run preview")');
  await pageA.waitForSelector('.w-full.h-80.bg-white', { timeout: 15000 });
  let sourceA = await pageA.locator('span:has-text("Source:") > span').innerText();
  expect(sourceA).toBe('backend_duckdb_preview');

  // Verify A doesn't have B's columns (e.g. sku should not be in A)
  // Delivery should have 'route' or similar
  const headersA = await pageA.locator('th').allTextContents();
  expect(headersA.join(', ').toLowerCase()).not.toContain('sku');

  // 6. Execute B
  await pageB.click('button:has-text("Run preview")');
  await pageB.waitForSelector('.w-full.h-80.bg-white', { timeout: 15000 });
  let sourceB = await pageB.locator('span:has-text("Source:") > span').innerText();
  expect(sourceB).toBe('backend_duckdb_preview');

  // Verify B doesn't have A's columns
  const headersB = await pageB.locator('th').allTextContents();
  expect(headersB.join(', ').toLowerCase()).not.toContain('route');

  // 7. Execute A again
  await pageA.click('button:has-text("Run preview")');
  await pageA.waitForTimeout(1000); // Wait a bit for execution
  let sourceA2 = await pageA.locator('span:has-text("Source:") > span').innerText();
  expect(sourceA2).toBe('backend_duckdb_preview');
  
  const headersA2 = await pageA.locator('th').allTextContents();
  expect(headersA2.join(', ').toLowerCase()).not.toContain('sku');
});
