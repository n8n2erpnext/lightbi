import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const visibleFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/u)
  .filter(Boolean)
  .map((path) => path.replaceAll('\\', '/'));
const forbiddenExactPaths = new Set([
  'deploy/lightbi-distribution.service',
  'deploy/distribution-data.compose.yml',
]);

const present = visibleFiles.filter((path) => path.startsWith('apps/distribution/') || path.includes('/security/signing/') || /(?:^|\/)(?:release|attestation|entitlement|pro-package)-signer\.[cm]?[jt]s$/u.test(path) || forbiddenExactPaths.has(path));
if (present.length) {
  throw new Error(`Private control-plane implementation must not exist in public source: ${present.join(', ')}`);
}

let keyMaterial = '';
try { keyMaterial = execFileSync('git', ['grep', '-I', '-n', '-E', 'BEGIN (OPENSSH |EC |RSA )?PRIVATE KEY'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
catch (error) { if (error?.status !== 1) throw error; }
if (keyMaterial) throw new Error('Private key material must never exist in public source');

const releaseWorkflow = readFileSync(resolve(root, '.github/workflows/release.yml'), 'utf8');
const releaseBuilder = readFileSync(resolve(root, 'scripts/build-release-manifest.mjs'), 'utf8');
for (const [name, source] of [['release workflow', releaseWorkflow], ['release builder', releaseBuilder]]) {
  if (source.includes('apps/distribution')) throw new Error(`${name} imports the private control plane`);
}

console.log('Public Basic source contains no private control-plane implementation.');
