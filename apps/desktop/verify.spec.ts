import { test, expect } from '@playwright/test';
import path from 'path';

test('Verify Delivery Performance Reports', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.text().startsWith('TRACE')) {
      logs.push(msg.text());
      console.log(msg.text());
    }
  });

  await page.goto('http://localhost:5173/');
  
  // Wait for the app to load
  await page.waitForSelector('text=Upload your first spreadsheet', { state: 'visible' });

  // Use setInputFiles directly on the hidden input
  await page.setInputFiles('input[type="file"]', path.resolve('../../delivery_performance_reports.csv'));

  // Wait for and click 'Use this dataset'
  await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 });
  await page.click('button:has-text("Use this dataset")');

  // Wait for Analysis Opportunity cards
  await page.waitForSelector('button:has-text("Investigate")');
  
  // Click the first card
  await page.locator('button:has-text("Investigate")').first().click();

  // Wait for Investigation page to load and 'Run preview' button
  await page.waitForSelector('button:has-text("Run preview")', { timeout: 15000 });
  
  // Click Run preview
  await page.click('button:has-text("Run preview")');

  // Wait for the chart to render
  await page.waitForSelector('.w-full.h-80.bg-white', { timeout: 15000 });
  await page.waitForTimeout(1000); // Give ECharts time to animate

  // Assert visible source badge is backend_duckdb_preview
  const sourceText = await page.locator('span:has-text("Source:") > span').innerText();
  expect(sourceText).toBe('backend_duckdb_preview');

  // Take screenshot
  await page.screenshot({ path: '../../delivery_performance_chart.png' });
  
  console.log('DELIVERY_LOGS:', JSON.stringify(logs));
});

test('Verify Inventory Aging Report', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.text().startsWith('TRACE')) {
      logs.push(msg.text());
      console.log(msg.text());
    }
  });

  await page.goto('http://localhost:5173/');
  
  await page.waitForSelector('text=Upload your first spreadsheet', { state: 'visible' });

  await page.setInputFiles('input[type="file"]', path.resolve('../../inventory_aging_report.csv'));

  await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 });
  await page.click('button:has-text("Use this dataset")');

  await page.waitForSelector('button:has-text("Investigate")');
  
  await page.locator('button:has-text("Investigate")').first().click();

  await page.waitForSelector('button:has-text("Run preview")', { timeout: 15000 });
  
  await page.click('button:has-text("Run preview")');

  await page.waitForSelector('.w-full.h-80.bg-white', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Assert visible source badge is backend_duckdb_preview
  const sourceText2 = await page.locator('span:has-text("Source:") > span').innerText();
  expect(sourceText2).toBe('backend_duckdb_preview');

  await page.screenshot({ path: '../../inventory_aging_chart.png' });
  
  console.log('INVENTORY_LOGS:', JSON.stringify(logs));
});
