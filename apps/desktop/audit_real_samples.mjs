import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const AUDIT_DIR = process.env.LIGHTBI_AUDIT_DIR || '/home/ubuntu/n8n2erpnext/LightBI/ui-audit/real-sample-e2e-final-2026-06-14';
const TARGET_URL = process.env.LIGHTBI_TARGET_URL || 'https://lightbi.thaiduy.digital';
const TARGET_MODE = process.env.LIGHTBI_TARGET_MODE || (TARGET_URL.includes('127.0.0.1') || TARGET_URL.includes('localhost') ? 'LOCALHOST' : 'PRODUCTION');

const SINGLE_EXCEL_FILES = [
  'sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx',
  'sample data/DATA_XUAT.xlsx',
  'sample data/TỒN DỰ KIẾN HUBLAN.xlsx',
  'sample data/bcctnhapTTKT_23122024.xlsx',
  'sample data/bcctnhapTTKT_24122024.xlsx'
];

const SINGLE_CSV_FILES = [
  'sample-data-audit/customer/good_customer.csv',
  'sample-data-audit/customer/broken_customer.csv',
  'sample-data-audit/finance/good_finance.csv',
  'sample-data-audit/finance/broken_finance.csv',
  'sample-data-audit/inventory/good_inventory.csv',
  'sample-data-audit/inventory/broken_inventory.csv',
  'sample-data-audit/operations/good_operations.csv',
  'sample-data-audit/operations/broken_operations.csv',
  'sample-data-audit/performance/good_performance.csv',
  'sample-data-audit/performance/broken_performance.csv',
  'sample-data-audit/revenue/good_revenue.csv',
  'sample-data-audit/revenue/broken_revenue.csv'
];

const MULTI_GROUPS = [
  { name: "Group_1", files: ['sample data/bcctnhapTTKT_23122024.xlsx', 'sample data/bcctnhapTTKT_24122024.xlsx'] },
  { name: "Group_2", files: ['sample data/DATA_XUAT.xlsx', 'sample data/TỒN DỰ KIẾN HUBLAN.xlsx'] },
  { name: "Group_3", files: SINGLE_EXCEL_FILES },
  { name: "Group_4", files: SINGLE_CSV_FILES.filter(f => f.includes('good_')) },
  { name: "Group_5", files: SINGLE_CSV_FILES }
];

