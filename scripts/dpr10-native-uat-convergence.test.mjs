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

test('DPR-10 question density and balanced reading gutters are shared-source contracts', async () => {
  const understanding = await read('apps/desktop/src/components/analysis/UnderstandingNextCard.tsx');
  const home = await read('apps/desktop/src/components/home/HomeWorkspaceView.tsx');
  const charts = await read('apps/desktop/src/pages/Charts.tsx');
  const investigation = await read('apps/desktop/src/pages/Investigation.tsx');
  assert.match(understanding, /data-layout="ranked-question-grid"/);
  assert.match(understanding, /lg:grid-cols-2/);
  assert.match(home, /max-w-\[1240px\][^\n]*px-6[^\n]*xl:px-12/);
  assert.match(charts, /max-w-\[1240px\][^\n]*px-6[^\n]*xl:px-12/);
  assert.match(investigation, /max-w-\[1180px\][^\n]*px-6[^\n]*lg:px-10/);
});

test('DPR-10 single and multi-file Deep BA keep the primary workspace visible in a right dock', async () => {
  const investigation = await read('apps/desktop/src/pages/Investigation.tsx');
  const deep = await read('apps/desktop/src/components/investigation/InvestigationDeepAnalysis.tsx');
  const multi = await read('apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx');
  assert.match(investigation, /data-testid="investigation-primary-pane"/);
  assert.match(investigation, /<InvestigationDeepAnalysis[\s\S]{0,1800}\bdocked\b/);
  assert.match(deep, /data-docked=\{docked \? "true" : "false"\}/);
  assert.match(deep, /lg:w-\[min\(48vw,760px\)\]/);
  assert.match(multi, /data-testid="collection-deep-selected-surface" data-docked="true"/);
  assert.match(multi, /data-testid="collection-deep-perspective-surface" data-docked="true"/);
  assert.match(multi, /collection-decision-workspace[\s\S]*collection-deep-perspective-surface/);
  assert.match(multi, /collection-evidence-drill-surface[\s\S]*collection-deep-selected-surface/);
});
