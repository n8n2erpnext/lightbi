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
const nativeAcceptanceWorkflow = readFileSync(resolve(import.meta.dirname, '../.github/workflows/native-acceptance.yml'), 'utf8');
const r1p13RcWorkflow = readFileSync(resolve(import.meta.dirname, '../.github/workflows/r1p13-rc-acceptance.yml'), 'utf8');
const nextEsignerWorkflow = readFileSync(resolve(import.meta.dirname, '../.github/workflows/windows-next-esigner-signing.yml'), 'utf8');
const esignerPrepareScript = readFileSync(resolve(import.meta.dirname, 'prepare-windows-esigner-cka.ps1'), 'utf8');
const esignerCleanupScript = readFileSync(resolve(import.meta.dirname, 'cleanup-windows-esigner-cka.ps1'), 'utf8');
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



test('Windows native acceptance artifact is isolated from Production publication authority', () => {
  assert.match(nativeAcceptanceWorkflow, /workflow_dispatch:/u);
  assert.match(nativeAcceptanceWorkflow, /VITE_LIGHTBI_CHANNEL: internal/u);
  assert.match(nativeAcceptanceWorkflow, /VITE_LIGHTBI_DISTRIBUTION_URL: https:\/\/lightbi-next\.thaiduy\.digital/u);
  assert.match(nativeAcceptanceWorkflow, /VITE_LIGHTBI_PARENT_GENERATION_ID: g-2026-09-03-next-030/u);
  assert.match(nativeAcceptanceWorkflow, /VITE_LIGHTBI_CONTROL_PLANE_COMMIT: bb50b0d53542da5cd908e2237cbca368f7f87073/u);
  assert.match(nativeAcceptanceWorkflow, /VITE_LIGHTBI_TRUST_PHASE2A_HEAD: 10de4da8e551a46f93f7b62985a0a6e611581b8e/u);
  assert.match(nativeAcceptanceWorkflow, /VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL: internal/u);
  assert.match(nativeAcceptanceWorkflow, /src\/lib\/native-runtime\.test\.ts/u);
  assert.match(nativeAcceptanceWorkflow, /cargo test -p lightbi-tauri windows_publisher --target x86_64-pc-windows-msvc/u);
  assert.match(nativeAcceptanceWorkflow, /production_authority = \$false/u);
  assert.match(nativeAcceptanceWorkflow, /installer_size = \[int64\]\$size/u);
  assert.match(nativeAcceptanceWorkflow, /LIGHTBI_NATIVE_ACCEPTANCE=\$acceptanceJson/u);
  assert.doesNotMatch(nativeAcceptanceWorkflow, /softprops\/action-gh-release|R2_ACCESS_KEY_ID|aws s3 cp/u);
});

