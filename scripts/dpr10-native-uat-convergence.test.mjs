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

test('DPR-10 multi-file layout stays fluid and Step 2 preserves source-local filtering', async () => {
  const multi = await read('apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx');
  const brief = await read('apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx');
  const period = await read('apps/desktop/src/components/analysis/PeriodPartitionResultCard.tsx');
  const focus = await read('apps/desktop/src/components/analysis/MultiSourceFocusSubjectSelector.tsx');
  assert.match(multi, /data-testid="collection-evidence-filters"/);
  assert.match(multi, /filterDrillThroughRows/);
  assert.match(multi, /Filters apply only to this source and never join evidence across files\./);
  assert.match(multi, /xl:grid-cols-\[minmax\(0,1fr\)_clamp\(520px,44vw,760px\)\]/);
  assert.match(multi, /max-w-\[1280px\]/);
  assert.match(brief, /compact\?: boolean/);
  assert.match(brief, /grid-cols-\[minmax\(0,1fr\)_minmax\(105px,150px\)\]/);
  assert.doesNotMatch(period, /rounded-xl border border-blue-100[^\n]*shadow-sm/);
  assert.match(period, /data-layout="multi-period-document"/);
  assert.doesNotMatch(focus, /rounded-xl border border-violet-100/);
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



test('DPR-10 Gate D exposes the canonical 30-chart library and preserves official/inferred/shape-only authority lanes', async () => {
  const templates = await read('apps/desktop/src/lib/visualization-chart-templates.ts');
  const ontology = await read('apps/desktop/src/lib/visualization-ontology.ts');
  const domainSets = await read('apps/desktop/src/lib/domain-chart-sets.ts');
  const domainPlaybooks = await read('apps/desktop/src/lib/domain-visual-playbooks.ts');
  const domainProfile = await read('apps/desktop/src/lib/domain-visual-profile.ts');
  const planner = await read('apps/desktop/src/lib/visualization-planner.ts');
  const investigationPlan = await read('apps/desktop/src/lib/investigation-visualization-plan.ts');
  assert.match(templates, /VISUALIZATION_PATTERN_LIBRARY_V1\.map/);
  assert.match(ontology, /export type VisualizationPatternIdV1 =/);
  assert.match(domainSets, /OFFICIAL_DOMAIN_CHART_SETS_V1/);
  assert.match(domainSets, /OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2/);
  assert.match(domainSets, /playbook\.chartSet\.primaryPatternIds/);
  assert.match(domainSets, /playbook\.chartSet\.supportingPatternIds/);
  for (const domain of ['revenue','finance','inventory','operations','customer','performance']) {
    assert.match(domainPlaybooks, new RegExp(`\\b${domain}: \\{`));
  }
  assert.match(domainPlaybooks, /chartSet: \{ primaryPatternIds:/);
  assert.match(planner, /officialDomainPatternOrderForIntent/);
  assert.match(domainProfile, /selectionSource: officialPrior\.length > 0 \? 'official_domain_prior' : 'inferred_domain_advice'/);
  assert.match(domainProfile, /candidateLibraryScope: 'canonical_30_patterns'/);
  assert.match(planner, /deterministicSuitabilityFinal: true/);
  assert.match(planner, /mbAuthority: 'presentation_vote_within_legal_set'/);
  assert.match(planner, /ballotTrace/);
  assert.match(planner, /createPresentationBallot/);
  const ballot = await read('apps/desktop/src/lib/presentation-ballot.ts');
  assert.match(ballot, /deterministicAuthority: 'hard_veto_only'/);
  assert.match(ballot, /mbMayChooseWithinLegalSet: true/);
  assert.match(ballot, /mayAuthorizeMetric: false/);
  assert.match(ballot, /mayAuthorizeFormula: false/);
  assert.match(ballot, /mayAuthorizeJoin: false/);
  assert.match(ballot, /mayMutateUnderstanding: false/);
  assert.match(investigationPlan, /resolveInvestigationVisualizationIntent/);
  assert.match(planner, /if \(type === 'distribution'\) return 'distribution';/);
  assert.match(investigationPlan, /analyticalIntent === 'distribution'/);
});

test('DPR-10 Gate D rich ECharts renderers, semantic palette, hover detail and Visual Narrative composition are source contracts', async () => {
  const registry = await read('apps/desktop/src/lib/visualization-renderer-registry.ts');
  const renderer = await read('apps/desktop/src/components/dashboards/DashboardChartWidget.tsx');
  const preview = await read('apps/desktop/src/components/analysis/ChartPreviewRenderer.tsx');
  const chartLibrary = await read('apps/desktop/src/pages/Charts.tsx');
  const investigation = await read('apps/desktop/src/pages/Investigation.tsx');
  const visualNarrative = await read('apps/desktop/src/components/analysis/VisualNarrativeCanvas.tsx');
  const composition = await read('apps/desktop/src/lib/visual-narrative-composition.ts');
  const bundle = await read('apps/desktop/src/lib/perspective-analysis-bundle.ts');
  const palette = await read('apps/desktop/src/lib/visualization-palette.ts');
  for (const family of ['area','grouped_bar','stacked_bar','normalized_stacked','combo_bar_line','waterfall','histogram','box_plot','bubble','heatmap','cohort_heatmap','funnel','pareto','bullet','diverging_bar','calendar_heatmap','sankey','timeline','control_chart','small_multiples','radar']) {
    assert.match(registry, new RegExp(`${family}: cap\\('${family}'`));
  }
  assert.match(renderer, /const richAxisTooltip/);
  assert.match(renderer, /marker[^\n]*seriesName/);
  assert.match(renderer, /family === 'box_plot'/);
  assert.match(renderer, /family === 'heatmap' \|\| family === 'cohort_heatmap'/);
  assert.match(renderer, /family === 'sankey'/);
  assert.match(preview, /generateDashboardChartOptions/);
  assert.match(chartLibrary, /VISUALIZATION_CHART_TEMPLATE_LIBRARY_V1/);
  assert.match(chartLibrary, /ChartTemplatePreview/);
  assert.match(investigation, /buildInvestigationVisualNarrativePlan/);
  assert.match(investigation, /<VisualNarrativeCanvas/);
  assert.doesNotMatch(investigation, /\.slice\(0, 2\)/);
  assert.match(bundle, /maxSupporting = 6/);
  assert.match(bundle, /final presentation membership is[\s\S]{0,120}visual narrative composer/);
  assert.match(visualNarrative, /data-testid="visual-narrative-canvas"/);
  assert.match(visualNarrative, /data-testid="perspective-analysis-bundle"/);
  assert.match(composition, /layoutCount: VisualNarrativeLayoutCountV1/);
  assert.match(composition, /if \(!\[1, 3, 5\]\.includes\(count\)\)/);
  assert.match(composition, /allowedVisualCounts: \[1, 3, 5\]/);
  assert.match(composition, /visual_budget_exceeded/);
  assert.match(palette, /LIGHTBI_QUALITATIVE_PALETTE_V1/);
  assert.doesNotMatch(palette, /^\s*'#4f46e5'/m);
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
