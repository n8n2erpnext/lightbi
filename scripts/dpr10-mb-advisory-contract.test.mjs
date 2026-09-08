import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const brain = 'apps/desktop/src/lib/understanding-core/micro-brain';
const paths = [
  `${brain}/presentation-knowledge/manifest.v1.json`,
  `${brain}/presentation-knowledge/presentation.semantic.v1.json`,
  `${brain}/compiled/presentation.index.v1.json`,
  `${brain}/compiled/presentation.index.v1.json.sha256`,
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function snapshot() {
  return Object.fromEntries(await Promise.all(paths.map(async relative => {
    const bytes = await readFile(new URL(`../${relative}`, import.meta.url));
    return [relative, { sha256: digest(bytes), bytes: bytes.length }];
  })));
}
test('DPR-10 Micro Brain presentation rebuild is byte-deterministic and bounded', async () => {
  const before = await snapshot();
  const run = spawnSync('pnpm', ['micro-brain:presentation:build'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  const after = await snapshot();
  assert.deepEqual(after, before);

  const foundation = await readFile(new URL(`../${brain}/compiled/foundation.index.v1.json`, import.meta.url));
  const presentation = await readFile(new URL(`../${brain}/compiled/presentation.index.v1.json`, import.meta.url));
  assert.ok(foundation.length + presentation.length <= 20 * 1024 * 1024);

  const compiled = JSON.parse(presentation.toString('utf8'));
  assert.equal(compiled.manifest.cardCount, 88);
  assert.equal(compiled.manifest.featureCount, 2304);
  assert.equal(compiled.manifest.precisionCardCount, 88);
  assert.equal(compiled.manifest.sparseRecallCardCount, 0);
});
