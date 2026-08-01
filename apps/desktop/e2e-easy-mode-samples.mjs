import { chromium } from '@playwright/test';
import path from 'node:path';

const allCases = [
  { name: 'logistics', file: '../../sample-corpus/anchors/1.3.0/Logistics_ERP_June_2026.csv', collectionPerspective: 'fulfillment_operations', minimumPerspectives: 3 },
  { name: 'amazon-json', file: '../../sample data/Amazon_1-level_46-MB_minified.json', collectionPerspective: 'sales_performance', minimumPerspectives: 4 },
  { name: 'dirty-logistics', file: '../../sample data/bcctnhapTTKT_19122024.xlsx', collectionPerspective: 'fulfillment_operations', minimumPerspectives: 2 },
];
const cases = process.env.LIGHTBI_E2E_CASE
  ? allCases.filter(item => item.name === process.env.LIGHTBI_E2E_CASE)
  : allCases;

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const item of cases) {
    const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
    const errors = [];
    await page.addInitScript(() => localStorage.setItem('lightbi-display-preferences', JSON.stringify({ state: { preferences: { language: 'vi', locale: 'vi-VN', currencyCode: 'VND', timezone: 'Asia/Ho_Chi_Minh', numberStyle: 'plain', currencyDisplay: 'symbol', decimalPlaces: 'auto', thousandsSeparator: 'locale', negativeStyle: 'minus', dateFormat: 'locale', timeFormat: '24h', datetimeFormat: 'compact' } }, version: 2 })));
    page.on('pageerror', error => errors.push(`page:${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`http:${response.status()}:${response.url()}`); });
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.setInputFiles('input[type="file"]', path.resolve(process.cwd(), item.file));
    await page.getByTestId('canonical-multisource-review').waitFor({ state: 'visible', timeout: 60000 });
    await page.getByTestId(`business-perspective-${item.collectionPerspective}`).click();
    const collectionAnalyze = page.getByTestId('analyze-selected-perspective');
    if (!(await collectionAnalyze.isEnabled())) throw new Error(`${item.name}: collection action disabled`);
    await collectionAnalyze.click();
    await page.getByTestId('canonical-understanding-summary').waitFor({ state: 'visible', timeout: 60000 });
    const perspectiveCards = page.locator('[data-testid^="business-perspective-"]');
    const perspectiveCount = new Set(await perspectiveCards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-testid')))).size;
    if (perspectiveCount < item.minimumPerspectives) throw new Error(`${item.name}: only ${perspectiveCount} perspectives`);
    const selectedReady = page.locator('[data-testid="canonical-primary-analysis"]');
    await selectedReady.waitFor({ state: 'visible', timeout: 60000 });
    if (item.name === 'dirty-logistics') {
      const primaryText = (await selectedReady.innerText()).replace(/\s+/g, ' ');
      if (/How many governed deliveries are present/i.test(primaryText)) throw new Error(`${item.name}: aggregate-only delivery count is still the primary analysis`);
      const readyAngles = page.getByTestId('canonical-ready-angles');
      await readyAngles.waitFor({ state: 'visible', timeout: 30000 });
      const readyCount = Number(await readyAngles.getAttribute('data-ready-count'));
      if (readyCount < 5) throw new Error(`${item.name}: only ${readyCount} executable operational questions`);
    }
    await page.getByTestId('canonical-analyze-perspective').click();
    await page.waitForURL('**/investigation', { timeout: 60000 });
    await page.locator('canvas').waitFor({ state: 'visible', timeout: 60000 });
    await page.getByRole('button', { name: /Analyze deeper|Phân tích sâu/i }).first().click();
    try {
      await page.getByTestId('single-source-ba-overview').waitFor({ state: 'visible', timeout: 30000 });
    } catch (error) {
      const screenshot = `/tmp/lightbi-e2e-${item.name}-failed.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      const modalText = (await page.locator('[role="dialog"]').last().innerText().catch(() => page.locator('body').innerText())).replace(/\s+/g, ' ');
      throw new Error(`${item.name}: rich BA overview missing. Visible analysis: ${modalText.slice(0, 800)}. Screenshot: ${screenshot}`, { cause: error });
    }
    const baText = (await page.getByTestId('single-source-ba-overview').innerText()).replace(/\s+/g, ' ');
    if (!/chỉ số|Lượt giao hàng|Doanh thu|Tổng lượng tồn/i.test(baText)) throw new Error(`${item.name}: BA overview has no business KPIs`);
    if (item.name === 'amazon-json' && !/Doanh thu/i.test(baText)) throw new Error(`${item.name}: commercial source was misclassified as operations`);
    const screenshot = `/tmp/lightbi-e2e-${item.name}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    results.push({ name: item.name, perspectiveCount, ba: baText.slice(0, 360), errors, screenshot });
    await page.close();
  }
  console.log(JSON.stringify({ passed: true, results }, null, 2));
} finally {
  await browser.close();
}
