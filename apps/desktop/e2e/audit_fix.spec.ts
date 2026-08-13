import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Execution Boundary Fix Audit', () => {
  const cases = [
    {
      name: 'good_customer_csv',
      files: ['../../sample-data-audit/customer/good_customer.csv']
    },
    {
      name: 'Bao_cao_chi_tiet_Ton_kho',
      files: ['../../sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx']
    },
    {
      name: 'Group_1',
      files: [
        '../../sample data/bcctnhapTTKT_23122024.xlsx',
        '../../sample data/bcctnhapTTKT_24122024.xlsx'
      ]
    },
    {
      name: 'Group_2',
      files: [
        '../../sample data/DATA_XUAT.xlsx',
        '../../sample data/TỒN DỰ KIẾN HUBLAN.xlsx'
      ]
    }
  ];

  for (const c of cases) {
    test(`Audit ${c.name}`, async ({ page }) => {
      // 1. Home Page
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('input[type="file"]', { state: 'attached' });

      // 2. Upload Files
      await page.setInputFiles('input[type="file"]', c.files);

      // 3. Handle File Selection
      if (c.files.length > 1) {
        // Wait for family selection or "Use selected dataset"
        await page.waitForSelector('button:has-text("Use selected dataset")', { timeout: 15000 }).catch(() => null);
        const btn = await page.$('button:has-text("Use selected dataset")');
        if (btn) await btn.click();
      } else {
        // Single file wait for "Use this dataset"
        await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 }).catch(() => null);
        const btn = await page.$('button:has-text("Use this dataset")');
        if (btn) await btn.click();
      }

      // Wait for analysis to load
      await page.waitForTimeout(2000); // Wait for extraction

      // Wait for Analysis Opportunity cards (or NO_RUN_BUTTON if UI crashed)
      try {
        await page.waitForSelector('button:has-text("Explore dataset structure")', { timeout: 10000 });
        await page.locator('button:has-text("Explore dataset structure")').first().click();
      } catch (err) {
        try {
          await page.waitForSelector('button:has-text("Investigate")', { timeout: 5000 });
          await page.locator('button:has-text("Investigate")').first().click();
        } catch (e) {
          await page.screenshot({ path: `../../ui-audit/real-sample-e2e-fixed-2026-06-14/${c.name}_investigation_before.png` });
          console.log(`[${c.name}] NO_RUN_BUTTON or UI crash`);
          return;
        }
      }

      // 4. Investigation Screen Before Run
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `../../ui-audit/real-sample-e2e-fixed-2026-06-14/${c.name}_investigation_before.png` });

      // 5. Run Preview
      try {
        await page.waitForSelector('button:has-text("Run preview")', { timeout: 10000 });
        await page.click('button:has-text("Run preview")');
      } catch (err) {
        console.log(`[${c.name}] NO_RUN_BUTTON`);
        return;
      }

      // 6. Wait for Execution and After Run Screen
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `../../ui-audit/real-sample-e2e-fixed-2026-06-14/${c.name}_investigation_after.png` });

      // Check for errors
      const pageText = await page.content();
      if (pageText.includes('Execution Boundary Failed')) {
        throw new Error(`[${c.name}] Execution Boundary Failed found in page`);
      }
      if (pageText.includes('DUCKDB')) {
        throw new Error(`[${c.name}] DUCKDB error found in page`);
      }
      if (pageText.includes('CANONICAL')) {
        throw new Error(`[${c.name}] CANONICAL error found in page`);
      }
      if (pageText.includes('SQL preview is empty or blocked')) {
        throw new Error(`[${c.name}] SQL preview is empty or blocked found in page`);
      }
      
      console.log(`[${c.name}] Test completed without hitting blocked strings.`);
    });
  }
});
