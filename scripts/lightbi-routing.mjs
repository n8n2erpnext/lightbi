import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const LIGHTBI_ROUTING_PATH = resolve(scriptDir, '../apps/desktop/src/lib/lightbi-routing.json');

export function loadLightBIRouting() {
  const routing = JSON.parse(readFileSync(LIGHTBI_ROUTING_PATH, 'utf8'));
  if (routing?.schemaVersion !== 'lightbi.routing.v1') throw new Error('invalid_lightbi_routing_schema');
  for (const environment of ['production', 'next']) {
    const profile = routing?.[environment];
    if (!profile?.publicOrigin || !profile?.routes) throw new Error(`missing_lightbi_routing_profile:${environment}`);
    const origin = new URL(profile.publicOrigin);
    if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) {
      throw new Error(`invalid_lightbi_public_origin:${environment}`);
    }
  }
  return routing;
}

export function lightBIRoutingProfile(environment) {
  if (!['production', 'next'].includes(environment)) throw new Error(`invalid_lightbi_routing_environment:${environment}`);
  return loadLightBIRouting()[environment];
}
export function lightBIRouteUrl(environment, route = 'home') {
  const profile = lightBIRoutingProfile(environment);
  if (route === 'publicOrigin') return String(profile.publicOrigin).replace(/\/$/u, '');
  const path = profile.routes?.[route];
  if (typeof path !== 'string' || !path.startsWith('/')) throw new Error(`missing_lightbi_route:${environment}:${route}`);
  return new URL(path, `${String(profile.publicOrigin).replace(/\/$/u, '')}/`).toString();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const environment = process.argv[2];
  const route = process.argv[3] ?? 'home';
  process.stdout.write(`${lightBIRouteUrl(environment, route).replace(/\/$/u, route === 'home' ? '/' : '')}\n`);
}
