import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const manifestPath = resolve(root, process.argv[2] || 'test-packs/internal-v1/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (manifest.schemaVersion !== 'lightbi.uat-pack.v1') throw new Error('Unexpected UAT pack schema');
if (!manifest.version || !Array.isArray(manifest.fixtures) || !Array.isArray(manifest.scenarios)) throw new Error('Malformed UAT pack');

const fixtureIds = new Set();
for (const fixture of manifest.fixtures) {
  if (!fixture.id || fixtureIds.has(fixture.id)) throw new Error(`Duplicate/invalid fixture id: ${fixture.id}`);
  fixtureIds.add(fixture.id);
  const path = resolve(root, fixture.path);
  if (!statSync(path).isFile()) throw new Error(`Fixture is not a file: ${fixture.path}`);
  const digest = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (digest !== fixture.sha256) throw new Error(`Fixture checksum mismatch: ${fixture.id}`);
}

const scenarioIds = new Set();
for (const scenario of manifest.scenarios) {
  if (!scenario.id || scenarioIds.has(scenario.id)) throw new Error(`Duplicate/invalid scenario id: ${scenario.id}`);
  scenarioIds.add(scenario.id);
  if (!scenario.title || !Array.isArray(scenario.actions) || !scenario.actions.length || !Array.isArray(scenario.expected) || !scenario.expected.length || !Array.isArray(scenario.failIf) || !scenario.failIf.length) {
    throw new Error(`Scenario missing acceptance fields: ${scenario.id}`);
  }
  for (const fixture of scenario.fixtures || []) {
    if (!fixtureIds.has(fixture)) throw new Error(`Scenario ${scenario.id} references unknown fixture ${fixture}`);
  }
}

for (const [level, ids] of Object.entries(manifest.levels || {})) {
  if (!Array.isArray(ids) || !ids.length) throw new Error(`Acceptance level is empty: ${level}`);
  for (const id of ids) if (!scenarioIds.has(id)) throw new Error(`Acceptance level ${level} references unknown scenario ${id}`);
}

console.log(JSON.stringify({ version: manifest.version, fixtures: fixtureIds.size, scenarios: scenarioIds.size, levels: Object.keys(manifest.levels || {}).length }));
