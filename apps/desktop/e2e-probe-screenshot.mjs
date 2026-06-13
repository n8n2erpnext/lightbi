import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const deliveryCsv = path.resolve(__dirname, '../../delivery_performance_reports.csv');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/');
  await page.setInputFiles('input[type="file"]', deliveryCsv);
  await page.click('button:has-text("Use this dataset")');
  await page.waitForSelector('text=Dataset Understanding', { timeout: 15000 });
  await page.screenshot({ path: path.join(__dirname, 'e2e-titles.png'), fullPage: true });
  await browser.close();
}
main();
