import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('DPR-9 uses one shared deterministic report page model', async () => {
  const planner = await read('apps/desktop/src/lib/analysis-report-plan.ts');
  const exporter = await read('apps/desktop/src/lib/analysis-report-export.ts');
  assert.match(planner, /lightbi\.analysis-report-plan\.v1/);
  for (const role of [
    'executive_summary', 'answer_overview', 'performance_overview',
    'drivers_components', 'explanation_status', 'recommendations_risks', 'evidence_appendix',
  ]) assert.match(planner, new RegExp(`['"]${role}['"]`), `missing report role ${role}`);
  assert.match(exporter, /createAnalysisReportPlan/);
  assert.match(exporter, /collectAnalysisReportSections/);
  assert.match(exporter, /withExpandedReportDetails/);
  assert.match(exporter, /zipSync/);
  assert.match(exporter, /pdf\.addPage\(\)/);
});

test('DPR-9 removes giant-image crop pagination from both Deep BA exporters', async () => {
  const single = await read('apps/desktop/src/components/investigation/InvestigationDeepAnalysis.tsx');
  const multi = await read('apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx');
  for (const source of [single, multi]) {
    assert.match(source, /saveAnalysisReportPngPages/);
    assert.match(source, /saveAnalysisReportPdf/);
    assert.match(source, /data-report-plan="lightbi\.analysis-report-plan\.v1"/);
    assert.doesNotMatch(source, /from ['"]html-to-image['"]/);
    assert.doesNotMatch(source, /from ['"]jspdf['"]/);
    assert.doesNotMatch(source, /margin - offset/);
  }
});
test('DPR-9 maps Deep BA and Step 2 screen sections to semantic report roles', async () => {
  const narrative = await read('apps/desktop/src/components/investigation/AnalysisNarrativeBoard.tsx');
  const selected = await read('apps/desktop/src/components/investigation/SelectedSubjectInvestigationBoard.tsx');
  const comparison = await read('apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx');

  assert.match(narrative, /data-report-role="answer_overview"/);
  assert.match(narrative, /REPORT_ROLE_BY_NARRATIVE_ROLE/);
  assert.match(narrative, /data-report-export-expand="true"/);

  for (const role of ['performance_overview', 'answer_overview', 'drivers_components', 'explanation_status', 'recommendations_risks', 'evidence_appendix']) {
    assert.match(selected, new RegExp(`data-report-role="${role}"`), `Step 2 missing ${role}`);
  }
  assert.match(selected, /data-report-break-before="true"/);
  assert.match(selected, /data-report-export-expand="true"/);

  for (const role of ['executive_summary', 'performance_overview', 'explanation_status', 'drivers_components', 'evidence_appendix']) {
    assert.match(comparison, new RegExp(`data-report-role="${role}"`), `comparison missing ${role}`);
  }
  assert.match(comparison, /data-report-role="recommendations_risks"/);
  assert.match(comparison, /data-report-break-before="true"/);
  assert.match(comparison, /data-report-export-expand="true"/);
});
