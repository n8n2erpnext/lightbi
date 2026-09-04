import { expect, test } from '@playwright/test';

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

test.describe('MB-5 inferred domain acceptance', () => {
  test.setTimeout(90000);

  test('shows semantic inference separately from official domain support', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto(`${BASE_URL}/app`);
    await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 30000 });
    await page.setInputFiles('input[type="file"]', {
      name: 'healthcare_domain_inference.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(healthcareCsv(), 'utf-8'),
    });

    const analyzeSource = page.getByRole('button', { name: 'Analyze this source' });
    await expect(analyzeSource).toBeVisible({ timeout: 30000 });
    await analyzeSource.click();
    const summary = page.getByTestId('domain-inference-summary');
    await expect(summary).toBeVisible({ timeout: 30000 });
    await expect(summary).toContainText('Healthcare');
    await expect(summary).toContainText('Semantic inference (Micro Brain)');
    await expect(summary).toContainText(/Not production-active/i);
    await expect(summary).toContainText('Evidence-bound inferred domain');
    await expect(summary).toContainText('This domain is not officially supported');

    const summaryText = await summary.innerText();
    expect(summaryText).not.toMatch(/\b\d{1,3}%\b/);
    expect(summaryText.toLowerCase()).not.toContain('similarity');
    expect(summaryText).not.toContain('evidenceRank');

    await page.screenshot({
      path: '/tmp/lightbi-mb5-domain-inference-2560x1440.png',
      fullPage: true,
    });

    console.log('--- MB5 DOMAIN INFERENCE SUMMARY ---');
    console.log(summaryText);
    console.log('--- END MB5 DOMAIN INFERENCE SUMMARY ---');
  });
});
