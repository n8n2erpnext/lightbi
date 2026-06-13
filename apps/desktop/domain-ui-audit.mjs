import { chromium } from '@playwright/test';
import path from 'path';

const rootDir = path.resolve(process.cwd(), '..', '..');
const outputDir = path.resolve(rootDir, 'sample-data-audit', 'screenshots-runtime-ui');

const files = [
  { prefix: 'good_revenue', path: path.resolve(rootDir, 'sample-data-audit', 'revenue', 'good_revenue.csv') },
  { prefix: 'broken_revenue', path: path.resolve(rootDir, 'sample-data-audit', 'revenue', 'broken_revenue.csv') },
  { prefix: 'good_operations', path: path.resolve(rootDir, 'sample-data-audit', 'operations', 'good_operations.csv') },
  { prefix: 'broken_finance', path: path.resolve(rootDir, 'sample-data-audit', 'finance', 'broken_finance.csv') },
];

async function ensureDir() {
  const fs = await import('fs/promises');
  await fs.mkdir(outputDir, { recursive: true });
}

async function captureDatasetFlow(page, csvPath, prefix) {
  try {
    await page.goto('http://127.0.0.1:5173/');
    
    // Safely clear state between datasets
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    // Go to upload page again to ensure fresh state
    await page.goto('http://127.0.0.1:5173/');

    await page.waitForSelector('text=Upload your first spreadsheet', { state: 'visible', timeout: 5000 }).catch(() => {});
    
    await page.setInputFiles('input[type="file"]', csvPath);
    await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 });
    await page.click('button:has-text("Use this dataset")');

    // Wait for the Home Understanding card
    await page.waitForSelector('text=What LightBI Found', { timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: path.join(outputDir, `${prefix}-home.png`), fullPage: true });

    // Look for any investigate button (might be "Investigate" or inside an opportunity card)
    // Opportunities use "Investigate" button
    const investigateBtn = page.locator('button:has-text("Investigate")').first();
    let hasInvestigate = false;
    let sourceText = '';

    if (await investigateBtn.isVisible().catch(() => false)) {
      hasInvestigate = true;
      await investigateBtn.click();
      
      // Wait for the investigation panel
      await page.waitForSelector('button:has-text("Run preview")', { timeout: 15000 }).catch(() => {});
      await page.screenshot({ path: path.join(outputDir, `${prefix}-investigation-before-run.png`), fullPage: true });

      const runBtn = page.locator('button:has-text("Run preview")');
      if (await runBtn.isVisible()) {
        await runBtn.click();
        
        // Wait for results chart/table to load, but catch timeout to capture failure state
        try {
          await page.waitForSelector('.w-full.h-80.bg-white', { timeout: 15000 });
          await page.waitForTimeout(2000); // Allow charts/canvas to render
          await page.screenshot({ path: path.join(outputDir, `${prefix}-investigation-after-run.png`), fullPage: true });
          sourceText = await page.locator('span:has-text("Source:") > span').innerText().catch(() => '');
        } catch (timeoutErr) {
          console.log(`Run preview timed out for ${prefix}. Capturing failure state.`);
          await page.screenshot({ path: path.join(outputDir, `${prefix}-investigation-after-run-failed.png`), fullPage: true });
          sourceText = 'FAILED';
        }
      } else {
        console.log(`No Run preview button for ${prefix}. Capturing failure state.`);
        await page.screenshot({ path: path.join(outputDir, `${prefix}-investigation-after-run-failed.png`), fullPage: true });
        sourceText = 'NO_BUTTON';
      }
    }
    
    return { hasInvestigate, sourceText };
  } catch (err) {
    console.error(`Error processing ${prefix}:`, err);
    return { error: err.message };
  }
}

async function main() {
  await ensureDir();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const results = {};
  for (const file of files) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 1100 });
    const res = await captureDatasetFlow(page, file.path, file.prefix);
    results[file.prefix] = res;
    await page.close();
  }

  console.log(JSON.stringify({ results, outputDir }, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
