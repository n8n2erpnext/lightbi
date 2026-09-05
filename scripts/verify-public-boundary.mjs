import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const visibleFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/u)
  .filter(Boolean)
  .map((path) => path.replaceAll('\\', '/'));

const forbiddenExactPaths = new Set(['deploy/lightbi-distribution.service', 'deploy/distribution-data.compose.yml']);
const privateImplementation = visibleFiles.filter((path) => path.startsWith('apps/distribution/') || path.includes('/security/signing/') || /(?:^|\/)(?:release|attestation|entitlement|pro-package)-signer\.[cm]?[jt]s$/u.test(path) || forbiddenExactPaths.has(path));
if (privateImplementation.length) throw new Error(`Private control-plane implementation must not exist in public source: ${privateImplementation.join(', ')}`);

const forbiddenKeyPaths = visibleFiles.filter((path) => /(?:^|\/)(?:.*(?:private[-_]?key|signing[-_]?seed|issuer[-_]?seed|root[-_]?seed).*)$/iu.test(path) || /\.(?:pem|key|p12|pfx)$/iu.test(extname(path)));
if (forbiddenKeyPaths.length) throw new Error(`Private key/seed files must never exist in public source: ${forbiddenKeyPaths.join(', ')}`);

const pemPrivateKey = /-----BEGIN (?:OPENSSH |EC |RSA )?PRIVATE KEY-----/u;
const literalPrivateMaterial = /\b(?:private[_-]?key|signing[_-]?seed|issuer[_-]?seed|root[_-]?seed|ed25519[_-]?seed)\b["']?\s*[:=]\s*["'`]([A-Za-z0-9+/_=-]{32,})["'`]/iu;
const encodedSeedConstruction = /\b(?:privateKey|signingSeed|issuerSeed|rootSeed|ed25519Seed)\b\s*=\s*Buffer\.from\(\s*["'][0-9a-fA-F]{64,}["']\s*,\s*["']hex["']/u;
const forbiddenVectorAuthorityField = /["'](?:private[_-]?key|private[_-]?seed|signing[_-]?seed|issuer[_-]?seed|root[_-]?seed|ed25519[_-]?seed)["']\s*:/iu;
const keyMaterialHits = [];
for (const relative of visibleFiles) {
  const extension = extname(relative).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.zip', '.exe', '.deb', '.dmg'].includes(extension)) continue;
  let source;
  try { source = readFileSync(resolve(root, relative), 'utf8'); } catch { continue; }
  if (source.includes('\0')) continue;
  const vectorFieldViolation = relative.startsWith('packages/trust-contracts/vectors/') && forbiddenVectorAuthorityField.test(source);
  if (pemPrivateKey.test(source) || literalPrivateMaterial.test(source) || encodedSeedConstruction.test(source) || vectorFieldViolation) keyMaterialHits.push(relative);
}
if (keyMaterialHits.length) throw new Error(`Obvious private key material must never exist in public source: ${keyMaterialHits.join(', ')}`);

const releaseWorkflow = readFileSync(resolve(root, '.github/workflows/release.yml'), 'utf8');
const releaseBuilder = readFileSync(resolve(root, 'scripts/build-release-manifest.mjs'), 'utf8');
for (const [name, source] of [['release workflow', releaseWorkflow], ['release builder', releaseBuilder]]) {
  if (source.includes('apps/distribution')) throw new Error(`${name} imports the private control plane`);
}

console.log('Public Basic source contains no private control-plane implementation or obvious private key material.');
