import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));

test('shared UI consumes host React 19 instead of shipping a private React runtime', async () => {
  const desktop = await readJson('apps/desktop/package.json');
  const ui = await readJson('packages/ui/package.json');
  assert.equal(ui.dependencies?.react, undefined);
  assert.equal(ui.dependencies?.['react-dom'], undefined);
  assert.equal(ui.peerDependencies?.react, '^19.2.0');
  assert.equal(ui.peerDependencies?.['react-dom'], '^19.2.0');
  assert.equal(ui.devDependencies?.react, desktop.dependencies?.react);
  assert.equal(ui.devDependencies?.['react-dom'], desktop.dependencies?.['react-dom']);
  assert.equal(ui.devDependencies?.['@types/react'], desktop.devDependencies?.['@types/react']);
  assert.equal(ui.devDependencies?.['@types/react-dom'], desktop.devDependencies?.['@types/react-dom']);
});


test('LightBI design tokens encode the DPR-0 visual-system contract without external namespaces', async () => {
  const css = await readFile(new URL('../packages/ui/tokens.css', import.meta.url), 'utf8');
  const ts = await readFile(new URL('../packages/ui/tokens.ts', import.meta.url), 'utf8');
  const index = await readFile(new URL('../packages/ui/index.ts', import.meta.url), 'utf8');
  const appCss = await readFile(new URL('../apps/desktop/src/index.css', import.meta.url), 'utf8');
  for (const required of [
    '--lb-sidebar-width: 224px', '--lb-app-header-height: 64px', '--lb-window-chrome-height: 28px',
    '--lb-window-control-width: 48px', '--lb-row-data-height: 48px', '--lb-control-compact-height: 32px',
    '--lb-motion-fast: 100ms', '--lb-motion-normal: 150ms', '--lb-scrollbar-size: 10px',
    '--lb-brand-mark: #ffc20a', '--lb-canvas: #fbfbfa', '--lb-ink: #202123',
  ]) assert.ok(css.includes(required), `missing design token: ${required}`);
  assert.doesNotMatch(`${css}\n${ts}`, /books[-_]/i);
  assert.match(index, /lightbiDesignTokens/);
  assert.match(appCss, /packages\/ui\/tokens\.css/);
  assert.match(appCss, /font-family: var\(--lb-font-sans\)/);
});
