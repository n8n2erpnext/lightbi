# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verify.spec.ts >> Verify Delivery Performance Reports
- Location: verify.spec.ts:4:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "backend_duckdb_preview"
Received: "js_sandbox_fallback"
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e7]: L
      - generic [ref=e8]: LightBI
    - navigation [ref=e9]:
      - link "Home" [ref=e10] [cursor=pointer]:
        - /url: /
        - img [ref=e11]
        - generic [ref=e14]: Home
      - link "Dashboards" [ref=e15] [cursor=pointer]:
        - /url: /dashboards
        - img [ref=e16]
        - generic [ref=e21]: Dashboards
      - link "Charts" [ref=e22] [cursor=pointer]:
        - /url: /charts
        - img [ref=e23]
        - generic [ref=e26]: Charts
      - link "Datasets" [ref=e27] [cursor=pointer]:
        - /url: /datasets
        - img [ref=e28]
        - generic [ref=e32]: Datasets
      - link "Data Sources" [ref=e33] [cursor=pointer]:
        - /url: /datasources
        - img [ref=e34]
        - generic [ref=e37]: Data Sources
    - link "Settings" [ref=e39] [cursor=pointer]:
      - /url: /settings
      - img [ref=e40]
      - generic [ref=e43]: Settings
    - button [ref=e44] [cursor=pointer]:
      - img [ref=e45]
  - main [ref=e47]:
    - generic [ref=e48]:
      - generic [ref=e49]:
        - button "Back to Home" [ref=e50] [cursor=pointer]:
          - img [ref=e51]
        - generic [ref=e53]:
          - heading "Shipment activity by route" [level=1] [ref=e54]
          - generic [ref=e55]:
            - generic [ref=e56]: "Dataset: delivery_performance_reports.csv"
            - generic [ref=e57]: •
            - generic [ref=e58]: group_by
      - main [ref=e59]:
        - generic [ref=e60]:
          - generic [ref=e61]:
            - generic [ref=e62]:
              - heading "Chart preview will appear here" [level=2] [ref=e63]
              - paragraph [ref=e64]: LightBI has prepared this analysis. Execution will run in the next phase.
            - generic [ref=e66]:
              - img [ref=e67]
              - text: "Expected chart: bar chart"
          - generic [ref=e70]:
            - generic [ref=e71]:
              - generic [ref=e72]: Dimensions
              - generic [ref=e74]: route
            - generic [ref=e75]:
              - generic [ref=e76]: Measures
              - generic [ref=e78]: shipment
          - generic [ref=e83]:
            - generic [ref=e84]:
              - heading "Preview execution" [level=3] [ref=e85]
              - button "Run preview" [ref=e86] [cursor=pointer]
            - generic [ref=e87]:
              - generic [ref=e88]:
                - generic [ref=e89]: EXECUTED
                - generic [ref=e90]: "Row count: 1"
                - generic [ref=e91]: •
                - generic [ref=e92]:
                  - img [ref=e93]
                  - text: "Source:"
                  - generic [ref=e97]: js_sandbox_fallback
              - table [ref=e99]:
                - rowgroup [ref=e100]:
                  - row "route shipment_count" [ref=e101]:
                    - columnheader "route" [ref=e102]
                    - columnheader "shipment_count" [ref=e103]
                - rowgroup [ref=e104]:
                  - row "0" [ref=e105]:
                    - cell [ref=e106]
                    - cell "0" [ref=e107]
        - button "Show developer diagnostics Runtime intent, logical plan and SQL preview." [ref=e109] [cursor=pointer]:
          - generic [ref=e110]:
            - img [ref=e112]
            - generic [ref=e116]:
              - heading "Show developer diagnostics" [level=3] [ref=e117]
              - paragraph [ref=e118]: Runtime intent, logical plan and SQL preview.
          - img [ref=e120]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import path from 'path';
  3  | 
  4  | test('Verify Delivery Performance Reports', async ({ page }) => {
  5  |   const logs: string[] = [];
  6  |   page.on('console', msg => {
  7  |     if (msg.text().startsWith('TRACE')) {
  8  |       logs.push(msg.text());
  9  |       console.log(msg.text());
  10 |     }
  11 |   });
  12 | 
  13 |   await page.goto('http://localhost:5173/');
  14 |   
  15 |   // Wait for the app to load
  16 |   await page.waitForSelector('text=Upload your first spreadsheet', { state: 'visible' });
  17 | 
  18 |   // Use setInputFiles directly on the hidden input
  19 |   await page.setInputFiles('input[type="file"]', path.resolve('../../delivery_performance_reports.csv'));
  20 | 
  21 |   // Wait for and click 'Use this dataset'
  22 |   await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 });
  23 |   await page.click('button:has-text("Use this dataset")');
  24 | 
  25 |   // Wait for Analysis Opportunity cards
  26 |   await page.waitForSelector('button:has-text("Investigate")');
  27 |   
  28 |   // Click the first card
  29 |   await page.locator('button:has-text("Investigate")').first().click();
  30 | 
  31 |   // Wait for Investigation page to load and 'Run preview' button
  32 |   await page.waitForSelector('button:has-text("Run preview")', { timeout: 15000 });
  33 |   
  34 |   // Click Run preview
  35 |   await page.click('button:has-text("Run preview")');
  36 | 
  37 |   // Wait for the chart to render
  38 |   await page.waitForSelector('.w-full.h-80.bg-white', { timeout: 15000 });
  39 |   await page.waitForTimeout(1000); // Give ECharts time to animate
  40 | 
  41 |   // Assert visible source badge is backend_duckdb_preview
  42 |   const sourceText = await page.locator('span:has-text("Source:") > span').innerText();
