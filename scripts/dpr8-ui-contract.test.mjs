import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('DPR-8 shared UI exposes canvas-first primitives without a universal Card', async () => {
  const index = await read('packages/ui/index.ts');
  const density = await read('packages/ui/components/density.ts');
  const layout = await read('packages/ui/components/layout.tsx');
  const componentFiles = await readdir(new URL('../packages/ui/components/', import.meta.url));

  for (const name of ['Canvas', 'Section', 'SectionHeader', 'Inset', 'Divider']) {
    assert.match(index, new RegExp(`\\b${name}\\b`), `missing shared primitive ${name}`);
  }
  for (const densityName of ['summary', 'working', 'evidence']) {
    assert.match(density, new RegExp(`\\b${densityName}\\b`), `missing density ${densityName}`);
  }
  assert.doesNotMatch(index, /\bCard\b/);
  assert.equal(componentFiles.some(name => /^Card\./i.test(name)), false);
  assert.doesNotMatch(layout, /rounded-|shadow-/);
  assert.match(layout, /data-lightbi-canvas/);
  assert.match(layout, /data-lightbi-section/);
});
test('DPR-8 shell consumes LightBI geometry tokens instead of the legacy 280px sidebar', async () => {
  const shell = await read('apps/desktop/src/components/layout/AppLayout.tsx');
  assert.match(shell, /w-\[var\(--lb-sidebar-width\)\]/);
  assert.match(shell, /h-\[var\(--lb-app-header-height\)\]/);
  assert.match(shell, /bg-\[var\(--lb-canvas\)\]/);
  assert.match(shell, /bg-\[var\(--lb-sidebar\)\]/);
  assert.doesNotMatch(shell, /280px/);
});

test('Tailwind scans shared TSX primitives without recursively scanning package node_modules', async () => {
  const config = await read('apps/desktop/tailwind.config.js');
  assert.match(config, /packages\/ui\/\*\.\{js,ts,jsx,tsx\}/);
  assert.match(config, /packages\/ui\/components\/\*\*\/\*\.\{js,ts,jsx,tsx\}/);
  assert.doesNotMatch(config, /packages\/ui\/\*\*\/\*\.\{js,ts,jsx,tsx\}/);
});


test('DPR-8 Understanding uses the shared canvas hierarchy and ranked stacks', async () => {
  const understanding = await read('apps/desktop/src/components/analysis/UnderstandingNextCard.tsx');
  const perspectives = await read('apps/desktop/src/components/analysis/CanonicalPerspectiveSelector.tsx');
  const focus = await read('apps/desktop/src/components/analysis/FocusSubjectSelector.tsx');
  for (const region of ['understanding-canvas', 'understanding-meaning', 'understanding-assumptions', 'understanding-proposed-analyses', 'understanding-evidence-details']) {
    assert.match(understanding, new RegExp(region), `missing Understanding region ${region}`);
  }
  const regionOrder = ['understanding-meaning', 'understanding-proposed-analyses', 'understanding-assumptions', 'understanding-evidence-details'].map(region => understanding.indexOf(region));
  assert.deepEqual([...regionOrder].sort((a, b) => a - b), regionOrder, 'Understanding regions must follow meaning -> proposed analyses -> assumptions -> evidence/details');
  assert.match(understanding, /<Canvas density="working"/);
  assert.match(understanding, /<Section density="summary"/);
  assert.match(understanding, /<Inset density="summary"/);
  assert.match(understanding, /data-layout="ranked-question-grid"/);
  assert.match(perspectives, /data-layout="ranked-stack"/);
  assert.match(perspectives, /data-density="compact"/);
  assert.match(perspectives, /min-h-10/);
  assert.doesNotMatch(perspectives, /grid-cols|min-h-\[170px\]|shadow-sm|py-3/);
  assert.match(focus, /data-layout="inline-focus-control"/);
  const evidenceIndex = understanding.indexOf('understanding-evidence-details');
  assert.ok(understanding.indexOf('understanding-semantic-evidence') > evidenceIndex, 'semantic/readiness detail must live in Evidence');
  assert.ok(understanding.indexOf('domain-inference-summary') > evidenceIndex, 'detailed domain support must live in Evidence');
  const primaryIndex = understanding.indexOf('canonical-primary-analysis');
  assert.ok(primaryIndex >= 0 && understanding.indexOf('canonical-analysis-readiness') > primaryIndex, 'readiness counts must not push the primary answer down');
});

test('DPR-8 Home keeps New Brief as a command surface and flattens source/history stacks', async () => {
  const home = await read('apps/desktop/src/components/home/HomeWorkspaceView.tsx');
  const history = await read('apps/desktop/src/components/home/HomeSessionHistoryPanel.tsx');
  assert.match(home, /data-testid="home-question-command"/);
  assert.match(home, /data-testid="home-quick-suggestions" data-layout="action-pills"/);
  assert.match(home, /data-testid="home-source-actions" data-layout="source-action-stack"/);
  const sourceStart = home.indexOf('data-testid="home-source-actions"');
  const sourceEnd = home.indexOf('<HomeSessionHistoryPanel', sourceStart);
  const sourceBlock = home.slice(sourceStart, sourceEnd);
  assert.doesNotMatch(sourceBlock, /grid-cols|shadow-sm|shadow-lg|hover:-translate-y-1/);
  assert.match(history, /data-layout="session-history-list"/);
  assert.match(history, /data-testid="session-history-empty"/);
  assert.match(history, /data-testid="session-history-status"/);
  assert.doesNotMatch(history, /bg-white border border-black\/10 rounded-xl p-5 shadow-sm/);
  assert.doesNotMatch(history, /border-dashed/);
});

