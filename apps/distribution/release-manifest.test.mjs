import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { compareVersions, loadReleaseCatalog, selectArtifact, updateReleaseIndex, validateReleaseManifest } from './release-manifest.mjs';

const manifest = (version = '0.9.2-beta.7') => ({
  schema_version: 'lightbi.release.v1', product: 'digital.thaiduy.lightbi', version, channel: 'beta',
  published_at: '2026-08-24T00:00:00.000Z', release_notes: 'Beta update', minimum_updater_version: '0.9.1-beta.7',
  artifacts: [{ platform: 'windows', architecture: 'x86_64', kind: 'exe', filename: 'LightBI.exe', url: `https://drive.thaiduy.store/release/lightbi/${version}/LightBI.exe`, size: 100, sha256: 'a'.repeat(64) }],
});

test('validates one cross-platform release contract', () => {
  const crossPlatform = { ...manifest(), artifacts: [
    manifest().artifacts[0],
    { platform: 'linux', architecture: 'x86_64', kind: 'deb', filename: 'LightBI.deb', url: 'https://drive.thaiduy.store/release/lightbi/0.9.2-beta.7/LightBI.deb', size: 200, sha256: 'b'.repeat(64) },
  ] };
  assert.equal(validateReleaseManifest(crossPlatform).version, '0.9.2-beta.7');
  assert.equal(selectArtifact(crossPlatform, 'windows').filename, 'LightBI.exe');
  assert.equal(selectArtifact(crossPlatform, 'linux').filename, 'LightBI.deb');
  assert.throws(() => validateReleaseManifest({ ...manifest(), artifacts: [{ ...manifest().artifacts[0], url: 'http://unsafe.test/a' }] }));
});

test('orders semver releases and replaces the same immutable version identity', () => {
  assert.equal(compareVersions('0.9.2-beta.7', '0.9.1-beta.7'), 1);
  const index = updateReleaseIndex(null, manifest('0.9.1-beta.7'));
  const next = updateReleaseIndex(index, manifest('0.9.2-beta.7'));
  assert.deepEqual(next.releases.map((item) => item.version), ['0.9.2-beta.7', '0.9.1-beta.7']);
});

test('fails over without advertising an incomplete R2 release', async () => {
  const catalog = await loadReleaseCatalog({ manifestUrl: 'https://r2/latest.json', indexUrl: 'https://r2/index.json', fallbackUrl: 'https://github.com/releases', fetchImpl: async () => new Response('', { status: 503 }) });
  assert.equal(catalog.available, false);
  assert.equal(catalog.latest, null);
  assert.equal(catalog.fallbackUrl, 'https://github.com/releases');
});

test('builds one manifest from Windows and Debian artifacts', () => {
  const folder = mkdtempSync(join(tmpdir(), 'lightbi-release-'));
  try {
    const artifactsPath = join(folder, 'artifacts.json');
    const outputPath = join(folder, 'manifest.json');
    writeFileSync(artifactsPath, JSON.stringify([
      manifest().artifacts[0],
      { platform: 'linux', architecture: 'x86_64', kind: 'deb', filename: 'LightBI.deb', url: 'https://drive.thaiduy.store/release/lightbi/0.9.2-beta.7/LightBI.deb', size: 200, sha256: 'b'.repeat(64) },
    ]));
    execFileSync(process.execPath, [resolve('../../scripts/build-release-manifest.mjs'), '--version', '0.9.2-beta.7', '--channel', 'beta', '--artifacts-json', artifactsPath, '--output', outputPath], { cwd: import.meta.dirname });
    const built = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.deepEqual(built.artifacts.map((item) => item.platform), ['windows', 'linux']);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('refuses to publish a malformed or partial release index', () => {
  const folder = mkdtempSync(join(tmpdir(), 'lightbi-release-index-'));
  try {
    const artifactsPath = join(folder, 'artifacts.json');
    const indexPath = join(folder, 'index.json');
    const outputPath = join(folder, 'manifest.json');
    const nextIndexPath = join(folder, 'next-index.json');
    writeFileSync(artifactsPath, JSON.stringify(manifest().artifacts));
    writeFileSync(indexPath, '{partial');
    assert.throws(() => execFileSync(process.execPath, [
      resolve('../../scripts/build-release-manifest.mjs'),
      '--version', '0.9.2-beta.7',
      '--channel', 'beta',
      '--artifacts-json', artifactsPath,
      '--output', outputPath,
      '--index-input', indexPath,
      '--index-output', nextIndexPath,
    ], { cwd: import.meta.dirname, stdio: 'pipe' }));

    writeFileSync(indexPath, JSON.stringify({ schema_version: 'lightbi.release-index.v1', releases: [] }));
    assert.throws(() => execFileSync(process.execPath, [
      resolve('../../scripts/build-release-manifest.mjs'),
      '--version', '0.9.2-beta.7',
      '--channel', 'beta',
      '--artifacts-json', artifactsPath,
      '--output', outputPath,
      '--index-input', indexPath,
      '--index-output', nextIndexPath,
    ], { cwd: import.meta.dirname, stdio: 'pipe' }));
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
