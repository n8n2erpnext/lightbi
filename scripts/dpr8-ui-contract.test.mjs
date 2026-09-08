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
