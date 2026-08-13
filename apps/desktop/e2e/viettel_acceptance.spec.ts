import { expect, test, type Page } from '@playwright/test';

const cases = [
  { name: 'Bao_cao_chi_tiet_Ton_kho', files: ['../../sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx'] },
  { name: 'DATA_XUAT', files: ['../../sample data/DATA_XUAT.xlsx'] },
  { name: 'TON_DU_KIEN_HUBLAN', files: ['../../sample data/TỒN DỰ KIẾN HUBLAN.xlsx'] },
  { name: 'bcctnhapTTKT_23122024', files: ['../../sample data/bcctnhapTTKT_23122024.xlsx'] },
  { name: 'bcctnhapTTKT_24122024', files: ['../../sample data/bcctnhapTTKT_24122024.xlsx'] },
  { name: 'Group_A', files: ['../../sample data/bcctnhapTTKT_23122024.xlsx', '../../sample data/bcctnhapTTKT_24122024.xlsx'] },
  { name: 'Group_B', files: ['../../sample data/DATA_XUAT.xlsx', '../../sample data/TỒN DỰ KIẾN HUBLAN.xlsx'] },
  { name: 'Group_C', files: ['../../sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx', '../../sample data/DATA_XUAT.xlsx'] },
  { name: 'Group_D', files: ['../../sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx', '../../sample data/DATA_XUAT.xlsx', '../../sample data/TỒN DỰ KIẾN HUBLAN.xlsx', '../../sample data/bcctnhapTTKT_23122024.xlsx', '../../sample data/bcctnhapTTKT_24122024.xlsx'] },
];

async function openEasyAnalysis(page: Page, files: string[]) {
  await page.goto('http://localhost:5173/');
  await page.locator('input[type="file"]').setInputFiles(files);

  if (files.length === 1) {
    const use = page.getByTestId('use-single-source');
    await expect(use).toBeVisible({ timeout: 180_000 });
    await use.click();
  } else {
    await expect(page.getByTestId('canonical-multisource-review')).toBeVisible({ timeout: 180_000 });
  }

  const selector = page.getByTestId('canonical-business-perspectives');
  await expect(selector).toBeVisible({ timeout: 90_000 });
  const perspectives = selector.locator('button[data-testid^="business-perspective-"]');
  expect(await perspectives.count()).toBeGreaterThanOrEqual(2);
  const ready = perspectives.filter({ hasText: /Ready to analyze|Sẵn sàng phân tích/i });
  expect(await ready.count()).toBeGreaterThanOrEqual(1);
  await ready.first().click();

  const analyze = page.locator('[data-testid="canonical-analyze-perspective"], [data-testid="universal-analyze-perspective"], [data-testid="analyze-selected-perspective"]').first();
  await expect(analyze).toBeEnabled({ timeout: 30_000 });
  await analyze.click();

  // A multi-source perspective may intentionally narrow to one governed
  // source. In that case LightBI presents the normal single-source action
  // before execution; continue through that same Easy Mode contract.
  const finalState = async () => ({
    investigation: /\/investigation/.test(page.url()),
    collection: await page.getByTestId('perspective-collection-result').count(),
    separation: await page.getByText(/period partition duplicate reporting period/i).count(),
  });
  await expect.poll(finalState, { timeout: 30_000 }).not.toEqual({ investigation: false, collection: 0, separation: 0 }).catch(() => undefined);
  if (!/\/investigation/.test(page.url()) && await page.getByTestId('perspective-collection-result').count() === 0 && await page.getByText(/period partition duplicate reporting period/i).count() === 0) {
    const nextAction = page.locator('[data-testid="canonical-analyze-perspective"], [data-testid="universal-analyze-perspective"], [data-testid="analyze-selected-perspective"]').first();
    await expect(nextAction).toBeEnabled({ timeout: 60_000 });
    // Trial waits for React's in-flight replacement to settle, avoiding a
    // false failure when the same action is re-rendered between Easy stages.
    await nextAction.click({ trial: true, timeout: 60_000 });
    await nextAction.click({ timeout: 60_000 });
  }
  const completed = await expect.poll(finalState, { timeout: 120_000 })
    .not.toEqual({ investigation: false, collection: 0, separation: 0 })
    .then(() => true)
    .catch(() => false);
  if (!completed) {
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Relationship:\s*not built/i);
    expect(body).toMatch(/duplicate reporting period/i);
    return 'governed_separation' as const;
  }
  if (await page.getByText(/period partition duplicate reporting period/i).count() > 0) return 'governed_separation' as const;
  return 'analysis' as const;
}

test.describe('Viettel Logistics Sample Acceptance', () => {
  for (const sample of cases) {
    test(`Acceptance ${sample.name}`, async ({ page }) => {
      test.setTimeout(5 * 60_000);
      const outcome = await openEasyAnalysis(page, sample.files);

      if (outcome === 'governed_separation') {
        expect(await page.locator('body').innerText()).not.toMatch(/Failed to fetch|Execution Boundary Failed/i);
        return;
      }

      const collection = page.getByTestId('perspective-collection-result');
      if (await collection.isVisible().catch(() => false)) {
        await expect(collection.locator('canvas')).toBeVisible();
        const deeper = collection.locator('button:not([disabled])').first();
        await expect(deeper).toBeEnabled();
        await deeper.click();
        const deep = page.getByTestId('governed-ba-deep-dive');
        await expect(deep).toBeVisible();
        expect((await deep.innerText()).length).toBeGreaterThan(300);
      } else {
        await expect(page).toHaveURL(/\/investigation/, { timeout: 60_000 });
        await expect(page.getByTestId('investigation-preflight-blocked')).toHaveCount(0);
        await expect(page.getByTestId('chart-preview-canvas').first()).toBeVisible({ timeout: 120_000 });
        await expect(page.getByTestId('supporting-analysis-chart').first()).toBeVisible({ timeout: 30_000 });

        const deeper = page.getByRole('button', { name: /Analyze deeper|Phân tích sâu/i }).first();
        await expect(deeper).toBeEnabled({ timeout: 120_000 });
        await deeper.click();
        const specialized = page.getByTestId('single-source-ba-overview');
        const generic = page.getByRole('complementary').filter({ hasText: /Deep BA analysis|Phân tích BA chuyên sâu/i }).last();
        const deep = await specialized.isVisible().catch(() => false) ? specialized : generic;
        await expect(deep).toBeVisible({ timeout: 60_000 });
        expect((await deep.innerText()).length).toBeGreaterThan(300);
      }
      expect(await page.locator('body').innerText()).not.toMatch(/Analysis Blocked|Failed to fetch|Execution Boundary Failed/i);
    });
  }
});
