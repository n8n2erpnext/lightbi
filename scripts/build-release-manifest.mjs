import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { updateReleaseIndex, validateReleaseManifest } from './lib/release-manifest.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((value, index, all) => value.startsWith('--') ? [value.slice(2), all[index + 1]] : null).filter(Boolean));
const required = args['artifacts-json'] ? ['version', 'channel', 'output'] : ['version', 'channel', 'artifact', 'artifact-url', 'sha256', 'output'];
for (const key of required) if (!args[key]) throw new Error(`Missing --${key}`);
let artifacts;
if (args['artifacts-json']) {
  artifacts = JSON.parse(readFileSync(args['artifacts-json'], 'utf8'));
  if (!Array.isArray(artifacts) || artifacts.length === 0) throw new Error('Release artifacts JSON must contain a non-empty array');
} else {
  artifacts = [{ platform: args.platform || 'windows', architecture: args.architecture || 'x86_64', kind: args.kind || 'exe', filename: basename(args.artifact), url: args['artifact-url'], size: Number(args.size) || null, sha256: args.sha256 }];
}
const manifest = validateReleaseManifest({
  schema_version: 'lightbi.release.v1', product: 'digital.thaiduy.lightbi', version: args.version.replace(/^v/, ''), channel: args.channel,
  published_at: new Date().toISOString(), release_notes: args['release-notes'] || `LightBI ${args.version}`,
  minimum_updater_version: args['minimum-updater-version'] || null,
  artifacts,
});
writeFileSync(args.output, `${JSON.stringify(manifest, null, 2)}\n`);
if (args['index-output']) {
  let existing = null;
  try {
    existing = JSON.parse(readFileSync(args['index-input'], 'utf8'));
  } catch {
    throw new Error('invalid_release_index_json');
  }
  if (existing !== null && (
    existing.schema_version !== 'lightbi.release-index.v1'
    || existing.product !== 'digital.thaiduy.lightbi'
    || !Array.isArray(existing.releases)
  )) throw new Error('invalid_release_index');
  writeFileSync(args['index-output'], `${JSON.stringify(updateReleaseIndex(existing, manifest), null, 2)}\n`);
}
