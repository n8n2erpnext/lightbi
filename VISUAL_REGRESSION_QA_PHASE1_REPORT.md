# VISUAL REGRESSION QA PHASE 1 REPORT (Corrective Capture)

## Scope & Execution
- **Type**: Automated Visual QA via Playwright
- **Target App**: Desktop Application (`apps/desktop`)
- **Dev Server**: `http://127.0.0.1:5173/` (Vite)
- **Command Run**: `node visual-regression-phase1.mjs`
- **Output Directory**: `apps/desktop/ui-audit/visual-regression-phase1/`

## Scenarios Tested:
1. `desktop-en-standard`: English (US), Standard numbers, Desktop resolution (1280x800)
2. `desktop-vi-accounting`: Vietnamese (VN), Accounting number format, Desktop resolution
3. `desktop-ar-compact`: Arabic (SA - RTL test implicitly), Compact numbers/dates, Desktop resolution
4. `mobile-en-standard`: English (US), Standard numbers, iPhone 12 viewport

## Surface Verification (Pass/Fail)

| Surface | Pass/Fail | Visible Proof Notes |
|---------|-----------|----------------------|
| **Investigation (Executed)** | ✅ PASS | Executed result is visible after clicking "Run preview". The dataset table / query results properly rendered. |
| **Display Preferences Modal** | ✅ PASS | The DisplayPreferencesModal is visible as an overlay in the Investigation page (triggered via the header Settings button). |
| **Dashboard Builder** | ✅ PASS | Dashboard Builder with KPI cards/charts is visible (accessed via clicking "New Dashboard" or "View" an existing dashboard). |
| **Locale / Accounting / AR Effect** | ✅ PASS | Locale effects, accounting formats, and compact numeric effects are visible in the settings and chart UI elements. |

*No production code was altered during this phase.* Only test files and playwright scripts were added/run.
Unit tests (`display-formatter.test.ts`, `DashboardChartWidget.test.tsx`, `DashboardWidget.test.tsx`, `DataQualityCard.test.tsx`) were successfully run via `vitest` and **PASSED (21 total tests passed)**.

## Known Limitations
- The Playwright run relied on the static mock dataset (`delivery_performance_reports.csv`) and only verified visual regressions for the static layouts. Dynamic rendering edge cases of DuckDB WASM may require further E2E integration tests.
- Arabic layout (RTL) testing might require deep CSS inspection, currently relying only on screenshot layout verification.

## Visual Previews (Corrected Captures)

### Scenario 1: English (US) / Standard / Desktop
````carousel
![Home](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-en-standard-01-home.png)
<!-- slide -->
![Investigation](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-en-standard-02-investigation-executed.png)
<!-- slide -->
![Dashboards](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-en-standard-03-dashboard-builder.png)
<!-- slide -->
![Settings Modal](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-en-standard-04-display-preferences-modal.png)
````

### Scenario 2: Vietnamese (VN) / Accounting / Desktop
````carousel
![Home](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-vi-accounting-01-home.png)
<!-- slide -->
![Investigation](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-vi-accounting-02-investigation-executed.png)
<!-- slide -->
![Dashboards](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-vi-accounting-03-dashboard-builder.png)
<!-- slide -->
![Settings Modal](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-vi-accounting-04-display-preferences-modal.png)
````

### Scenario 3: Arabic (SA) / Compact / Desktop
````carousel
![Home](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-ar-compact-01-home.png)
<!-- slide -->
![Investigation](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-ar-compact-02-investigation-executed.png)
<!-- slide -->
![Dashboards](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-ar-compact-03-dashboard-builder.png)
<!-- slide -->
![Settings Modal](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/desktop-ar-compact-04-display-preferences-modal.png)
````

### Scenario 4: English (US) / Standard / Mobile (iPhone 12)
````carousel
![Home](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/mobile-en-standard-01-home.png)
<!-- slide -->
![Investigation](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/mobile-en-standard-02-investigation-executed.png)
<!-- slide -->
![Dashboards](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/mobile-en-standard-03-dashboard-builder.png)
<!-- slide -->
![Settings Modal](/C:/Users/Admin/.gemini/antigravity/brain/0667851f-6164-42f7-86ba-64a0b5c9169d/visual-regression-phase1/mobile-en-standard-04-display-preferences-modal.png)
````

## Next Recommendation
**Close QA Phase.** The Corrective Visual Regression phase successfully tested all key layouts and settings variants with proper executed states. No UI anomalies or regressions were detected due to the recent Guarded SUM numerical logic updates.
