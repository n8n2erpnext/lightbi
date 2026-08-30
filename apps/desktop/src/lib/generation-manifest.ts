import type { LightBIGenerationChannel, LightBIGenerationManifestV1, LightBITrustStatus } from '@lightbi/core-types';

const PROD_DISTRIBUTION = 'https://lightbi.thaiduy.digital/distribution';
const SHA40 = /^[0-9a-f]{40}$/u;

type GenerationEnv = Partial<Record<
  | 'VITE_LIGHTBI_GENERATION_ID'
  | 'VITE_LIGHTBI_PARENT_GENERATION_ID'
  | 'VITE_LIGHTBI_CHANNEL'
  | 'VITE_LIGHTBI_CORE_COMMIT'
  | 'VITE_LIGHTBI_CONTROL_PLANE_COMMIT'
  | 'VITE_LIGHTBI_CONTROL_PLANE_SCHEMA_VERSION'
  | 'VITE_LIGHTBI_VERSION'
  | 'VITE_LIGHTBI_BUILD_TIMESTAMP'
  | 'VITE_LIGHTBI_TEST_PACK_VERSION'
  | 'VITE_LIGHTBI_TRUST_STATUS'
  | 'VITE_LIGHTBI_TRUST_PHASE2A_HEAD'
  | 'VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL'
  | 'VITE_LIGHTBI_DISTRIBUTION_URL'
  | 'VITE_LIGHTBI_ANALYTICS_NAMESPACE'
  | 'VITE_LIGHTBI_RELEASE_NAMESPACE'
  | 'VITE_LIGHTBI_SOURCE_BRANCH'
  | 'VITE_LIGHTBI_SOURCE_COMMIT'
  | 'VITE_LIGHTBI_BUILDER'
  | 'VITE_LIGHTBI_INFRA_DATABASE_SCOPE'
  | 'VITE_LIGHTBI_INFRA_REDIS_SCOPE'
  | 'VITE_LIGHTBI_INFRA_DATA_SCOPE'
  | 'VITE_LIGHTBI_INFRA_ANALYTICS_SCOPE'
  | 'VITE_LIGHTBI_INFRA_RELEASES_SCOPE'
  | 'VITE_LIGHTBI_INFRA_INTEGRATIONS_SCOPE',
  string
>>;

