import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const RESTORED_MARK_SHA = '47220c4ae55ec2fc9abb6d621cb1c2c3f638c956620144ceb5a922de5b8889a5';

test('DPR-10 owner-restored mark is the single desktop/favicon SVG authority', async () => {
  const mark = await readFile(new URL('../apps/desktop/public/branding/lightbi-icon.svg', import.meta.url));
  const favicon = await readFile(new URL('../apps/desktop/public/favicon.svg', import.meta.url));
  assert.equal(sha256(mark), RESTORED_MARK_SHA);
  assert.deepEqual(favicon, mark);
});

test('DPR-10 sidebar keeps Bell clear of brand chrome and retires the floating account card', async () => {
  const shell = await read('apps/desktop/src/components/layout/AppLayout.tsx');
  const headerStart = shell.indexOf('{/* Header / Logo Area */}');
  const headerEnd = shell.indexOf('{/* Navigation */}', headerStart);
  const header = shell.slice(headerStart, headerEnd);
  assert.match(header, /<UpdateNotificationMenu \/>/);
  assert.doesNotMatch(header, /rounded-full bg-violet-100[^\n]*NEXT/);
  assert.match(shell, /Workspace[^\n]*generation\.channel === "internal"[^\n]*NEXT/);
  const footerStart = shell.indexOf('{/* Bottom Navigation */}');
  const footerEnd = shell.indexOf('{/* Main Content */}', footerStart);
  const footer = shell.slice(footerStart, footerEnd);
  assert.match(footer, /border-t border-\[var\(--lb-divider\)\]/);
  assert.doesNotMatch(footer, /w-full rounded-\[14px\] border border-black\/10 bg-white\/80/);
});

test('DPR-10 residual settings surfaces use flat document dividers', async () => {
  const connection = await read('apps/desktop/src/components/settings/ConnectionSettingsPanel.tsx');
  const updates = await read('apps/desktop/src/components/settings/UpdateSettingsPanel.tsx');
  const privacy = await read('apps/desktop/src/components/settings/MicroBrainPrivacyPanel.tsx');
  assert.match(connection, /grid border-y border-\[var\(--lb-divider\)\]/);
  assert.doesNotMatch(connection, /rounded-xl border border-slate-200/);
  assert.match(updates, /border-y border-\[var\(--lb-divider\)\] divide-y/);
  assert.doesNotMatch(updates, /overflow-hidden rounded-2xl border/);
  assert.match(privacy, /border-y border-violet-200/);
  assert.doesNotMatch(privacy, /rounded-xl border border-violet-200/);
});

