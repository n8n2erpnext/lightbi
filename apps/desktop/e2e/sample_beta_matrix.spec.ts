import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DATA_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv', '.tsv', '.json']);
const roots = [
  { category: 'real_samples', directory: path.resolve('../../sample data') },
  { category: 'corpus_fixtures', directory: path.resolve('../../sample-corpus/versions/1.4.0/fixtures') },
  { category: 'domain_audit', directory: path.resolve('../../sample-data-audit') },
  { category: 'erp_anchors', directory: path.resolve('../../sample-corpus/anchors/1.3.0') },
];

type Fixture = { category: string; filePath: string; file: string };
type MatrixResult = {
  category: string;
  file: string;
  status: 'passed' | 'failed';
  failedStage?: string;
  error?: string;
  durationMs: number;
  perspectives: number;
  readyPerspectives: number;
  selectedPerspective: string;
  primaryQuestion: string;
  supportingCharts: number;
  specializedBA: boolean;
  baLength: number;
  qualityFlags: string[];
  mojibakeSamples?: string[];
};

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(resolved) : [resolved];
  });
}

const allFixtures: Fixture[] = roots.flatMap(root => walk(root.directory)
  .filter(filePath => DATA_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
  .filter(filePath => !/domain-audit-results\.json$/i.test(filePath))
  .map(filePath => ({
    category: root.category,
    filePath,
    file: path.relative(root.directory, filePath),
  })))
  .sort((a, b) => `${a.category}/${a.file}`.localeCompare(`${b.category}/${b.file}`));
const sampleFilter = process.env.LIGHTBI_SAMPLE_FILTER?.trim();
const fixtures = sampleFilter
  ? allFixtures.filter(fixture => new RegExp(sampleFilter, 'i').test(`${fixture.category}/${fixture.file}`))
  : allFixtures;

const matrixResults: MatrixResult[] = [];
const reportPath = path.resolve('../../ui-audit/sample-beta-matrix.json');

function writeReport(): void {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const temporaryPath = `${reportPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: fixtures.length,
    passed: matrixResults.filter(result => result.status === 'passed').length,
    failed: matrixResults.filter(result => result.status === 'failed').length,
    results: matrixResults,
  }, null, 2), 'utf8');
  fs.renameSync(temporaryPath, reportPath);
}

async function waitForSupportingCharts(page: Page): Promise<number> {
  const charts = page.getByTestId('supporting-analysis-chart');
  await expect.poll(() => charts.count(), { timeout: 15_000 }).toBeGreaterThanOrEqual(1).catch(() => undefined);
  return charts.count();
}

test.describe('Complete Beta sample acceptance matrix', () => {
  test.setTimeout(45 * 60_000);

  test(`all ${fixtures.length} user and governed sample files`, async ({ page }) => {
    if (!sampleFilter) expect(fixtures.length, 'The complete VPS sample inventory should be present').toBeGreaterThanOrEqual(46);
    else expect(fixtures.length, `No sample matched LIGHTBI_SAMPLE_FILTER=${sampleFilter}`).toBeGreaterThan(0);

    for (const fixture of fixtures) {
      const startedAt = Date.now();
      let stage = 'open_home';
      const result: MatrixResult = {
        category: fixture.category,
        file: fixture.file,
        status: 'failed',
        durationMs: 0,
        perspectives: 0,
        readyPerspectives: 0,
        selectedPerspective: '',
        primaryQuestion: '',
        supportingCharts: 0,
        specializedBA: false,
        baLength: 0,
        qualityFlags: [],
      };

      try {
        await page.goto('http://localhost:5173/');
        await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 30_000 });

        stage = 'import';
        await page.setInputFiles('input[type="file"]', fixture.filePath);
        const use = page.getByTestId('use-single-source');
        await expect(use).toBeVisible({ timeout: 180_000 });
        await use.click();

        stage = 'understanding_and_perspectives';
        const selector = page.getByTestId('canonical-business-perspectives');
        await expect(selector).toBeVisible({ timeout: 90_000 });
        const perspectives = selector.locator('button[data-testid^="business-perspective-"]');
        result.perspectives = await perspectives.count();
        const ready = perspectives.filter({ hasText: /Ready to analyze|Sẵn sàng phân tích/i });
        result.readyPerspectives = await ready.count();
        expect(result.perspectives, `${fixture.file}: perspectives`).toBeGreaterThanOrEqual(2);
        expect(result.readyPerspectives, `${fixture.file}: executable perspectives`).toBeGreaterThanOrEqual(1);

        stage = 'select_perspective';
        const selected = ready.first();
        result.selectedPerspective = (await selected.getAttribute('data-testid')) ?? '';
        await selected.click();
        const analyze = page.locator('[data-testid="canonical-analyze-perspective"], [data-testid="universal-analyze-perspective"]').first();
        await expect(analyze).toBeEnabled({ timeout: 30_000 });
        await analyze.click();

        stage = 'governed_execution';
        await expect(page).toHaveURL(/\/investigation/, { timeout: 30_000 });
        await expect(page.getByTestId('investigation-preflight-blocked')).toHaveCount(0);
        const chart = page.getByTestId('chart-preview-canvas').first();
        const run = page.locator('[data-run-preview="true"]');
        const deeper = page.getByRole('button', { name: /Analyze deeper|Phân tích sâu/i }).first();
        await expect(deeper).toBeEnabled({ timeout: 120_000 }).catch(async () => {
          await expect(run).toBeEnabled({ timeout: 30_000 });
          await run.click();
          await expect(deeper).toBeEnabled({ timeout: 120_000 });
        });
        if (!await chart.isVisible()) {
          await chart.waitFor({ state: 'visible', timeout: 30_000 });
        }
        result.primaryQuestion = (await page.locator('h1').first().innerText()).trim();
        result.supportingCharts = await waitForSupportingCharts(page);
        if (result.supportingCharts === 0) result.qualityFlags.push('no_supporting_chart');

        stage = 'deep_ba';
        await deeper.click();
        const specialized = page.getByTestId('single-source-ba-overview');
        await specialized.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => undefined);
        result.specializedBA = await specialized.isVisible().catch(() => false);
        const deep = result.specializedBA
          ? specialized
          : page.getByRole('complementary').filter({ hasText: /Deep BA analysis|Phân tích BA chuyên sâu/i }).last();
        await expect(deep).toBeVisible({ timeout: 60_000 });
        const deepText = (await deep.innerText()).trim();
        result.baLength = deepText.length;
        expect(result.baLength, `${fixture.file}: BA depth`).toBeGreaterThan(300);
        if (!result.specializedBA) result.qualityFlags.push('generic_ba_only');

        const visibleText = `${await page.locator('body').innerText()}\n${deepText}`;
        expect(visibleText).not.toMatch(/Analysis Blocked|Execution Boundary Failed|DUCKDB error|Failed to fetch|Analysis unavailable/i);
        // Do not flag legitimate Vietnamese capitals such as PHÂN or MÃ.
        // These sequences represent the characteristic UTF-8-as-Latin-1 corruption.
        const mojibakePattern = /\u00c3[\u00a0-\u00bf\u0080-\u009f]|\u00c4[\u0080-\u00bf]|\u00e1\u00ba.|\u00e1\u00bb.|\u00e2\u20ac./gu;
        const mojibakeMatches = [...visibleText.matchAll(mojibakePattern)];
        if (mojibakeMatches.length > 0) {
          result.qualityFlags.push('mojibake_visible');
          result.mojibakeSamples = mojibakeMatches.slice(0, 5).map(match => {
            const index = match.index ?? 0;
            return visibleText.slice(Math.max(0, index - 40), index + 80).replace(/\s+/g, ' ');
          });
        }
        expect(deepText).not.toMatch(/Mã Phiếu Gửi\s+(?:increased|decreased|varies|largest contributor)/i);

        // Domain-focused files may legitimately expose two perspectives (for
        // example Operations + Data Trust). Flag only a true one-angle dead
        // end; breadth inside a perspective is measured by supporting charts.
        if (result.perspectives < 2) result.qualityFlags.push('thin_perspective_set');
        if (/stock movement/i.test(result.primaryQuestion) && /public-indicators|world bank/i.test(`${fixture.category}/${fixture.file}`)) {
          result.qualityFlags.push('false_inventory_semantics');
        }
        result.status = 'passed';
      } catch (error) {
        result.failedStage = stage;
        result.error = error instanceof Error ? error.message.slice(0, 2_000) : String(error);
      } finally {
        result.durationMs = Date.now() - startedAt;
        matrixResults.push(result);
        writeReport();
        await page.goto('about:blank').catch(() => undefined);
      }
    }

    const failures = matrixResults.filter(result => result.status === 'failed');
    expect(failures, `${failures.length} sample files failed; inspect ${reportPath}`).toEqual([]);
  });
});
