import { describe, expect, it } from 'vitest';
import { buildGenerationManifest, generationIsolationBlockers, generationIsSafeForInternal } from './generation-manifest';
import routing from './lightbi-routing.json';

const CORE = '326d991a8f305fef938e9aab47897dd233146770';
const CP = '9c89a8171f81930f1bc24672fc26978a1a6c4377';

function internalEnv() {
  return {
    VITE_LIGHTBI_GENERATION_ID: 'g-2026-08-30-next-001',
    VITE_LIGHTBI_PARENT_GENERATION_ID: 'g-2026-08-29-prod-001',
    VITE_LIGHTBI_CHANNEL: 'internal',
    VITE_LIGHTBI_CORE_COMMIT: CORE,
    VITE_LIGHTBI_CONTROL_PLANE_COMMIT: CP,
    VITE_LIGHTBI_CONTROL_PLANE_SCHEMA_VERSION: '061_integrations_delivery',
    VITE_LIGHTBI_VERSION: '0.9.2-beta.7',
    VITE_LIGHTBI_BUILD_TIMESTAMP: '2026-08-30T10:00:00.000Z',
    VITE_LIGHTBI_TEST_PACK_VERSION: 'lightbi.uat.v1',
    VITE_LIGHTBI_TRUST_STATUS: 'phase2a_unfrozen',
    VITE_LIGHTBI_TRUST_PHASE2A_HEAD: 'fb8225c951fc27692e6b0e7554c3112ada08e49f',
    VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL: 'internal',
    VITE_LIGHTBI_DISTRIBUTION_URL: 'https://lightbi-internal.example.test/distribution',
    VITE_LIGHTBI_ANALYTICS_NAMESPACE: 'internal/lightbi-analytics',
    VITE_LIGHTBI_RELEASE_NAMESPACE: 'internal/lightbi',
    VITE_LIGHTBI_SOURCE_BRANCH: 'codex/next-internal-generation-20260830',
    VITE_LIGHTBI_SOURCE_COMMIT: CORE,
    VITE_LIGHTBI_BUILDER: 'github-actions',
    VITE_LIGHTBI_INFRA_DATABASE_SCOPE: 'internal',
    VITE_LIGHTBI_INFRA_REDIS_SCOPE: 'internal',
    VITE_LIGHTBI_INFRA_DATA_SCOPE: 'internal',
    VITE_LIGHTBI_INFRA_ANALYTICS_SCOPE: 'internal',
    VITE_LIGHTBI_INFRA_RELEASES_SCOPE: 'internal',
    VITE_LIGHTBI_INFRA_INTEGRATIONS_SCOPE: 'internal',
  };
}

describe('LightBI generation manifest', () => {
  it('builds a pinned successor generation manifest', () => {
    const manifest = buildGenerationManifest(internalEnv());
    expect(manifest).toMatchObject({
      schema_version: 'lightbi.generation.v1',
      generation_id: 'g-2026-08-30-next-001',
      parent_generation_id: 'g-2026-08-29-prod-001',
      channel: 'internal',
      core_commit: CORE,
      control_plane_commit: CP,
      release_update_channel: 'internal',
      trust_status: 'phase2a_unfrozen',
    });
    expect(generationIsolationBlockers(manifest)).toEqual([]);
    expect(generationIsSafeForInternal(manifest)).toBe(true);
  });

  it('blocks an internal generation from falling back to production distribution and scopes', () => {
    const env = internalEnv();
    env.VITE_LIGHTBI_DISTRIBUTION_URL = new URL(routing.production.routes.distributionApi, `${routing.production.publicOrigin}/`).toString();
    env.VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL = 'beta';
    env.VITE_LIGHTBI_INFRA_DATABASE_SCOPE = 'production';
    const blockers = generationIsolationBlockers(buildGenerationManifest(env));
    expect(blockers).toContain('production_distribution_origin');
    expect(blockers).toContain('production_update_channel');
    expect(blockers).toContain('production_database_scope');
  });

  it('requires pinned successor provenance for internal builds', () => {
    const env = internalEnv();
    delete env.VITE_LIGHTBI_PARENT_GENERATION_ID;
    env.VITE_LIGHTBI_CORE_COMMIT = 'unknown';
    env.VITE_LIGHTBI_CONTROL_PLANE_COMMIT = 'short';
    env.VITE_LIGHTBI_SOURCE_COMMIT = 'unknown';
    expect(generationIsolationBlockers(buildGenerationManifest(env))).toEqual(expect.arrayContaining([
      'parent_generation_id_missing',
      'core_commit_not_pinned',
      'control_plane_commit_not_pinned',
      'source_commit_not_pinned',
    ]));
  });


  it('rejects ambiguous analytics and release namespaces in internal builds', () => {
    const env = internalEnv();
    env.VITE_LIGHTBI_ANALYTICS_NAMESPACE = 'production-shadow';
    env.VITE_LIGHTBI_RELEASE_NAMESPACE = 'release/lightbi-next';
    expect(generationIsolationBlockers(buildGenerationManifest(env))).toEqual(expect.arrayContaining([
      'analytics_namespace_not_internal',
      'release_namespace_not_internal',
    ]));
  });

  it('does not retroactively impose NEXT isolation rules on legacy production builds', () => {
    const manifest = buildGenerationManifest({ VITE_LIGHTBI_CHANNEL: 'production' });
    expect(manifest.channel).toBe('production');
    expect(generationIsolationBlockers(manifest)).toEqual([]);
  });
});
