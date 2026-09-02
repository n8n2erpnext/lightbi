import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { compareVersions, selectArtifact, updateReleaseIndex, validateReleaseManifest } from './lib/release-manifest.mjs';
import { validateWindowsPublisherEvidence } from './lib/windows-publisher-evidence.mjs';

const buildScript = resolve(import.meta.dirname, 'build-release-manifest.mjs');
const releaseWorkflow = readFileSync(resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8');
const publisherCollector = readFileSync(resolve(import.meta.dirname, 'collect-windows-publisher-evidence.ps1'), 'utf8');
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


test('Beta workflow cannot promote itself to stable release authority', () => {
  assert.match(releaseWorkflow, /tags:\s*\n\s*- "v\*-beta\.\*"/u);
  assert.match(releaseWorkflow, /channel=beta/u);
  assert.doesNotMatch(releaseWorkflow, /channel=stable/u);
  assert.match(releaseWorkflow, /Beta workflow refuses non-Beta version/u);
  assert.match(releaseWorkflow, /Preserving stable global latest\.json/u);
  assert.match(releaseWorkflow, /name: Windows Beta Release/u);
  assert.doesNotMatch(releaseWorkflow, /build-linux|LightBI-Linux-Debian-Beta/u);
  assert.match(releaseWorkflow, /s3:\/\/\$R2_BUCKET\/release\/lightbi\/latest\.json/u);
});

test('records native Windows Authenticode evidence and keeps Beta non-authoritative', () => {
  assert.match(publisherCollector, /Get-AuthenticodeSignature/u);
  const unsigned = {
    schema_version: 'lightbi.windows-publisher-evidence.v1', artifact: 'LightBI.exe', sha256: 'c'.repeat(64),
    signature_status: 'NotSigned', signer_subject: null, signer_thumbprint: null,
  };
  assert.equal(validateWindowsPublisherEvidence(unsigned, { mode: 'beta', expectedSha256: 'c'.repeat(64) }).signature_status, 'NotSigned');
  assert.throws(() => validateWindowsPublisherEvidence(unsigned, { mode: 'stable', expectedSha256: 'c'.repeat(64), expectedSubject: 'CN=Thai Duy' }), /windows_authenticode_signature_not_valid/u);
});

test('stable Windows publisher evidence requires exact trusted subject and artifact digest', () => {
  const signed = {
    schema_version: 'lightbi.windows-publisher-evidence.v1', artifact: 'LightBI.exe', sha256: 'd'.repeat(64),
    signature_status: 'Valid', signer_subject: 'CN=Thai Duy', signer_thumbprint: '0011AA',
  };
  assert.equal(validateWindowsPublisherEvidence(signed, { mode: 'stable', expectedSha256: 'd'.repeat(64), expectedSubject: 'CN=Thai Duy' }).signer_subject, 'CN=Thai Duy');
  assert.throws(() => validateWindowsPublisherEvidence(signed, { mode: 'stable', expectedSha256: 'e'.repeat(64), expectedSubject: 'CN=Thai Duy' }), /windows_publisher_evidence_sha_mismatch/u);
  assert.throws(() => validateWindowsPublisherEvidence(signed, { mode: 'stable', expectedSha256: 'd'.repeat(64), expectedSubject: 'CN=Someone Else' }), /windows_publisher_subject_mismatch/u);
});


test('stable manifest builder fails closed until Windows publisher evidence is supplied', () => {
  const folder = mkdtempSync(join(tmpdir(), 'lightbi-stable-publisher-'));
  try {
    const artifactsPath = join(folder, 'artifacts.json');
    const evidencePath = join(folder, 'publisher.json');
    const outputPath = join(folder, 'manifest.json');
    const artifact = { ...manifest('1.0.0').artifacts[0], sha256: 'f'.repeat(64), url: 'https://drive.thaiduy.store/release/lightbi/1.0.0/LightBI.exe' };
    writeFileSync(artifactsPath, JSON.stringify([artifact]));
    const blocked = spawnSync(process.execPath, [buildScript, '--version', '1.0.0', '--channel', 'stable', '--artifacts-json', artifactsPath, '--output', outputPath], { encoding: 'utf8' });
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /stable_windows_publisher_evidence_required/u);
    writeFileSync(evidencePath, JSON.stringify({
      schema_version: 'lightbi.windows-publisher-evidence.v1', artifact: 'LightBI.exe', sha256: artifact.sha256,
      signature_status: 'Valid', signer_subject: 'CN=Thai Duy', signer_thumbprint: '0011AA',
    }));
    execFileSync(process.execPath, [buildScript, '--version', '1.0.0', '--channel', 'stable', '--artifacts-json', artifactsPath, '--windows-publisher-evidence', evidencePath, '--windows-publisher-subject', 'CN=Thai Duy', '--output', outputPath]);
    assert.equal(JSON.parse(readFileSync(outputPath, 'utf8')).channel, 'stable');
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