function text(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function channel(value: string | undefined, fallback: LightBIGenerationChannel): LightBIGenerationChannel {
  return value === 'internal' || value === 'production' ? value : fallback;
}

function trustStatus(value: string | undefined): LightBITrustStatus {
  if (value === 'phase2a_frozen' || value === 'trust1_enabled') return value;
  return 'phase2a_unfrozen';
}

function updateChannel(value: string | undefined): 'internal' | 'beta' | 'stable' {
  if (value === 'internal' || value === 'stable') return value;
  return 'beta';
}

export function buildGenerationManifest(
  env: GenerationEnv = import.meta.env as unknown as GenerationEnv,
): LightBIGenerationManifestV1 {
  const buildChannel = channel(env.VITE_LIGHTBI_CHANNEL, 'production');
  const appVersion = text(env.VITE_LIGHTBI_VERSION, '0.9.2-beta.7');
  const sourceCommit = text(env.VITE_LIGHTBI_SOURCE_COMMIT, text(env.VITE_LIGHTBI_CORE_COMMIT, 'unknown'));
  return {
    schema_version: 'lightbi.generation.v1',
    generation_id: text(env.VITE_LIGHTBI_GENERATION_ID, `legacy-${appVersion}`),
    parent_generation_id: env.VITE_LIGHTBI_PARENT_GENERATION_ID?.trim() || null,
    channel: buildChannel,
    core_commit: text(env.VITE_LIGHTBI_CORE_COMMIT, sourceCommit),
    control_plane_commit: text(env.VITE_LIGHTBI_CONTROL_PLANE_COMMIT, 'unknown'),
    control_plane_schema_version: text(env.VITE_LIGHTBI_CONTROL_PLANE_SCHEMA_VERSION, 'unknown'),
    app_version: appVersion,
    build_timestamp: text(env.VITE_LIGHTBI_BUILD_TIMESTAMP, 'unknown'),
    test_pack_version: text(env.VITE_LIGHTBI_TEST_PACK_VERSION, 'unassigned'),
    trust_status: trustStatus(env.VITE_LIGHTBI_TRUST_STATUS),
    trust_phase2a_head: text(env.VITE_LIGHTBI_TRUST_PHASE2A_HEAD, 'fb8225c951fc27692e6b0e7554c3112ada08e49f'),
    release_update_channel: updateChannel(env.VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL),
    distribution_origin: text(env.VITE_LIGHTBI_DISTRIBUTION_URL, PROD_DISTRIBUTION).replace(/\/$/u, ''),
    analytics_namespace: text(env.VITE_LIGHTBI_ANALYTICS_NAMESPACE, buildChannel),
    release_namespace: text(env.VITE_LIGHTBI_RELEASE_NAMESPACE, buildChannel === 'internal' ? 'internal/lightbi' : 'release/lightbi'),
    infrastructure_scope: {
      database: channel(env.VITE_LIGHTBI_INFRA_DATABASE_SCOPE, buildChannel),
      redis: channel(env.VITE_LIGHTBI_INFRA_REDIS_SCOPE, buildChannel),
      data: channel(env.VITE_LIGHTBI_INFRA_DATA_SCOPE, buildChannel),
      analytics: channel(env.VITE_LIGHTBI_INFRA_ANALYTICS_SCOPE, buildChannel),
      releases: channel(env.VITE_LIGHTBI_INFRA_RELEASES_SCOPE, buildChannel),
      integrations: channel(env.VITE_LIGHTBI_INFRA_INTEGRATIONS_SCOPE, buildChannel),
    },
    build_provenance: {
      source_branch: text(env.VITE_LIGHTBI_SOURCE_BRANCH, 'unknown'),
      source_commit: sourceCommit,
      builder: env.VITE_LIGHTBI_BUILDER?.trim() || null,
    },
  };
}

export function generationIsolationBlockers(manifest: LightBIGenerationManifestV1): string[] {
  if (manifest.channel !== 'internal') return [];
  const blockers: string[] = [];
  if (!manifest.parent_generation_id) blockers.push('parent_generation_id_missing');
  if (!SHA40.test(manifest.core_commit)) blockers.push('core_commit_not_pinned');
  if (!SHA40.test(manifest.control_plane_commit)) blockers.push('control_plane_commit_not_pinned');
  if (!SHA40.test(manifest.build_provenance.source_commit)) blockers.push('source_commit_not_pinned');
  if (manifest.distribution_origin === PROD_DISTRIBUTION) blockers.push('production_distribution_origin');
  if (manifest.release_update_channel !== 'internal') blockers.push('production_update_channel');
  if (!/^internal(?:[-/:]|$)/iu.test(manifest.analytics_namespace)) blockers.push('analytics_namespace_not_internal');
  if (!/^internal(?:\/|$)/u.test(manifest.release_namespace)) blockers.push('release_namespace_not_internal');
  for (const [scope, value] of Object.entries(manifest.infrastructure_scope)) {
    if (value !== 'internal') blockers.push(`production_${scope}_scope`);
  }
  return blockers;
}


export function assertSafeGenerationDistributionTarget(
  endpoint: string,
  manifest: LightBIGenerationManifestV1 = buildGenerationManifest(),
): string {
  const normalized = endpoint.trim().replace(/\/$/u, '');
  if (manifest.channel === 'internal' && normalized === PROD_DISTRIBUTION) {
    throw new Error('LIGHTBI_INTERNAL_PRODUCTION_DISTRIBUTION_BLOCKED');
  }
  return normalized;
}

export function generationTelemetryEnvironment(
  manifest: LightBIGenerationManifestV1 = buildGenerationManifest(),
): 'internal' | 'production' {
  return manifest.channel;
}

export function generationIsSafeForInternal(manifest: LightBIGenerationManifestV1): boolean {
  return generationIsolationBlockers(manifest).length === 0;
}

export const PRODUCTION_DISTRIBUTION_ORIGIN = PROD_DISTRIBUTION;
