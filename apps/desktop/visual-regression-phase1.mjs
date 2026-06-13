import { chromium, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

const rootDir = process.cwd();
const outputDir = path.resolve(rootDir, 'ui-audit', 'visual-regression-phase1');
const deliveryCsv = path.resolve(rootDir, '..', '..', 'delivery_performance_reports.csv');

async function ensureDir() {
  await fs.mkdir(outputDir, { recursive: true });
}

async function setPreferences(page, prefs) {
  await page.evaluate((p) => {
    const data = {
      state: { preferences: { ...p } },
      version: 0
    };
    window.localStorage.setItem('lightbi-display-preferences', JSON.stringify(data));
  }, prefs);
}

async function runAudit() {
  await ensureDir();
  const browser = await chromium.launch({ headless: true });
  
  const basePrefs = {
    locale: 'en-US',
    timezone: 'auto',
    numberStyle: 'plain',
    currencyDisplay: 'symbol',
    decimalPlaces: 'auto',
    thousandsSeparator: 'locale',
    negativeStyle: 'minus',
    dateFormat: 'locale',
    timeFormat: 'locale',
    datetimeFormat: 'locale'
  };

  const scenarios = [
    { name: 'desktop-en-standard', prefs: { ...basePrefs, locale: 'en-US', numberStyle: 'plain' }, mobile: false },
    { name: 'desktop-vi-accounting', prefs: { ...basePrefs, locale: 'vi-VN', numberStyle: 'accounting' }, mobile: false },
    { name: 'desktop-ar-compact', prefs: { ...basePrefs, locale: 'ar-SA', numberStyle: 'plain', datetimeFormat: 'compact' }, mobile: false },
    { name: 'mobile-en-standard', prefs: { ...basePrefs, locale: 'en-US', numberStyle: 'plain' }, mobile: true },
  ];

  for (const s of scenarios) {
    const context = await browser.newContext(
      s.mobile ? { ...devices['iPhone 12'] } : { viewport: { width: 1280, height: 800 } }
    );
    const page = await context.newPage();
    
    // Set preferences before loading
    await page.goto('http://127.0.0.1:5173/');
    await setPreferences(page, s.prefs);
    await page.reload();

    console.log(`Running scenario: ${s.name}`);

    // 1. Capture Home (Empty)
    await page.waitForSelector('text=Upload your first spreadsheet', { state: 'visible', timeout: 5000 }).catch(()=>null);
    await page.screenshot({ path: path.join(outputDir, `${s.name}-01-home.png`), fullPage: true });

    // Upload dataset to unlock Investigation
    await page.setInputFiles('input[type="file"]', deliveryCsv);
    await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 }).catch(()=>null);
    if (await page.locator('button:has-text("Use this dataset")').count() > 0) {
      await page.click('button:has-text("Use this dataset")');
    }
    await page.waitForSelector('text=What LightBI Found', { timeout: 15000 }).catch(()=>null);

    // Click Investigate
    const investigateBtn = await page.locator('button', { hasText: /^Investigate$/ });
    if (await investigateBtn.count() > 0) {
      await investigateBtn.first().click();
    }
    
    // 2. Capture Investigation Executed Preview
    await page.waitForTimeout(2000); 
    const runPreviewBtn = await page.locator('button', { hasText: /^Run preview$/ });
    if (await runPreviewBtn.count() > 0) {
      await runPreviewBtn.first().click();
      await page.waitForTimeout(3000); // wait for query execution and render
    }
    await page.screenshot({ path: path.join(outputDir, `${s.name}-02-investigation-executed.png`), fullPage: true });

    // 3. Capture Settings Modal (Display Preferences)
    const settingsBtn = await page.locator('button', { hasText: /^Settings$/ });
    if (await settingsBtn.count() > 0) {
      await settingsBtn.first().click();
      await page.waitForTimeout(1000); // wait for modal animation
    } else {
      // Fallback for settings if button text differs
      const settingsIcon = await page.locator('svg.lucide-settings').first();
      if (await settingsIcon.count() > 0) {
         await settingsIcon.click();
         await page.waitForTimeout(1000);
      }
    }
    await page.screenshot({ path: path.join(outputDir, `${s.name}-04-display-preferences-modal.png`), fullPage: true });

    // Close settings modal if possible (click outside or X button)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 4. Capture Dashboard Builder
    await page.goto('http://127.0.0.1:5173/dashboards');
    await page.waitForTimeout(1000);
    const viewLinks = await page.locator('text=View');
    if (await viewLinks.count() > 0) {
      await viewLinks.first().click();
      await page.waitForTimeout(2000); // wait for dashboard render
    } else {
      // Fallback: click New Dashboard
      const newDashBtn = await page.locator('text=New Dashboard');
      if (await newDashBtn.count() > 0) {
        await newDashBtn.first().click();
        await page.waitForTimeout(2000);
      }
    }
    await page.screenshot({ path: path.join(outputDir, `${s.name}-03-dashboard-builder.png`), fullPage: true });

    await context.close();
  }

  await browser.close();
}

runAudit().then(() => console.log('Visual Regression QA Phase 1 Corrective completed.')).catch(console.error);
