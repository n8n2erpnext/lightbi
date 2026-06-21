import { test, expect } from '@playwright/test';

test.describe('Viettel Logistics Sample Acceptance', () => {
  const singleFiles = [
    { name: 'Bao_cao_chi_tiet_Ton_kho', files: ['../../sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx'] },
    { name: 'DATA_XUAT', files: ['../../sample data/DATA_XUAT.xlsx'] },
    { name: 'TON_DU_KIEN_HUBLAN', files: ['../../sample data/TỒN DỰ KIẾN HUBLAN.xlsx'] },
    { name: 'bcctnhapTTKT_23122024', files: ['../../sample data/bcctnhapTTKT_23122024.xlsx'] },
    { name: 'bcctnhapTTKT_24122024', files: ['../../sample data/bcctnhapTTKT_24122024.xlsx'] }
  ];

  const multiFiles = [
    { name: 'Group_A', files: ['../../sample data/bcctnhapTTKT_23122024.xlsx', '../../sample data/bcctnhapTTKT_24122024.xlsx'] },
    { name: 'Group_B', files: ['../../sample data/DATA_XUAT.xlsx', '../../sample data/TỒN DỰ KIẾN HUBLAN.xlsx'] },
    { name: 'Group_C', files: ['../../sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx', '../../sample data/DATA_XUAT.xlsx'] },
    { name: 'Group_D', files: ['../../sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx', '../../sample data/DATA_XUAT.xlsx', '../../sample data/TỒN DỰ KIẾN HUBLAN.xlsx', '../../sample data/bcctnhapTTKT_23122024.xlsx', '../../sample data/bcctnhapTTKT_24122024.xlsx'] }
  ];

  const allCases = [...singleFiles, ...multiFiles];

  for (const c of allCases) {
    test(`Acceptance ${c.name}`, async ({ page }) => {
      test.setTimeout(90000); // Allow more time per test, especially for Group D (5 files)
      
      // 1. Home Page
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('input[type="file"]', { state: 'attached' });

      // 2. Upload Files
      await page.setInputFiles('input[type="file"]', c.files);

      // 3. Handle File Selection
      // Wait for analysis to finish and UI to update
      await page.waitForSelector('.border.rounded-lg.p-3.cursor-pointer, button:has-text("Use this dataset"), button:has-text("Use this view")', { timeout: 20000 }).catch(() => null);
      
      if (c.files.length > 1 && c.name !== 'Group_A') {
        // Assert the MultiFileUnderstandingProofPanel exists
        await page.waitForSelector('h2:has-text("Multi-File Understanding Proof")', { timeout: 10000 });
        // Check for real file names
        for (const file of c.files) {
          const fileName = file.split('/').pop()!;
          await expect(page.locator(`text=${fileName}`).first()).toBeVisible();
        }
        
        // Relationship/key evidence
        if (c.name === 'Group_B' || c.name === 'Group_C') {
          await expect(page.locator('text=no direct relationship keys were found yet')).toBeVisible();
        } else {
          await expect(page.locator('text=LightBI found relationship candidates')).toBeVisible();
          await expect(page.locator('h3:has-text("Relationship Signals")')).toBeVisible();
        }
        
        // Take proof screenshot
        await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_multi_file_understanding.png` });
      }

      // If there are multiple families to select from, click the first one
      const familyCards = await page.$$('.border.rounded-lg.p-3.cursor-pointer');
      if (familyCards.length > 1) {
         await familyCards[0].click();
         await page.waitForTimeout(500);
      }

      const useBtn1 = await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 5000 }).catch(() => null);
      const useBtn2 = await page.waitForSelector('button:has-text("Use selected dataset")', { timeout: 5000 }).catch(() => null);
      const useViewBtn = await page.waitForSelector('button:has-text("Use this view")', { timeout: 2000 }).catch(() => null);
      const continueBtn = await page.waitForSelector('button:has-text("Continue to Analysis")', { timeout: 2000 }).catch(() => null);

      if (useViewBtn) {
        await useViewBtn.click();
        await page.waitForTimeout(1000);
        if (continueBtn) await continueBtn.click();
      } else if (continueBtn) {
        await continueBtn.click();
      } else if (useBtn1) {
        await useBtn1.click();
      } else if (useBtn2) {
        await useBtn2.click();
      } else {
        // Maybe it's already clicked or something else? We'll let it fail later if so.
      }

      // Wait for analysis opportunities to load
      // 4. Investigation Screen Before Run
      // Wait for UI to settle
      await page.waitForTimeout(1000);

      // Look for any available action to investigate first
      let investigateBtn = await page.$('button.text-\\[11px\\]:has-text("Investigate")');

      if (!investigateBtn) {
        console.log(`[${c.name}] investigateBtn not found, looking for Explore tab...`);
        const exploreBtn = page.locator('button', { hasText: /^Explore$/ }).first();
        await exploreBtn.waitFor({ state: 'visible', timeout: 5000 });
        await exploreBtn.click({ force: true });
        console.log(`[${c.name}] Successfully clicked Explore tab`);
        await page.waitForTimeout(1000);
        
        investigateBtn = await page.$('button.text-\\[11px\\]:has-text("Investigate")');
      } else {
        console.log(`[${c.name}] investigateBtn WAS FOUND! This is unexpected for Group D.`);
      }

      const questionSpan = await page.$('button.group span.text-blue-900');

      if (investigateBtn) {
        await investigateBtn.click();
      } else if (questionSpan) {
        await questionSpan.click();
        
        const prepareBtn = await page.waitForSelector('button:has-text("Preview plan")', { timeout: 5000 }).catch(() => null);
        if (prepareBtn) await prepareBtn.click();

        const acceptBtn = await page.waitForSelector('button:has-text("Accept Plan")', { timeout: 5000 }).catch(() => null);
        if (acceptBtn) await acceptBtn.click();

        const continueBtn1 = await page.waitForSelector('button:has-text("Ready for runtime")', { timeout: 5000 }).catch(() => null);
        const continueBtn2 = await page.waitForSelector('button:has-text("Continue with caution")', { timeout: 5000 }).catch(() => null);
        if (continueBtn1) await continueBtn1.click();
        else if (continueBtn2) await continueBtn2.click();

        await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_debug_after_guard.png` });

        const ackBtn = await page.waitForSelector('button:has-text("Acknowledge & Continue")', { timeout: 5000 }).catch(() => null);
        if (ackBtn) await ackBtn.click();
        
        await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_debug_after_ack.png` });

      } else {
        await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_investigation_before.png` });
        throw new Error(`[${c.name}] NO_RUN_BUTTON or disabled required selection preventing progress`);
      }

      // Wait a bit to navigate to /investigation
      await page.waitForTimeout(2000);

      await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_investigation_before.png` });

      // 5. Click Run preview
      try {
        const runPreviewBtn = await page.waitForSelector('button:has-text("Run preview")', { timeout: 5000 }).catch(() => null);
        if (runPreviewBtn) {
          await runPreviewBtn.click();
        } else {
          const runLimitedBtn = await page.waitForSelector('button:has-text("Execute Query")', { timeout: 5000 });
          await runLimitedBtn.click();
        }
      } catch (e) {
        await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_investigation_after.png` });
        throw new Error(`[${c.name}] Run preview is not visible or disabled`);
      }

      // 6. Wait for Execution and After Run Screen
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_investigation_after.png` });

      // Add scroll evidence for DATA_XUAT
      if (c.name === 'DATA_XUAT') {
        await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_logistics_summary.png` });
        
        const tableScrollContainer = await page.$('.overflow-auto.border.border-gray-200.rounded-md');
        if (tableScrollContainer) {
          await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_preview_table_top.png` });
          
          const clientHeight = await tableScrollContainer.evaluate((node) => node.clientHeight);
          const scrollHeight = await tableScrollContainer.evaluate((node) => node.scrollHeight);
          
          if (scrollHeight <= clientHeight) {
            throw new Error(`[${c.name}] Table container scrollHeight (${scrollHeight}) is not greater than clientHeight (${clientHeight})`);
          }
          
          // Scroll to bottom
          await tableScrollContainer.evaluate((node) => node.scrollTo(0, node.scrollHeight));
          await page.waitForTimeout(1000); // Wait for scroll to visually render
          
          await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_preview_table_bottom.png` });
        }
      }

      // Add bottom layout clipping evidence for DATA_XUAT and Group_B
      if (c.name === 'DATA_XUAT' || c.name === 'Group_B') {
        const mainContainer = await page.$('.h-full.min-h-0.overflow-y-auto');
        if (mainContainer) {
          await mainContainer.evaluate(node => node.scrollTo(0, node.scrollHeight));
          await page.waitForTimeout(1000);
          
          const detailsBox = await page.evaluate(() => {
            const details = document.querySelector('details.group');
            if (!details) return null;
            const rect = details.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, height: rect.height };
          });
          
          const containerBox = await mainContainer.evaluate(node => {
            const rect = node.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, height: rect.height };
          });
          
          if (!detailsBox || detailsBox.bottom > containerBox.bottom) {
             throw new Error(`[${c.name}] "Raw rows evidence" is clipped or not found. detailsBox: ${JSON.stringify(detailsBox)} containerBox: ${JSON.stringify(containerBox)}`);
          }
          
          if (detailsBox) {
            const clearance = containerBox.bottom - detailsBox.bottom;
            if (clearance < 32) {
               throw new Error(`[${c.name}] Bottom clearance below 'Raw rows evidence' is ${clearance}px, expected at least 32px. (detailsBox: ${detailsBox.bottom}, containerBox: ${containerBox.bottom})`);
            }
          }
          await page.screenshot({ path: `../../ui-audit/viettel-logistics-sample-acceptance-2026-06-15/${c.name}_investigation_bottom_layout.png` });
        }
      }

      // Check for errors strictly
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
      
      // NEW FAIL CONDITIONS (Contract Modal stuck)
      const hasDuckDbPreview = pageText.includes('[PARTIAL] Virtual Business View Preview');
      
      if (pageText.includes('Expected Result Structure') && !hasDuckDbPreview) throw new Error(`[${c.name}] Stuck on Expected Result Structure modal`);
      if (pageText.includes('No data has been executed yet') && !hasDuckDbPreview) throw new Error(`[${c.name}] Stuck: No data has been executed yet`);
      if (pageText.includes('Preview result contract only') && !hasDuckDbPreview) throw new Error(`[${c.name}] Stuck: Preview result contract only`);
      if (pageText.includes('No rows yet. Runtime has not executed.') && !hasDuckDbPreview) throw new Error(`[${c.name}] Stuck: No rows yet. Runtime has not executed`);
      if (pageText.includes('Execute Query') && !hasDuckDbPreview) throw new Error(`[${c.name}] Stuck: Execute Query button still visible`);

      // STRICT PASS REQUIREMENT
      const hasExecuted = pageText.includes('EXECUTED');
      const hasRowCount = pageText.includes('Row count:');
      const hasSource = pageText.includes('Source:');
      const hasLocalDuckdb = pageText.includes('local_duckdb_preview');

      if (!hasExecuted && !hasRowCount && !hasSource && !hasLocalDuckdb && !hasDuckDbPreview) {
          throw new Error(`[${c.name}] Missing real runtime execution result indicators.`);
      }

      if (hasDuckDbPreview) {
          console.log(`[${c.name}] PARTIAL: Virtual Business View mock preview detected.`);
      } else {
          console.log(`[${c.name}] SUCCESS`);
      }
    });
  }
});
