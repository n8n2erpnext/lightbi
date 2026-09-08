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
});
