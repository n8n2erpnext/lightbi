import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { lightBIRouteUrl } from './lightbi-routing.mjs';

const PROD_PUBLIC_ORIGIN = lightBIRouteUrl('production', 'publicOrigin').replace(/\/$/u, '');
const NEXT_DISTRIBUTION_API = lightBIRouteUrl('next', 'distributionApi').replace(/\/$/u, '');
const SHA40 = /^[0-9a-f]{40}$/u;

function assertPublicBrowserUrl(value, key, { allowRelative = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return raw;
  if (allowRelative && raw.startsWith('/')) return raw;
  let url;
  try { url = new URL(raw); } catch { throw new Error(`${key} must be an HTTPS public URL or an approved relative path`); }
  if (url.protocol !== 'https:') throw new Error(`${key} must use HTTPS for browser-facing NEXT traffic`);
  const host = String(url.hostname || '').toLowerCase();
  const privateIpv4 = /^(?:127\.|10\.|192\.168\.|169\.254\.)/u.test(host)
    || /^172\.(?:1[6-9]|2\d|3[01])\./u.test(host)
    || /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./u.test(host);
  if (host === 'localhost' || host === '::1' || privateIpv4) throw new Error(`${key} may not expose localhost or private-network addresses to the browser`);
  return raw.replace(/\/$/u, '');
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function required(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing required internal generation value: ${key}`);
  return value;
}

export function createInternalGenerationManifest(env = process.env) {
  const coreCommit = env.VITE_LIGHTBI_CORE_COMMIT?.trim() || git('rev-parse', 'HEAD');
  const sourceCommit = env.VITE_LIGHTBI_SOURCE_COMMIT?.trim() || coreCommit;
  const controlPlaneCommit = required(env, 'VITE_LIGHTBI_CONTROL_PLANE_COMMIT');
  for (const [name, value] of [['core', coreCommit], ['source', sourceCommit], ['control_plane', controlPlaneCommit]]) {
    if (!SHA40.test(value)) throw new Error(`${name} commit must be a full 40-character SHA`);
  }
  const distributionOrigin = assertPublicBrowserUrl(env.VITE_LIGHTBI_DISTRIBUTION_URL?.trim() || NEXT_DISTRIBUTION_API, 'VITE_LIGHTBI_DISTRIBUTION_URL');
  assertPublicBrowserUrl(env.VITE_API_BASE_URL, 'VITE_API_BASE_URL', { allowRelative: true });
  assertPublicBrowserUrl(env.VITE_HEALTH_URL, 'VITE_HEALTH_URL', { allowRelative: true });
  assertPublicBrowserUrl(env.VITE_RELEASE_MANIFEST_URL, 'VITE_RELEASE_MANIFEST_URL', { allowRelative: true });
  if (new URL(distributionOrigin).origin === PROD_PUBLIC_ORIGIN) throw new Error('Internal generation may not target the production distribution origin');
  const phase2aHead = required(env, 'VITE_LIGHTBI_TRUST_PHASE2A_HEAD');
  if (!SHA40.test(phase2aHead)) throw new Error('VITE_LIGHTBI_TRUST_PHASE2A_HEAD must be a full 40-character SHA');
  const analyticsNamespace = required(env, 'VITE_LIGHTBI_ANALYTICS_NAMESPACE');
  if (!/^internal(?:[-/:]|$)/iu.test(analyticsNamespace)) throw new Error('Internal analytics namespace must be explicitly internal');
  const releaseNamespace = required(env, 'VITE_LIGHTBI_RELEASE_NAMESPACE');
  if (!/^internal(?:\/|$)/u.test(releaseNamespace)) throw new Error('Internal release namespace must live under internal/');
  const updateChannel = required(env, 'VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL');
  if (updateChannel !== 'internal') throw new Error('Internal generation update channel must be internal');
  const scopes = ['DATABASE','REDIS','DATA','ANALYTICS','RELEASES','INTEGRATIONS'];
  const infrastructureScope = Object.fromEntries(scopes.map(scope => {
    const key = `VITE_LIGHTBI_INFRA_${scope}_SCOPE`;
    const value = required(env, key);
    if (value !== 'internal') throw new Error(`${key} must be internal`);
    return [scope.toLowerCase(), value];
  }));
  return {
    schema_version: 'lightbi.generation.v1',
    generation_id: required(env, 'VITE_LIGHTBI_GENERATION_ID'),
    parent_generation_id: required(env, 'VITE_LIGHTBI_PARENT_GENERATION_ID'),
    channel: 'internal',
    core_commit: coreCommit,
    control_plane_commit: controlPlaneCommit,
    control_plane_schema_version: required(env, 'VITE_LIGHTBI_CONTROL_PLANE_SCHEMA_VERSION'),
    app_version: env.VITE_LIGHTBI_VERSION?.trim() || '0.9.2-beta.7',
    build_timestamp: env.VITE_LIGHTBI_BUILD_TIMESTAMP?.trim() || new Date().toISOString(),
    test_pack_version: required(env, 'VITE_LIGHTBI_TEST_PACK_VERSION'),
    trust_status: env.VITE_LIGHTBI_TRUST_STATUS?.trim() || 'phase2a_unfrozen',
    trust_phase2a_head: phase2aHead,
    release_update_channel: updateChannel,
    distribution_origin: distributionOrigin,
    analytics_namespace: analyticsNamespace,
    release_namespace: releaseNamespace,
    infrastructure_scope: infrastructureScope,
    build_provenance: {
      source_branch: env.VITE_LIGHTBI_SOURCE_BRANCH?.trim() || git('rev-parse', '--abbrev-ref', 'HEAD'),
      source_commit: sourceCommit,
      builder: env.VITE_LIGHTBI_BUILDER?.trim() || null,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const output = resolve(process.argv[2] || 'releases/internal/lightbi-generation.json');
  const manifest = createInternalGenerationManifest();
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(output);
}
