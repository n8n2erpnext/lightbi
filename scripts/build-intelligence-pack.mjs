import { createHash, createPrivateKey, sign } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const required = ['--version', '--key-path', '--key-id', '--output', '--catalog'];
for (const key of required) if (!args.get(key)) throw new Error(`missing ${key}`);

const source = args.get('--source') || 'apps/desktop/src/lib/understanding-core/micro-brain/compiled/foundation.index.v1.json';
const payload = readFileSync(source);
const index = JSON.parse(payload.toString('utf8'));
if (index?.manifest?.schemaVersion !== 'lightbi.micro-brain.index.v1') throw new Error('source index schema mismatch');
const createdAt = args.get('--created-at') || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(createdAt)) throw new Error('created-at must use UTC seconds');
const features = ['evidence_bound_analysis_authority_v1', 'micro_brain_index_v1'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = {
  schemaVersion: 'lightbi.intelligence-pack.v1',
  packVersion: args.get('--version'),
  createdAt,
  intelligenceMode: 'data_only',
  contentType: 'application/vnd.lightbi.micro-brain-index+json',
  payloadSchemaVersion: 'lightbi.micro-brain.index.v1',
  payloadSha256: sha256(payload),
  payloadSizeBytes: payload.length,
  minCoreVersion: args.get('--min-core') || '0.9.2-beta.7',
  maxCoreVersionExclusive: args.get('--max-core') || '0.9.3',
  registrySchemaVersion: 'lightbi.semantic-registry.v1',
  requiredFeatureContracts: features,
  signingKeyId: args.get('--key-id'),
};

function canonical(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('manifest numbers must be safe integers');
    return String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') return `{${Object.keys(value).sort((a,b)=>Buffer.from(a).compare(Buffer.from(b))).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  throw new Error('unsupported canonical value');
}

const key = createPrivateKey(readFileSync(args.get('--key-path')));
if (key.asymmetricKeyType !== 'ed25519') throw new Error('Intelligence Pack signing key must be Ed25519');
const signature = sign(null, Buffer.from(canonical(manifest)), key).toString('base64url');
const envelope = Buffer.from(`${JSON.stringify({ manifest, payloadBase64Url: payload.toString('base64url'), signature }, null, 2)}\n`);
const output = path.resolve(args.get('--output'));
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, envelope, { mode: 0o644 });
const envelopeSha256 = sha256(envelope);
const catalog = {
  schemaVersion: 'lightbi.intelligence-pack-catalog.v1',
  latest: {
    packVersion: manifest.packVersion,
    createdAt: manifest.createdAt,
    artifactFilename: path.basename(output),
    envelopeSha256,
    payloadSha256: manifest.payloadSha256,
    signingKeyId: manifest.signingKeyId,
    payloadSchemaVersion: manifest.payloadSchemaVersion,
    registrySchemaVersion: manifest.registrySchemaVersion,
    minCoreVersion: manifest.minCoreVersion,
    maxCoreVersionExclusive: manifest.maxCoreVersionExclusive,
  },
};
const catalogPath = path.resolve(args.get('--catalog'));
mkdirSync(path.dirname(catalogPath), { recursive: true });
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, { mode: 0o644 });
console.log(JSON.stringify({ output, envelopeSha256, payloadSha256: manifest.payloadSha256, payloadBytes: payload.length, envelopeBytes: envelope.length, catalog: catalogPath }, null, 2));
