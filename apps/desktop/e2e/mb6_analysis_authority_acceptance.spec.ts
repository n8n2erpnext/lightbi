import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.LIGHTBI_E2E_BASE_URL ?? 'http://localhost:5173';

function healthcareCsv(): string {
  return [
    'Patient ID,Appointment ID,Provider,Diagnosis',
    'PAT-001,APT-001,DR-NGUYEN,J11',
    'PAT-002,APT-002,DR-TRAN,E11',
    'PAT-003,APT-003,DR-LE,I10',
    'PAT-004,APT-004,DR-NGUYEN,J45',
    'PAT-005,APT-005,DR-TRAN,E78',
  ].join('\n');
}

async function clickGovernedChartPoint(page: Page, chart: Locator): Promise<void> {
  const canvas = chart.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Chart canvas has no bounding box');
  const xRatios = [0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85];
  const yRatios = [0.72, 0.58, 0.82, 0.45];
  for (const yRatio of yRatios) {
    for (const xRatio of xRatios) {
      await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
      if (await page.getByTestId('investigation-drill-through').isVisible().catch(() => false)) return;
    }
  }
  throw new Error('No governed chart point opened drill-through');
}

async function assertEvidenceBoundAuthority(authority: Locator, scope: RegExp): Promise<void> {
  await expect(authority).toBeVisible({ timeout: 30_000 });
  await expect(authority).toContainText('Evidence-bound inferred domain');
  await expect(authority).toContainText(scope);
  await expect(authority).toContainText('healthcare');
  await expect(authority).toContainText('Semantic inference (Micro Brain)');
  await expect(authority).toContainText('Not production-active');
  await expect(authority).toContainText('no matched governed metric authority');
  await expect(authority).toContainText('Formula: not independently authorized');
  const text = await authority.innerText();
  expect(text).not.toMatch(/\b\d{1,3}%\b/);
  expect(text.toLowerCase()).not.toContain('similarity');
  expect(text.toLowerCase()).not.toContain('evidencerank');
  expect(text.toLowerCase()).not.toContain('confidence');
}

test.describe('MB-6 analysis authority propagation', () => {
  test.setTimeout(90_000);

  test('preserves inferred-domain authority through Deep BA and selected-row Step 2', async ({ page }) => {
    await page.goto(`${BASE_URL}/app`);
    await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 30_000 });
    await page.setInputFiles('input[type="file"]', {
      name: 'healthcare_mb6.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(healthcareCsv(), 'utf-8'),
    });

    await page.getByRole('button', { name: 'Analyze this source' }).click();
    const domainSummary = page.getByTestId('domain-inference-summary');
    await expect(domainSummary).toBeVisible({ timeout: 30_000 });
    await expect(domainSummary).toContainText('Healthcare');
    await expect(domainSummary).toContainText('Evidence-bound inferred domain');
    await expect(domainSummary).toContainText('Not production-active');

    await page.getByTestId('business-perspective-operations').click();
    const analyze = page.getByTestId('canonical-analyze-perspective').or(page.getByTestId('universal-analyze-perspective'));
    await expect(analyze.first()).toBeVisible({ timeout: 30_000 });
    await analyze.first().click();
    await expect(page).toHaveURL(/\/investigation/, { timeout: 30_000 });

    const deepButton = page.getByTestId('perspective-deep-analysis-button');
    await expect(deepButton).toBeVisible({ timeout: 30_000 });
    await expect(deepButton).toBeEnabled({ timeout: 30_000 });
    await deepButton.click();

    const deepAuthority = page.getByTestId('ba-analysis-authority').first();
    await assertEvidenceBoundAuthority(deepAuthority, /Deep BA/i);
    const deepSurface = page.getByTestId('deep-analysis-export-surface');
    await expect(deepSurface).toContainText('Business analysis from 5 data rows');
    await expect(deepSurface).toContainText(/does not contain a numeric metric suitable for this perspective/i);

    await page.getByTestId('deep-analysis-back').click();
    const chart = page.getByTestId('chart-preview-canvas').first();
    await expect(chart).toBeVisible({ timeout: 30_000 });
    await clickGovernedChartPoint(page, chart);

    const drill = page.getByTestId('investigation-drill-through');
    await expect(drill).toBeVisible({ timeout: 30_000 });
    const analyzeSelected = page.getByTestId('analyze-selected-rows');
    await expect(analyzeSelected).toBeEnabled({ timeout: 30_000 });
    await analyzeSelected.click();

    await expect(page.getByText(/Deep BA analysis · Step 2/i)).toBeVisible({ timeout: 30_000 });
    const step2Authority = page.getByTestId('ba-analysis-authority').first();
    await assertEvidenceBoundAuthority(step2Authority, /Step 2 · selected rows/i);
  });
});
