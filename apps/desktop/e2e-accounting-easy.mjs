import { chromium } from '@playwright/test';
import path from 'node:path';

const sample = path.resolve(process.cwd(), '../../sample-corpus/anchors/1.3.0/Accounting_ERP_June_2026.csv');
const screenshot = '/tmp/lightbi-e2e-accounting-easy.png';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`page:${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console:${message.text()}`);
  });

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.setInputFiles('input[type="file"]', sample);
  await page.getByTestId('canonical-multisource-review').waitFor({ state: 'visible', timeout: 30000 });

  const profitability = page.getByTestId('business-perspective-profitability');
  await profitability.click();
  const collectionAnalyze = page.getByTestId('analyze-selected-perspective');
  if (!(await collectionAnalyze.isEnabled())) throw new Error('Collection profitability action is disabled');
  await collectionAnalyze.click();

  await page.getByTestId('canonical-understanding-summary').waitFor({ state: 'visible', timeout: 30000 });
  const summary = await page.getByTestId('canonical-understanding-summary').innerText();
  if (summary.includes('unknown-grain')) throw new Error('Accounting handoff lost its grain evidence');
  const primary = page.getByTestId('canonical-primary-analysis');
  await primary.waitFor({ state: 'visible', timeout: 30000 });
  const readyText = await page.getByTestId('canonical-count-ready').innerText();
  if (!/[1-9]/.test(readyText)) throw new Error(`No executable analysis after handoff: ${readyText}`);

  const analyze = page.getByTestId('canonical-analyze-perspective');
  if (!(await analyze.isEnabled())) throw new Error('Single-file analysis action is disabled');
  await analyze.click();
  await page.waitForURL('**/investigation', { timeout: 30000 });
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 30000 });
  await page.screenshot({ path: screenshot, fullPage: true });

  console.log(JSON.stringify({
    passed: true,
    summary: summary.replace(/\s+/g, ' ').slice(0, 500),
    readyText,
    url: page.url(),
    consoleErrors: errors,
    screenshot,
  }, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