> 43 |   expect(sourceText).toBe('backend_duckdb_preview');
     |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  44 | 
  45 |   // Take screenshot
  46 |   await page.screenshot({ path: '../../delivery_performance_chart.png' });
  47 |   
  48 |   console.log('DELIVERY_LOGS:', JSON.stringify(logs));
  49 | });
  50 | 
  51 | test('Verify Inventory Aging Report', async ({ page }) => {
  52 |   const logs: string[] = [];
  53 |   page.on('console', msg => {
  54 |     if (msg.text().startsWith('TRACE')) {
  55 |       logs.push(msg.text());
  56 |       console.log(msg.text());
  57 |     }
  58 |   });
  59 | 
  60 |   await page.goto('http://localhost:5173/');
  61 |   
  62 |   await page.waitForSelector('text=Upload your first spreadsheet', { state: 'visible' });
  63 | 
  64 |   await page.setInputFiles('input[type="file"]', path.resolve('../../inventory_aging_report.csv'));
  65 | 
  66 |   await page.waitForSelector('button:has-text("Use this dataset")', { timeout: 15000 });
  67 |   await page.click('button:has-text("Use this dataset")');
  68 | 
  69 |   await page.waitForSelector('button:has-text("Investigate")');
  70 |   
  71 |   await page.locator('button:has-text("Investigate")').first().click();
  72 | 
  73 |   await page.waitForSelector('button:has-text("Run preview")', { timeout: 15000 });
  74 |   
  75 |   await page.click('button:has-text("Run preview")');
  76 | 
  77 |   await page.waitForSelector('.w-full.h-80.bg-white', { timeout: 15000 });
  78 |   await page.waitForTimeout(1000);
  79 | 
  80 |   // Assert visible source badge is backend_duckdb_preview
  81 |   const sourceText2 = await page.locator('span:has-text("Source:") > span').innerText();
  82 |   expect(sourceText2).toBe('backend_duckdb_preview');
  83 | 
  84 |   await page.screenshot({ path: '../../inventory_aging_chart.png' });
  85 |   
  86 |   console.log('INVENTORY_LOGS:', JSON.stringify(logs));
  87 | });
  88 | 
```