test('DPR-10 question density and shared whole-product gutters are source contracts', async () => {
  const understanding = await read('apps/desktop/src/components/analysis/UnderstandingNextCard.tsx');
  const home = await read('apps/desktop/src/components/home/HomeWorkspaceView.tsx');
  const charts = await read('apps/desktop/src/pages/Charts.tsx');
  const dashboards = await read('apps/desktop/src/pages/Dashboards.tsx');
  const datasets = await read('apps/desktop/src/pages/Datasets.tsx');
  const sources = await read('apps/desktop/src/pages/DataSources.tsx');
  const investigation = await read('apps/desktop/src/pages/Investigation.tsx');
  const settings = await read('apps/desktop/src/pages/Settings.tsx');
  const tokens = await read('packages/ui/tokens.css');
  const styles = await read('apps/desktop/src/index.css');
  assert.match(understanding, /data-layout="ranked-question-grid"/);
  assert.match(understanding, /lg:grid-cols-2/);
  assert.match(tokens, /--lb-page-gutter-inline: clamp\(20px, 3vw, 48px\)/);
  assert.match(styles, /\.lb-page-gutter \{/);
  for (const source of [home, charts, dashboards, datasets, sources, investigation]) {
    assert.match(source, /lb-page-gutter/);
  }
  assert.match(settings, /lb-inline-gutter/);
  assert.match(settings, /lb-reading-column/);
  assert.doesNotMatch(home, /max-w-\[1240px\][^\n]*(?:px-6|xl:px-12)/);
  assert.doesNotMatch(charts, /max-w-\[1240px\]/);
  assert.doesNotMatch(investigation, /max-w-\[1180px\]/);
});

test('DPR-10 Gate C flattens source/data handoff chrome and bounds intake containment', async () => {
  const datasets = await read('apps/desktop/src/pages/Datasets.tsx');
  const sources = await read('apps/desktop/src/pages/DataSources.tsx');
  const intake = await read('apps/desktop/src/components/data-intake/DataIntakeDrawer.tsx');
  assert.match(datasets, /lb-divider-grid/);
  assert.doesNotMatch(datasets, /rounded-3xl|rounded-2xl|shadow-sm/);
  assert.match(sources, /data-testid="data-source-register"/);
  assert.match(sources, /lb-flat-list/);
  assert.doesNotMatch(sources, /shadow-md|rounded-full/);
  assert.match(intake, /max-w-\[var\(--lb-dialog-width\)\]/);
  assert.doesNotMatch(intake, /w-full bg-white shadow-2xl rounded-b-3xl/);
});

test('DPR-10 Gate C keeps active Home results and utility dialogs on the shared document grammar', async () => {
  const sourceUnderstanding = await read('apps/desktop/src/components/home/HomeSourceUnderstandingSummary.tsx');
  const homeResult = await read('apps/desktop/src/components/home/HomeResultView.tsx');
  const dataPreview = await read('apps/desktop/src/components/home/HomeDataPreviewDialog.tsx');
  const planning = await read('apps/desktop/src/components/home/HomePlanningDialogs.tsx');
  const preferences = await read('apps/desktop/src/components/settings/DisplayPreferencesModal.tsx');
  assert.match(sourceUnderstanding, /data-testid="source-understanding-workspace"/);
  assert.doesNotMatch(sourceUnderstanding, /rounded-2xl|shadow-\[/);
  assert.match(homeResult, /data-testid="home-execution-pipeline"/);
  assert.doesNotMatch(homeResult, /rounded-|shadow-/);
  for (const dialog of [dataPreview, planning, preferences]) {
    assert.match(dialog, /max-w-\[var\(--lb-dialog-width\)\]/);
  }
  assert.match(preferences, /lb-control/);
  assert.doesNotMatch(preferences, /rounded-md border-gray-300 shadow-sm/);
  const home = await read('apps/desktop/src/components/home/HomeWorkspaceView.tsx');
  const understanding = await read('apps/desktop/src/components/analysis/UnderstandingNextCard.tsx');
  assert.match(home, /data-testid="legacy-perspective-selector"/);
  assert.match(home, /data-testid="legacy-business-view-selector"/);
  assert.match(home, /data-layout="analysis-mode-tabs"/);
  assert.doesNotMatch(home, /bg-gradient-to-r from-blue-50 to-indigo-50/);
  assert.match(understanding, /data-testid="understanding-technical-evidence"/);
  assert.match(understanding, /data-testid="canonical-review-nonexecutable"/);
  assert.doesNotMatch(understanding, /canonical-analyze-perspective[^\n]*rounded-xl[^\n]*shadow-sm/);
});

test('DPR-10 Gate C legacy-surface register rejects giant card shells while preserving true containment', async () => {
  const migrated = [
    'apps/desktop/src/components/home/HomeWorkspaceView.tsx',
    'apps/desktop/src/components/home/HomeSourceUnderstandingSummary.tsx',
    'apps/desktop/src/components/home/HomeResultView.tsx',
    'apps/desktop/src/components/analysis/UnderstandingNextCard.tsx',
    'apps/desktop/src/components/analysis/CanonicalMultiSourceReview.tsx',
    'apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx',
    'apps/desktop/src/components/analysis/BusinessFusionOverviewCard.tsx',
    'apps/desktop/src/components/analysis/BusinessFusionOpportunityCard.tsx',
    'apps/desktop/src/components/data-intake/DatabaseStep.tsx',
    'apps/desktop/src/components/data-intake/GoogleSheetsStep.tsx',
    'apps/desktop/src/components/data-intake/BusinessViewReviewCard.tsx',
    'apps/desktop/src/components/data-intake/DatasetSummaryStep.tsx',
    'apps/desktop/src/components/data-intake/RelationshipEvidenceDrawer.tsx',
    'apps/desktop/src/components/analysis/VirtualDatasetPlanPreview.tsx',
    'apps/desktop/src/components/analysis/RuntimePreviewCard.tsx',
    'apps/desktop/src/components/analysis/ExecutionGuardNotice.tsx',
    'apps/desktop/src/components/analysis/DuckDBLogicalPlanPreview.tsx',
    'apps/desktop/src/components/analysis/ExpectedResultPreview.tsx',
    'apps/desktop/src/components/analysis/CompiledQueryPreview.tsx',
    'apps/desktop/src/components/analysis/SandboxPolicyPreview.tsx',
    'apps/desktop/src/components/analysis/PreviewResultContractCard.tsx',
    'apps/desktop/src/pages/Notifications.tsx',
    'apps/desktop/src/pages/Charts.tsx',
    'apps/desktop/src/pages/DashboardBuilder.tsx',
    'apps/desktop/src/pages/Datasets.tsx',
    'apps/desktop/src/pages/DataSources.tsx',
  ];
  for (const path of migrated) {
    const source = await read(path);
    assert.doesNotMatch(source, /rounded-(?:2xl|3xl)|shadow-2xl/, `${path} reintroduced a giant legacy card/sheet`);
  }
  const google = await read('apps/desktop/src/components/data-intake/GoogleSheetsStep.tsx');
  const database = await read('apps/desktop/src/components/data-intake/DatabaseStep.tsx');
  const notifications = await read('apps/desktop/src/pages/Notifications.tsx');
  const fusion = await read('apps/desktop/src/components/analysis/BusinessFusionOverviewCard.tsx');
  const advanced = await read('apps/desktop/src/pages/Advanced.tsx');
  assert.match(google, /lb-control/);
  assert.match(database, /lb-control/);
  assert.match(notifications, /lb-page-gutter/);
  assert.match(notifications, /border-b-2/);
  assert.match(fusion, /border-y border-\[var\(--lb-divider\)\]/);
  assert.doesNotMatch(advanced, /rounded-|shadow-/);
});

test('DPR-10 single and multi-file Deep BA use explicit primary-or-side-panel presentation', async () => {
  const investigation = await read('apps/desktop/src/pages/Investigation.tsx');
  const deep = await read('apps/desktop/src/components/investigation/InvestigationDeepAnalysis.tsx');
  const multi = await read('apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx');
  assert.match(investigation, /data-testid="investigation-primary-pane"/);
  assert.match(investigation, /useState<AnalysisPresentationMode>\('primary'\)/);
  assert.match(investigation, /presentationMode=\{analysisPresentationMode\}/);
  assert.doesNotMatch(investigation, /<InvestigationDeepAnalysis[\s\S]{0,1800}docked/);
  assert.match(deep, /data-presentation-mode=\{presentationMode\}/);
  assert.match(deep, /data-docked=\{sidePanel \? "true" : "false"\}/);
  assert.match(deep, /data-testid="deep-analysis-presentation-toggle"/);
  assert.match(deep, /xl:w-\[clamp\(420px,36vw,680px\)\]/);
  assert.match(multi, /useState<AnalysisPresentationMode>\('primary'\)/);
  assert.match(multi, /data-testid="collection-deep-selected-surface" data-docked=\{sidePanelActive \? 'true' : 'false'\}/);
  assert.match(multi, /data-testid="collection-deep-perspective-surface" data-docked=\{sidePanelActive \? 'true' : 'false'\}/);
  assert.match(multi, /collection-deep-selected-presentation-toggle/);
  assert.match(multi, /collection-deep-perspective-presentation-toggle/);
  assert.doesNotMatch(multi, /lg:pr-\[48%\]/);
});


test('DPR-10 history keeps durable retention separate from 6x5 navigation and restores multi-file state fail-closed', async () => {
  const history = await read('apps/desktop/src/components/home/HomeSessionHistoryPanel.tsx');
  const persistence = await read('apps/desktop/src/lib/home-workspace-persistence.ts');
  const restore = await read('apps/desktop/src/hooks/useHomeWorkspaceSessions.ts');
  const server = await read('apps/server/src/advanced_workspace.rs');
  assert.match(history, /const HISTORY_PAGE_SIZE = 6;/);
  assert.match(history, /const HISTORY_MAX_PAGES = 5;/);
  assert.match(history, /HISTORY_PAGE_SIZE \* HISTORY_MAX_PAGES/);
  assert.match(server, /const SESSION_LIMIT: i64 = 100;/);
  assert.doesNotMatch(server, /const SESSION_LIMIT: i64 = 30;/);
  assert.match(persistence, /canonicalPerspectivePersistence/);
  assert.doesNotMatch(persistence, /canonicalPerspectiveEvidenceSources[\s\S]{0,300}rows: source\.rows/);
  assert.match(restore, /sourceType === 'canonical_perspective_collection'/);
  assert.match(restore, /Multi-file Focus analysis restored from complete saved source files/);
  assert.match(restore, /sourceType === 'canonical_multisource'/);
  assert.match(restore, /Rebuild the relationship before analysis; prior executable handoffs remain invalid/);
});
