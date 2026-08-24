import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { updateReleaseIndex, validateReleaseManifest } from '../apps/distribution/release-manifest.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((value, index, all) => value.startsWith('--') ? [value.slice(2), all[index + 1]] : null).filter(Boolean));
const required = ['version', 'channel', 'artifact', 'artifact-url', 'sha256', 'output'];
for (const key of required) if (!args[key]) throw new Error(`Missing --${key}`);
const manifest = validateReleaseManifest({
  schema_version: 'lightbi.release.v1', product: 'digital.thaiduy.lightbi', version: args.version.replace(/^v/, ''), channel: args.channel,
  published_at: new Date().toISOString(), release_notes: args['release-notes'] || `LightBI ${args.version}`,
  minimum_updater_version: args['minimum-updater-version'] || null,
  artifacts: [{ platform: args.platform || 'windows', architecture: args.architecture || 'x86_64', kind: args.kind || 'exe', filename: basename(args.artifact), url: args['artifact-url'], size: Number(args.size) || null, sha256: args.sha256 }],
});
writeFileSync(args.output, `${JSON.stringify(manifest, null, 2)}\n`);
if (args['index-output']) {
  let existing = null;
  try { existing = JSON.parse(readFileSync(args['index-input'], 'utf8')); } catch {}
  writeFileSync(args['index-output'], `${JSON.stringify(updateReleaseIndex(existing, manifest), null, 2)}\n`);
}
