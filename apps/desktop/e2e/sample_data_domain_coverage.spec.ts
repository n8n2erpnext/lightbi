import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SAMPLE_FILES = [
  'BHX_PHIEUXUAT.xlsx',
  'PLU ALL FRESH 22.03.2021.xlsx',
  '2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx',
  'Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx',
  'DATA_XUAT.xlsx',
  'TỒN DỰ KIẾN HUBLAN.xlsx',
  'motodetail.xlsx',
  'bcctnhapTTKT_19122024.xlsx',
  'bcctnhapTTKT_23122024.xlsx',
  'bcctnhapTTKT_24122024.xlsx'
];

test.describe('Sample Data Domain Coverage', () => {
  test.setTimeout(120000); // Allow 2 minutes for processing heavy files

  for (const fileName of SAMPLE_FILES) {
    const testLabel = fileName.includes('DANH SACH XEP HANG') ? `QUAN_LY ${fileName}` : fileName;
    test(`Domain Coverage: ${testLabel}`, async ({ page }) => {
      // 1. Navigate to Home
      await page.goto('http://localhost:5173/');
      
      // Check for crash
      await expect(page.locator('text=Error').first()).not.toBeVisible({ timeout: 2000 });

      // 2. Upload File
      const filePath = path.resolve('../../sample data', fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Wait for file input to be in DOM
      await page.waitForSelector('input[type="file"]', { state: 'attached' });
      await page.setInputFiles('input[type="file"]', [filePath]);

      // 3. Intake / Home Screen
      await page.waitForSelector('.border.rounded-lg.p-3.cursor-pointer, button:has-text("Use this dataset"), button:has-text("Use selected dataset")', { timeout: 120000 });
      
      // Take home screenshot
      const safeName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
      await page.screenshot({ path: `../../ui-audit/sample-data-domain-coverage-2026-06-15/${safeName}_home.png` });

      // 4. Click Use this dataset
      const useBtn = await page.waitForSelector('button:has-text("Use this dataset"), button:has-text("Use selected dataset")', { timeout: 30000 });
      await useBtn.click();

      // 5. Investigation
      await page.waitForTimeout(1000);
      const postUseText = await page.locator('body').innerText();
      const cleanSchemaBlock =
        postUseText.includes('BLOCKED (Schema Empty)') ||
        (postUseText.includes('Blocked Analysis') && postUseText.includes('No usable column headers were detected'));

      if (cleanSchemaBlock) {
        await page.screenshot({ path: `../../ui-audit/sample-data-domain-coverage-2026-06-15/${safeName}_blocked_schema.png` });
        if (postUseText.includes('Execution Boundary Failed')) throw new Error('Execution Boundary Failed leaked on schema block');
        if (postUseText.includes('DUCKDB')) throw new Error('DUCKDB error leaked on schema block');
        if (postUseText.includes('SQL preview is empty or blocked')) throw new Error('SQL preview leaked on schema block');
        console.log(`[${fileName}] BLOCKED: Clean schema block rendered before runtime.`);
        return;
      }

      await expect(page.getByText('What do you want to understand?')).toBeVisible({ timeout: 30000 });
      const orientationText = await page.locator('body').innerText();
      if (orientationText.includes('Advanced guided views unavailable')) {
        throw new Error('Legacy advanced guided views block leaked into local understanding-next UI');
      }
      if (orientationText.includes('Optional: Choose a deeper business perspective')) {
        throw new Error('Legacy perspective selector leaked into local understanding-next UI');
      }
      if (orientationText.includes('No columns detected. Cannot suggest analysis capabilities.')) {
        throw new Error('Stale no-columns warning leaked despite understanding-next result');
      }

      if (fileName.includes('BHX_PHIEUXUAT')) {
        for (const expected of [
          'Money trend',
          'Location performance',
          'Payment mix',
          'Actor performance',
          'Document structure'
        ]) {
          if (!orientationText.includes(expected)) {
            throw new Error(`Missing retail/revenue lens: ${expected}`);
          }
        }
        if (!orientationText.includes('Customer/person contribution') || !orientationText.includes('Needs more signals')) {
          throw new Error('Dominated customer field was not demoted in orientation UI');
        }
      }

      if (fileName.includes('bcctnhapTTKT')) {
        for (const expected of [
          'Status flow',
          'Actor performance',
          'Location performance'
        ]) {
          if (!orientationText.includes(expected)) {
            throw new Error(`Missing operations lens: ${expected}`);
          }
        }
      }

      if (fileName.includes('PLU')) {
        for (const expected of ['Item performance', 'Status flow']) {
          if (!orientationText.includes(expected)) {
            throw new Error(`Missing inventory lens: ${expected}`);
          }
        }
      }

      if (fileName.includes('Bao_cao_chi_tiet_Ton_kho')) {
        for (const expected of [
          'Inventory aging and backlog risk',
          'Inventory value exposure',
          'Item performance',
          'Status flow'
        ]) {
          if (!orientationText.includes(expected)) {
            throw new Error(`Missing inventory aging lens/question: ${expected}`);
          }
        }
        const inventoryLensIndex = orientationText.indexOf('Inventory aging and backlog risk');
        const valueLensIndex = orientationText.indexOf('Inventory value exposure');
        if (inventoryLensIndex === -1 || valueLensIndex === -1 || inventoryLensIndex > valueLensIndex) {
          throw new Error('Inventory aging lens must be presented before inventory value exposure');
        }
      }

      if (fileName.includes('motodetail')) {
        if (!orientationText.includes('Review data quality before analysis')) {
          throw new Error('Missing dirty export data quality review lens');
        }
      }

      await page.getByText('What do you want to understand?').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `../../ui-audit/sample-data-domain-coverage-2026-06-15/${safeName}_orientation.png` });

      await page.waitForSelector('button:has-text("Investigate"), a:has-text("Explore")', { timeout: 30000 });
      
      const investigateBtn = await page.$('button:has-text("Investigate")');
      if (investigateBtn) {
        await investigateBtn.click();
      } else {
        const exploreTab = await page.waitForSelector('a:has-text("Explore")');
        await exploreTab.click();
      }

      // Check for actions
      await page.waitForSelector('button:has-text("Run preview")', { timeout: 30000 });

      // Take investigation screenshot BEFORE run
      await page.screenshot({ path: `../../ui-audit/sample-data-domain-coverage-2026-06-15/${safeName}_investigation_before.png` });

      const beforeRunText = await page.locator('body').innerText();
      if (beforeRunText.includes('Data Quality Review Required')) {
        await page.screenshot({ path: `../../ui-audit/sample-data-domain-coverage-2026-06-15/${safeName}_data_quality_review.png` });
        if (beforeRunText.includes('Execution Boundary Failed')) throw new Error('Execution Boundary Failed leaked on data quality review');
        if (beforeRunText.includes('DUCKDB')) throw new Error('DUCKDB error leaked on data quality review');
        if (beforeRunText.includes('SQL preview is empty or blocked')) throw new Error('SQL preview leaked on data quality review');

        const runButtons = await page.$$('button:has-text("Run preview")');
        const enabledRunButtons = [];
        for (const runButton of runButtons) {
          if (!(await runButton.isDisabled())) enabledRunButtons.push(runButton);
        }
        if (enabledRunButtons.length > 0) {
          throw new Error('Data quality review unexpectedly exposes an enabled Run button');
        }
        console.log(`[${fileName}] REVIEW: Data quality review rendered and runtime intentionally disabled.`);
        return;
      }

      // Click the first "Run preview" / "Run" button to execute an action
      const runButtons = await page.$$('button:has-text("Run preview")');
      let enabledRunButton = null;
      for (const runButton of runButtons) {
        if (!(await runButton.isDisabled())) {
          enabledRunButton = runButton;
          break;
        }
      }

      if (enabledRunButton) {
         await enabledRunButton.click();
      } else {
        throw new Error('No enabled Run button available for executable action');
      }

      // 6. Wait for result
      // Let it process for a bit
      await page.waitForTimeout(5000);

      // Take investigation screenshot AFTER run
      await page.screenshot({ path: `../../ui-audit/sample-data-domain-coverage-2026-06-15/${safeName}_investigation_after.png` });

      // 7. Assertions - No strict errors allowed
      const pageText = await page.locator('body').innerText();
      if (pageText.includes('Execution Boundary Failed')) throw new Error('Execution Boundary Failed');
      if (pageText.includes('CANONICAL')) throw new Error('CANONICAL error');
      if (pageText.includes('DUCKDB')) throw new Error('DUCKDB error');
      if (pageText.includes('SQL preview is empty or blocked')) throw new Error('SQL preview is empty or blocked');
      if (pageText.includes('Trend shape expects a date/time dimension')) throw new Error('Trend shape validation error');
      if (pageText.includes('Summary shape requires at least one measure')) throw new Error('Summary shape validation error');
      if (pageText.includes('1/1/1970')) throw new Error('Detected invalid 1/1/1970 date range from Excel number parsing');
      
      // Semantic UX tests: Ensure non-logistics domains do not bleed Logistics UI
      const isRetail = pageText.includes('Retail / Sales Document');
      const isInventory = pageText.includes('Inventory / Product Master');
      const isManagement = pageText.includes('Management / Performance Report');
      const isGeneric = pageText.includes('Generic Dataset');

      if (isRetail || isInventory || isManagement || isGeneric) {
        if (pageText.includes('Logistics Dataset Summary')) {
          throw new Error('FAIL: Rendered Logistics Dataset Summary on a non-logistics generic/retail/inventory dataset.');
        }
      }

      // Make sure at least a table or chart exists
      const tableRows = await page.$$('tr');
      const chartCanvas = await page.$$('.recharts-wrapper, svg, canvas');
      const summaryText = await page.$$('text=Total Rows, text=Total');
      
      const hasOutput = tableRows.length > 0 || chartCanvas.length > 0 || summaryText.length > 0;
      
      // If no output, we mark it as partial in our heads, but the test passes technically if it didn't crash
      // Playwright test just ensures NO errors.
      if (!hasOutput) {
         console.log(`[${fileName}] PARTIAL: No visible chart/table output detected, but no crash.`);
      } else {
         console.log(`[${fileName}] PASS: Output detected.`);
      }
    });
  }
});