test('DPR-8 Decision Workspace is answer-first in both single-file and multi-file lanes', async () => {
  const single = await read('apps/desktop/src/pages/Investigation.tsx');
  const visualNarrative = await read('apps/desktop/src/components/analysis/VisualNarrativeCanvas.tsx');
  const multi = await read('apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx');
  const singleOrder = ['decision-main-answer-region', 'decision-key-number', 'decision-primary-visual', '<BasicBAExplanation', '<BasicBANextAction', 'decision-evidence-details'].map(marker => single.indexOf(marker));
  assert.ok(singleOrder.every(index => index >= 0), 'single-file Decision Workspace must expose every answer-first region');
  assert.deepEqual([...singleOrder].sort((a, b) => a - b), singleOrder, 'single-file Decision Workspace must follow answer -> key number -> visual narrative -> explanation -> next -> evidence');
  assert.match(single, /data-layout="answer-first-canvas"/);
  assert.match(single, /<VisualNarrativeCanvas/);
  assert.match(visualNarrative, /data-testid="visual-narrative-canvas"/);
  assert.match(visualNarrative, /data-testid="perspective-analysis-bundle"/);
  assert.match(visualNarrative, /data-layout-count=\{plan\.layoutCount\}/);
  const multiOrder = ['collection-main-answer', 'collection-key-number', 'collection-primary-visual', 'collection-explanation', 'collection-supporting-metrics', 'collection-next-action', 'collection-evidence-details'].map(marker => multi.indexOf(marker));
  assert.ok(multiOrder.every(index => index >= 0), 'multi-file Decision Workspace must expose every answer-first region');
  assert.deepEqual([...multiOrder].sort((a, b) => a - b), multiOrder, 'multi-file Decision Workspace must follow answer -> key number -> visual -> explanation -> supporting -> next -> evidence');
  assert.match(multi, /data-layout="answer-first-canvas"/);
  assert.doesNotMatch(multi.slice(multi.indexOf('collection-decision-workspace')), /xl:grid-cols-\[1\.55fr_0\.65fr\]/);
});

test('DPR-8 Deep BA reads as a numbered management document instead of a card stack', async () => {
  const shell = await read('apps/desktop/src/components/investigation/InvestigationDeepAnalysis.tsx');
  const narrative = await read('apps/desktop/src/components/investigation/AnalysisNarrativeBoard.tsx');
  const single = await read('apps/desktop/src/components/investigation/SingleSourceBAOverviewCard.tsx');
  const comparison = await read('apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx');
  const multi = await read('apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx');
  assert.match(shell, /data-testid="deep-analysis-surface"[\s\S]{0,120}data-layout=\{filteredScope \? 'focused-investigation' : 'management-document'\}/);
  assert.match(shell, /data-testid="deep-analysis-export-surface"/);
  assert.match(shell, /data-layout=\{filteredScope \? 'focused-investigation' : 'management-document'\}/);
  assert.match(shell, /data-testid="deep-ba-legacy-brief-details"/);
  assert.match(narrative, /data-testid="deep-ba-investigation" data-layout="management-document"/);
  assert.match(narrative, /data-testid="deep-ba-management-section-01" data-section-number="01"/);
  assert.doesNotMatch(narrative, /grid gap-3 lg:grid-cols-2/);
  assert.match(single, /data-testid="single-source-ba-overview" data-layout="management-document"/);
  assert.doesNotMatch(single, /rounded-\[20px\]|shadow-sm/);
  assert.match(comparison, /data-testid="comparison-management-document" data-layout="management-document"/);
  for (const number of ['01', '02', '03', '04', '05']) assert.match(comparison, new RegExp(`data-section-number="${number}"`));
  assert.doesNotMatch(comparison, /rounded-xl border p-4 shadow-sm/);
  assert.match(multi, /data-testid="collection-deep-perspective-surface"[\s\S]{0,120}data-layout="management-document"/);
});

test('DPR-8 BA Step 2 is a focused selected-subject investigation, not a second full report', async () => {
  const board = await read('apps/desktop/src/components/investigation/SelectedSubjectInvestigationBoard.tsx');
  const single = await read('apps/desktop/src/components/investigation/InvestigationDeepAnalysis.tsx');
  const multi = await read('apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx');
  assert.match(board, /data-layout="focused-investigation"/);
  const order = ['selected-subject-benchmark', 'selected-subject-main-answer', 'selected-subject-source-synthesis', 'selected-subject-unknowns', 'selected-subject-next-actions', 'selected-subject-evidence-details'].map(marker => board.indexOf(marker));
  assert.ok(order.every(index => index >= 0), 'Step 2 source must retain benchmark, answer, synthesis, unknown, next-action and evidence regions');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'Step 2 must progress context -> answer -> components -> unknowns -> next -> evidence');
  assert.doesNotMatch(board, /selected-subject-next-actions[\s\S]{0,500}lg:grid-cols-2/);
  assert.match(single, /data-layout=\{filteredScope \? 'focused-investigation' : 'management-document'\}/);
  const selectedStart = multi.indexOf('data-testid="collection-deep-selected-surface"');
  const selectedBlock = multi.slice(selectedStart, selectedStart + 4200);
  assert.ok(selectedStart >= 0, 'multi-file Step 2 surface must exist');
  assert.match(selectedBlock, /data-docked=\{sidePanelActive \? 'true' : 'false'\}[\s\S]{0,140}data-presentation-mode=\{analysisPresentationMode\}[\s\S]{0,160}data-layout="focused-investigation"/);
  assert.match(selectedBlock, /collection-deep-selected-presentation-toggle/);
  assert.doesNotMatch(selectedBlock, /bg-slate-950|rounded-2xl[^\n]*shadow-sm/);
});
