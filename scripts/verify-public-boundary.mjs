import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const forbiddenPaths = [
  'apps/distribution/server.mjs',
  'apps/distribution/account-auth.mjs',
  'apps/distribution/admin-auth.mjs',
  'apps/distribution/license-policy.mjs',
  'apps/distribution/mailer.mjs',
  'apps/distribution/package.json',
  'deploy/lightbi-distribution.service',
  'deploy/distribution-data.compose.yml',
];

const present = forbiddenPaths.filter((path) => existsSync(resolve(root, path)));
if (present.length) {
  throw new Error(`Private control-plane implementation must not exist in public source: ${present.join(', ')}`);
}

const releaseWorkflow = readFileSync(resolve(root, '.github/workflows/release.yml'), 'utf8');
const releaseBuilder = readFileSync(resolve(root, 'scripts/build-release-manifest.mjs'), 'utf8');
for (const [name, source] of [['release workflow', releaseWorkflow], ['release builder', releaseBuilder]]) {
  if (source.includes('apps/distribution')) throw new Error(`${name} imports the private control plane`);
}

console.log('Public Basic source contains no private control-plane implementation.');