async function runAudit() {
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const results = {
    targetUrl: TARGET_URL,
    targetMode: TARGET_MODE,
    startedAt: new Date().toISOString(),
    gitStatus: "",
    singleFileResults: [],
    multiFileResults: []
  };

  const getSafeName = (filepath) => path.basename(filepath).replace(/[^a-zA-Z0-9_-]/g, '_');

  const processTarget = async (target, isMulti) => {
    let safeName;
    let filePathsToUpload;
    
    if (isMulti) {
      safeName = target.name;
      filePathsToUpload = target.files.map(f => path.resolve('/home/ubuntu/n8n2erpnext/LightBI', f));
    } else {
      safeName = getSafeName(target);
      filePathsToUpload = [path.resolve('/home/ubuntu/n8n2erpnext/LightBI', target)];
    }

    console.log(`[START] Testing ${isMulti ? "Group: " + safeName : safeName}`);

    let consoleErrors = [];
    let pageErrors = [];
    let networkErrors = [];

    const page = await context.newPage();

    const onConsole = msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); };
    const onPageError = err => pageErrors.push(err.message);
    const onResponse = resp => { if (resp.status() >= 400 && !resp.url().includes('google-analytics') && !resp.url().includes('fonts')) networkErrors.push(`${resp.status()} ${resp.url()}`); };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    const result = {
      fileOrGroup: isMulti ? target.name : target,
      status: "PARTIAL",
      uploadStatus: "PENDING",
      rowCountVisible: null,
      columnCountVisible: null,
      qualityVisible: null,
      trustStatusVisible: null,
      detectedSignals: [],
      selectedAction: null,
      selectedActionType: null,
      runPreviewStatus: "PENDING",
      errorMessage: null,
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      screenshots: {}
    };

    try {
      await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 120000 });
      
      const fileInput = await page.$('input[type="file"]');
      if (!fileInput) {
        throw new Error("File input not found");
      }

      const inputType = await fileInput.getAttribute('multiple');
      if (isMulti && inputType === null) {
        result.uploadStatus = "FAILED";
        result.errorMessage = "UI does not support multi-file upload (no 'multiple' attribute on input).";
        result.status = "FAIL";
        await page.close();
        return result;
      }

      await fileInput.setInputFiles(filePathsToUpload);

      // Wait for group selection regardless of isMulti because even single files might be grouped
      try {
        let groupOrAnalyze = await Promise.race([
          page.waitForSelector('text=Use this dataset', { timeout: 45000 }).then(() => 'group'),
          page.waitForSelector('text=Analyze', { timeout: 45000 }).then(() => 'analyze'),
          page.waitForSelector('text=Explore dataset structure', { timeout: 45000 }).then(() => 'analyze')
        ]);
        if (groupOrAnalyze === 'group') {
          await page.click('text=Use this dataset');
        }
      } catch (e) {
        // Ignore if not found
      }

      let waitRes = await Promise.race([
        page.waitForSelector('text=Explore dataset structure', { timeout: 120000 }).then(() => 'success'),
        page.waitForSelector('text=Analyze', { timeout: 120000 }).then(() => 'success'),
        page.waitForSelector('text=Dataset overview', { timeout: 120000 }).then(() => 'success')
      ]).catch(() => 'timeout');

      await page.waitForTimeout(3000); 
      const homeScreenshot = path.join(AUDIT_DIR, `${isMulti ? 'multi' : 'single'}__${safeName}__home.png`);
      await page.screenshot({ path: homeScreenshot });
      result.screenshots.home = homeScreenshot;

      if (waitRes === 'timeout') {
        result.uploadStatus = "TIMEOUT";
        result.errorMessage = "Timed out waiting for intake understanding.";
        result.status = "FAIL";
      } else {
        result.uploadStatus = "SUCCESS";
        
        // Grab metrics roughly
        const bodyText = await page.evaluate(() => document.body.innerText);
        
        let match = bodyText.match(/(\d[\d,]*)\s*rows/i);
        if (match) result.rowCountVisible = match[1];
        
        match = bodyText.match(/(\d+)\s*columns/i);
        if (match) result.columnCountVisible = match[1];
        
        match = bodyText.match(/(?:Quality|Health):\s*(\d+%?)/i) || bodyText.match(/(\d+)%\s*Quality/i);
        if (match) result.qualityVisible = match[1];

        const actionButtons = await page.$$('button, div[role="button"]');
        let selectedBtn = null;
        for (const btn of actionButtons) {
          const text = await btn.textContent();
          if (text && text.includes("Explore dataset structure")) {
            selectedBtn = btn;
            result.selectedAction = "Explore dataset structure";
            break;
          }
        }

        if (!selectedBtn) {
          for (const btn of actionButtons) {
            const text = await btn.textContent();
            if (text && (text.includes("Analyze") || text.includes("by") || text.includes("over"))) {
              selectedBtn = btn;
              result.selectedAction = text.trim();
              break;
            }
          }
        }

        if (selectedBtn) {
          await selectedBtn.click();
          await page.waitForTimeout(2000);
          
          const beforeRunScreenshot = path.join(AUDIT_DIR, `${isMulti ? 'multi' : 'single'}__${safeName}__investigation_before.png`);
          await page.screenshot({ path: beforeRunScreenshot });
          result.screenshots.investigation_before = beforeRunScreenshot;

          const runBtn = await page.$('button:has-text("Run"), button:has-text("Execute")');
          if (runBtn) {
            await runBtn.click();
            await page.waitForTimeout(5000); 
            
            const afterRunScreenshot = path.join(AUDIT_DIR, `${isMulti ? 'multi' : 'single'}__${safeName}__investigation_after.png`);
            await page.screenshot({ path: afterRunScreenshot });
            result.screenshots.investigation_after = afterRunScreenshot;
            
            result.runPreviewStatus = "EXECUTED";
          } else {
            result.runPreviewStatus = "NO_RUN_BUTTON";
            result.errorMessage = "Could not find Run/Execute button.";
          }
        } else {
          result.selectedAction = "NONE";
          result.errorMessage = "No analysis actions generated.";
        }
      }

    } catch (e) {
      result.errorMessage = e.message;
      result.status = "FAIL";
    } finally {
      result.consoleErrors = [...consoleErrors];
      result.pageErrors = [...pageErrors];
      result.networkErrors = [...networkErrors];

      await page.close();

      if (result.status !== "FAIL") {
        const errorString = JSON.stringify(result.consoleErrors) + JSON.stringify(result.pageErrors);
        if (errorString.includes("ERROR") || errorString.includes("failed") || errorString.includes("CANONICAL_PROJECTION_MISSING") || errorString.includes("DUCKDB_")) {
          result.status = "FAIL";
        } else if (result.runPreviewStatus === "EXECUTED") {
          result.status = "PASS";
        } else {
          result.status = "PARTIAL";
        }
      }

      console.log(`[DONE] ${isMulti ? "Group: " + safeName : safeName} -> ${result.status}`);
      return result;
    }
  };

  for (const f of SINGLE_EXCEL_FILES) {
    results.singleFileResults.push(await processTarget(f, false));
  }
  for (const f of SINGLE_CSV_FILES) {
    results.singleFileResults.push(await processTarget(f, false));
  }
  for (const g of MULTI_GROUPS) {
    results.multiFileResults.push(await processTarget(g, true));
  }

  try {
    results.gitStatus = execSync('cd /home/ubuntu/n8n2erpnext/LightBI && git status --short && git log --oneline -5').toString();
  } catch(e) {}

  fs.writeFileSync(path.join(AUDIT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  console.log('Results saved to ' + path.join(AUDIT_DIR, 'results.json'));

  await browser.close();
}

runAudit().catch(console.error);
