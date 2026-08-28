import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { compareVersions, selectArtifact, updateReleaseIndex, validateReleaseManifest } from './lib/release-manifest.mjs';

const buildScript = resolve(import.meta.dirname, 'build-release-manifest.mjs');
const manifest = (version = '0.9.2-beta.7') => ({
  schema_version: 'lightbi.release.v1', product: 'digital.thaiduy.lightbi', version, channel: 'beta',
  published_at: '2026-08-24T00:00:00.000Z', release_notes: 'Beta update', minimum_updater_version: '0.9.1-beta.7',
  artifacts: [{ platform: 'windows', architecture: 'x86_64', kind: 'exe', filename: 'LightBI.exe', url: `https://drive.thaiduy.store/release/lightbi/${version}/LightBI.exe`, size: 100, sha256: 'a'.repeat(64) }],
});

test('validates and selects Windows and Linux Basic release artifacts', () => {
  const crossPlatform = { ...manifest(), artifacts: [manifest().artifacts[0], { platform: 'linux', architecture: 'x86_64', kind: 'deb', filename: 'LightBI.deb', url: 'https://drive.thaiduy.store/release/lightbi/0.9.2-beta.7/LightBI.deb', size: 200, sha256: 'b'.repeat(64) }] };
  assert.equal(selectArtifact(validateReleaseManifest(crossPlatform), 'windows').filename, 'LightBI.exe');
  assert.equal(selectArtifact(crossPlatform, 'linux').filename, 'LightBI.deb');
  assert.throws(() => validateReleaseManifest({ ...manifest(), artifacts: [{ ...manifest().artifacts[0], url: 'http://unsafe.test/a' }] }));
});

test('orders Beta versions and replaces the same immutable release identity', () => {
  assert.equal(compareVersions('0.9.2-beta.7', '0.9.1-beta.7'), 1);
  const index = updateReleaseIndex(updateReleaseIndex(null, manifest('0.9.1-beta.7')), manifest('0.9.2-beta.7'));
  assert.deepEqual(index.releases.map((item) => item.version), ['0.9.2-beta.7', '0.9.1-beta.7']);
});

test('builds one public manifest without importing private control-plane source', () => {
  const folder = mkdtempSync(join(tmpdir(), 'lightbi-public-release-'));
  try {
    const artifactsPath = join(folder, 'artifacts.json');
    const outputPath = join(folder, 'manifest.json');
    writeFileSync(artifactsPath, JSON.stringify([manifest().artifacts[0], { platform: 'linux', architecture: 'x86_64', kind: 'deb', filename: 'LightBI.deb', url: 'https://drive.thaiduy.store/release/lightbi/0.9.2-beta.7/LightBI.deb', size: 200, sha256: 'b'.repeat(64) }]));
    execFileSync(process.execPath, [buildScript, '--version', '0.9.2-beta.7', '--channel', 'beta', '--artifacts-json', artifactsPath, '--output', outputPath]);
    const built = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.deepEqual(built.artifacts.map((item) => item.platform), ['windows', 'linux']);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
