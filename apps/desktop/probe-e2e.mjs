import { chromium } from '@playwright/test';
import path from 'path';

const rootDir = path.resolve(process.cwd());
const outputDir = path.resolve(rootDir, 'e2e-probe');
const deliveryCsv = path.resolve(rootDir, 'delivery_performance_reports.csv');

async function ensureDir() {
  const fs = await import('fs/promises');
  await fs.mkdir(outputDir, { recursive: true });
}

async function probeE2E(page, csvPath, targetAnalysis) {
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForSelector('text=Upload your first spreadsheet', { state: 'visible' });

  await page.setInputFiles('input[type="file"]', csvPath);
  await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 });
  await page.click('button:has-text("Use this dataset")');

  await page.waitForSelector('text=Dataset Understanding', { timeout: 15000 }).catch(async (err) => {
      await page.screenshot({ path: path.join(outputDir, `e2e-probe-error.png`), fullPage: true });
      throw err;
  });
  
  if (targetAnalysis && !isNaN(parseInt(targetAnalysis, 10))) {
    const index = parseInt(targetAnalysis, 10);
    await page.locator('button:has-text("Investigate")').nth(index).click();
  } else if (targetAnalysis) {
    // Wait for the specific analysis text to appear, then click its Investigate button
    await page.locator(`div.analysis-card:has(h4:has-text("${targetAnalysis}"))`).locator('button:has-text("Investigate")').first().click();
  } else {
    await page.locator('.analysis-card').first().locator('button:has-text("Investigate")').click();
  }
  
  await page.waitForSelector('button:has-text("Run preview")', { timeout: 15000 });
  await page.click('button:has-text("Run preview")');

  // We wait for either the success chart or the failure boundary
  await Promise.race([
    page.waitForSelector('.w-full.h-80.bg-white', { timeout: 15000 }), // Success chart container
    page.waitForSelector('text=Execution Boundary Failed', { timeout: 15000 }) // Failure box
  ]).catch(() => console.log('Timeout waiting for execution result'));

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, `e2e-probe-result.png`), fullPage: true });

  const statusText = await page.locator('span:has-text("EXECUTED"), span:has-text("FAILED")').first().innerText().catch(() => '');
  const sourceText = await page.locator('span:has-text("Source:") > span').innerText().catch(() => '');
  const failureText = await page.locator('text=DUCKDB_WASM_RUNTIME_FAILED').innerText().catch(() => '');

  return { statusText, sourceText, failureText };
}

async function main() {
  const targetAnalysis = process.argv[2] || "";
  await ensureDir();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  const result = await probeE2E(page, deliveryCsv, targetAnalysis);

  console.log(JSON.stringify({ result, outputDir }, null, 2));
  await browser.close();
  
  if (result.failureText || result.statusText === 'FAILED') {
      console.log('E2E WASM RUNTIME FAILED.');
      process.exit(1);
  } else {
      console.log('E2E WASM RUNTIME SUCCEEDED!');
      process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