test('R1-P13 RC acceptance is prerelease-only artifact authority', () => {
  assert.match(r1p13RcWorkflow, /name: R1-P13 RC Acceptance Artifact/u);
  assert.match(r1p13RcWorkflow, /codex\/r1p13-rc-\*/u);
  assert.match(r1p13RcWorkflow, /LIGHTBI_RC_VERSION: 1\.0\.0-rc\.\$\{\{ github\.run_number \}\}/u);
  assert.match(r1p13RcWorkflow, /pnpm test:release-1\.0/u);
  assert.match(r1p13RcWorkflow, /VITE_LIGHTBI_CHANNEL: internal/u);
  assert.match(r1p13RcWorkflow, /VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL: internal/u);
  assert.match(r1p13RcWorkflow, /release_channel = "beta"/u);
  assert.match(r1p13RcWorkflow, /lightbi_identity_required = "root_rel_exact_artifact_att"/u);
  assert.match(r1p13RcWorkflow, /os_publisher_required_for_current_rc = \$false/u);
  assert.match(r1p13RcWorkflow, /production_authority = \$false/u);
  assert.match(r1p13RcWorkflow, /stable_publication_authority = \$false/u);
  assert.match(r1p13RcWorkflow, /inherited_owner_acceptance_gate = \$true/u);
  assert.match(r1p13RcWorkflow, /production_phase2a_freeze_gate = \$true/u);
  assert.match(r1p13RcWorkflow, /permissions:\s*\n\s*contents: read/u);
  assert.doesNotMatch(r1p13RcWorkflow, /contents: write|softprops\/action-gh-release|R2_ACCESS_KEY_ID|aws s3|--channel\s+stable|SSL_COM_ESIGNER/u);
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


test('stable manifest identity does not require OS publisher evidence, while supplied platform evidence remains strict', () => {
  const folder = mkdtempSync(join(tmpdir(), 'lightbi-stable-publisher-'));
  try {
    const artifactsPath = join(folder, 'artifacts.json');
    const evidencePath = join(folder, 'publisher.json');
    const outputPath = join(folder, 'manifest.json');
    const artifact = { ...manifest('1.0.0').artifacts[0], sha256: 'f'.repeat(64), url: 'https://drive.thaiduy.store/release/lightbi/1.0.0/LightBI.exe' };
    writeFileSync(artifactsPath, JSON.stringify([artifact]));
    execFileSync(process.execPath, [buildScript, '--version', '1.0.0', '--channel', 'stable', '--artifacts-json', artifactsPath, '--output', outputPath]);
    assert.equal(JSON.parse(readFileSync(outputPath, 'utf8')).channel, 'stable');

    writeFileSync(evidencePath, JSON.stringify({
      schema_version: 'lightbi.windows-publisher-evidence.v1', artifact: 'LightBI.exe', sha256: artifact.sha256,
      signature_status: 'NotSigned', signer_subject: null, signer_thumbprint: null,
    }));
    const rejected = spawnSync(process.execPath, [buildScript, '--version', '1.0.0', '--channel', 'stable', '--artifacts-json', artifactsPath, '--windows-publisher-evidence', evidencePath, '--windows-publisher-subject', 'CN=Thai Duy', '--output', outputPath], { encoding: 'utf8' });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /windows_authenticode_signature_not_valid/u);

    writeFileSync(evidencePath, JSON.stringify({
      schema_version: 'lightbi.windows-publisher-evidence.v1', artifact: 'LightBI.exe', sha256: artifact.sha256,
      signature_status: 'Valid', signer_subject: 'CN=Thai Duy', signer_thumbprint: '0011AA',
    }));
    execFileSync(process.execPath, [buildScript, '--version', '1.0.0', '--channel', 'stable', '--artifacts-json', artifactsPath, '--windows-publisher-evidence', evidencePath, '--windows-publisher-subject', 'CN=Thai Duy', '--output', outputPath]);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('NEXT eSigner workflow is exact-SHA branch gated and non-publishing', () => {
  assert.match(nextEsignerWorkflow, /name: NEXT Windows Authenticode Acceptance/u);
  assert.match(nextEsignerWorkflow, /codex\/native-signing-r1p12-sandbox-\*/u);
  assert.match(nextEsignerWorkflow, /codex\/native-signing-r1p12-product-\*/u);
  assert.doesNotMatch(nextEsignerWorkflow, /workflow_dispatch:/u);
  assert.match(nextEsignerWorkflow, /expected.*\^\[0-9a-f\]\{40\}\$/u);
  assert.match(nextEsignerWorkflow, /expected.*GITHUB_SHA/u);
  assert.match(nextEsignerWorkflow, /mode=.*GITHUB_OUTPUT/u);
  assert.match(nextEsignerWorkflow, /permissions:\s*\n\s*contents: read/u);
  assert.doesNotMatch(nextEsignerWorkflow, /contents: write|softprops\/action-gh-release|R2_ACCESS_KEY_ID|aws s3 cp/u);
});

test('NEXT eSigner workflow signs both runtime app and installer without gaining Production authority', () => {
  assert.match(nextEsignerWorkflow, /VITE_LIGHTBI_CHANNEL: internal/u);
  assert.match(nextEsignerWorkflow, /LIGHTBI_SIGNED_CONTROL_PLANE: bb50b0d53542da5cd908e2237cbca368f7f87073/u);
  assert.match(nextEsignerWorkflow, /SSL_COM_ESIGNER_EXPECTED_SUBJECT/u);
  assert.match(nextEsignerWorkflow, /certificateThumbprint = \$env:LIGHTBI_WINDOWS_PUBLISHER_THUMBPRINT/u);
  assert.match(nextEsignerWorkflow, /digestAlgorithm = 'sha256'/u);
  assert.match(nextEsignerWorkflow, /timestampUrl = 'http:\/\/ts\.ssl\.com'/u);
  assert.match(nextEsignerWorkflow, /collect-windows-publisher-evidence\.ps1 -Installer \$app\.FullName/u);
  assert.match(nextEsignerWorkflow, /collect-windows-publisher-evidence\.ps1 -Installer \$normalizedInstaller/u);
  assert.match(nextEsignerWorkflow, /--mode stable --expected-sha256 \$appHash --expected-subject/u);
  assert.match(nextEsignerWorkflow, /--mode stable --expected-sha256 \$installerHash --expected-subject/u);
  assert.match(nextEsignerWorkflow, /appEvidence\.signer_thumbprint -ne \$installerEvidence\.signer_thumbprint/u);
  assert.match(nextEsignerWorkflow, /runtime_expected_thumbprint = \$env:LIGHTBI_WINDOWS_PUBLISHER_THUMBPRINT/u);
  assert.match(nextEsignerWorkflow, /environment = 'next_internal_test_only'/u);
  assert.match(nextEsignerWorkflow, /promotable_to_production = \$false/u);
  assert.match(nextEsignerWorkflow, /production_authority = \$false/u);
  assert.doesNotMatch(nextEsignerWorkflow, /--channel\s+stable|release\/lightbi\/stable/u);
});

test('SSL.com eSigner CKA preparation is provider-authenticated and exact-subject gated', () => {
  assert.match(esignerPrepareScript, /https:\/\/ssl\.com\/download\/ssl-com-esigner-cka/u);
  assert.match(esignerPrepareScript, /Get-AuthenticodeSignature -FilePath \$ckaInstaller\.FullName/u);
  assert.match(esignerPrepareScript, /config -mode \$Mode -user \$username -pass \$password -totp \$totpSecret/u);
  assert.match(esignerPrepareScript, /Cert:\\CurrentUser\\My -CodeSigningCert/u);
  assert.match(esignerPrepareScript, /Where-Object \{ \$_\.Subject -eq \$ExpectedSubject \}/u);
  assert.match(esignerPrepareScript, /LIGHTBI_WINDOWS_PUBLISHER_THUMBPRINT/u);
  assert.match(esignerPrepareScript, /LIGHTBI_ESIGNER_CKA_TOOL/u);
  assert.match(esignerPrepareScript, /& \$ckaTool unload/u);
  assert.match(esignerCleanupScript, /LIGHTBI_ESIGNER_MASTER_KEY/u);
  assert.match(esignerCleanupScript, /LIGHTBI_ESIGNER_WORKING_ROOT/u);
});
