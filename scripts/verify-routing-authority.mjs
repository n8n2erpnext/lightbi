import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { LIGHTBI_ROUTING_PATH, loadLightBIRouting } from './lightbi-routing.mjs';

const root = resolve('.');
const routing = loadLightBIRouting();
const authorityValues = [routing.production.publicOrigin, routing.next.publicOrigin]
  .map(value => String(value).replace(/\/$/u, ''));
const scanRoots = [
  'apps/desktop/src',
  'crates/lightbi-tauri/src',
  '.github/workflows',
  'scripts',
];
const scanFiles = [
  'apps/desktop/vite.config.ts',
  'crates/lightbi-tauri/tauri.conf.json',
  'crates/lightbi-tauri/Cargo.toml',
];

function filesUnder(path) {
  const absolute = resolve(root, path);
  if (!statSync(absolute).isDirectory()) return [absolute];
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesUnder(resolve(absolute, entry.name)) : [resolve(absolute, entry.name)]);
}
const candidates = [...new Set([...scanRoots.flatMap(filesUnder), ...scanFiles.map(file => resolve(root, file))])];
const canonical = resolve(LIGHTBI_ROUTING_PATH);
const violations = [];
for (const file of candidates) {
  if (file === canonical) continue;
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  for (const origin of authorityValues) {
    if (text.includes(origin)) violations.push(`${relative(root, file)} duplicates ${origin}`);
  }
}
if (violations.length) {
  throw new Error(`LightBI domain authority must live only in lightbi-routing.json:\n${violations.join('\n')}`);
}
const productionRoutes = routing.production.routes;
const nextRoutes = routing.next.routes;
if (JSON.stringify(productionRoutes) !== JSON.stringify(nextRoutes)) throw new Error('production_next_route_shape_drift');
console.log(JSON.stringify({
  schema: 'lightbi.routing-authority-check.v1',
  authorityFile: relative(root, canonical),
  environments: ['production', 'next'],
  scannedFiles: candidates.length,
  duplicatedOrigins: 0,
}));
