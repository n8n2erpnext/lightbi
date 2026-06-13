import { chromium } from '@playwright/test';
import path from 'path';

const rootDir = path.resolve(process.cwd(), '..', '..');
const outputDir = path.resolve(rootDir, 'ui-audit');
const deliveryCsv = path.resolve(rootDir, 'delivery_performance_reports.csv');
const inventoryCsv = path.resolve(rootDir, 'inventory_aging_report.csv');

async function ensureDir() {
  const fs = await import('fs/promises');
  await fs.mkdir(outputDir, { recursive: true });
}

async function captureDatasetFlow(page, csvPath, prefix) {
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForSelector('text=Upload your first spreadsheet', { state: 'visible' });
  await page.screenshot({ path: path.join(outputDir, `${prefix}-home-empty.png`), fullPage: true });

  await page.setInputFiles('input[type="file"]', csvPath);
  await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 });
  await page.click('button:has-text("Use this dataset")');

  await page.waitForSelector('text=What LightBI Found', { timeout: 15000 });
  await page.screenshot({ path: path.join(outputDir, `${prefix}-understanding.png`), fullPage: true });

  await page.locator('button:has-text("Investigate")').first().click();
  await page.waitForSelector('button:has-text("Run preview")', { timeout: 15000 });
  await page.screenshot({ path: path.join(outputDir, `${prefix}-investigation-before-run.png`), fullPage: true });

  await page.click('button:has-text("Run preview")');
  await page.waitForSelector('.w-full.h-80.bg-white', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outputDir, `${prefix}-investigation-after-run.png`), fullPage: true });

  const sourceText = await page.locator('span:has-text("Source:") > span').innerText().catch(() => '');
  return { sourceText };
}

async function main() {
  await ensureDir();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  const delivery = await captureDatasetFlow(page, deliveryCsv, 'delivery');
  const inventory = await captureDatasetFlow(page, inventoryCsv, 'inventory');

  console.log(JSON.stringify({ delivery, inventory, outputDir }, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
