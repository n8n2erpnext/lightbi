import assert from 'node:assert/strict';
import test from 'node:test';
import { createInternalGenerationManifest } from './build-generation-manifest.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const base = {
  VITE_LIGHTBI_GENERATION_ID: 'g-next-001',
  VITE_LIGHTBI_PARENT_GENERATION_ID: 'g-current-001',
  VITE_LIGHTBI_CORE_COMMIT: SHA_A,
  VITE_LIGHTBI_SOURCE_COMMIT: SHA_A,
  VITE_LIGHTBI_CONTROL_PLANE_COMMIT: SHA_B,
  VITE_LIGHTBI_CONTROL_PLANE_SCHEMA_VERSION: '061_integrations_delivery',
  VITE_LIGHTBI_TEST_PACK_VERSION: 'lightbi.uat.v1',
  VITE_LIGHTBI_TRUST_PHASE2A_HEAD: 'c'.repeat(40),
  VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL: 'internal',
  VITE_LIGHTBI_DISTRIBUTION_URL: 'https://internal.example/distribution',
  VITE_LIGHTBI_ANALYTICS_NAMESPACE: 'internal/lightbi-analytics',
  VITE_LIGHTBI_RELEASE_NAMESPACE: 'internal/lightbi',
  VITE_LIGHTBI_INFRA_DATABASE_SCOPE: 'internal',
  VITE_LIGHTBI_INFRA_REDIS_SCOPE: 'internal',
  VITE_LIGHTBI_INFRA_DATA_SCOPE: 'internal',
  VITE_LIGHTBI_INFRA_ANALYTICS_SCOPE: 'internal',
  VITE_LIGHTBI_INFRA_RELEASES_SCOPE: 'internal',
  VITE_LIGHTBI_INFRA_INTEGRATIONS_SCOPE: 'internal',
};

test('builds an immutable internal successor manifest', () => {
  const manifest = createInternalGenerationManifest(base);
  assert.equal(manifest.schema_version, 'lightbi.generation.v1');
  assert.equal(manifest.channel, 'internal');
  assert.equal(manifest.core_commit, SHA_A);
  assert.equal(manifest.control_plane_commit, SHA_B);
  assert.equal(manifest.parent_generation_id, 'g-current-001');
  assert.deepEqual(new Set(Object.values(manifest.infrastructure_scope)), new Set(['internal']));
});

test('rejects production wiring for NEXT', () => {
  assert.throws(() => createInternalGenerationManifest({ ...base, VITE_LIGHTBI_DISTRIBUTION_URL:'https://lightbi.thaiduy.digital/distribution' }), /production distribution/iu);
  assert.throws(() => createInternalGenerationManifest({ ...base, VITE_LIGHTBI_INFRA_DATABASE_SCOPE:'production' }), /DATABASE_SCOPE.*internal/iu);
  assert.throws(() => createInternalGenerationManifest({ ...base, VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL:'beta' }), /update channel.*internal/iu);
});

test('rejects browser-facing private network and insecure NEXT endpoints', () => {
  assert.throws(() => createInternalGenerationManifest({ ...base, VITE_LIGHTBI_DISTRIBUTION_URL:'http://100.94.184.141:5273/distribution-api' }), /HTTPS|private-network/iu);
  assert.throws(() => createInternalGenerationManifest({ ...base, VITE_API_BASE_URL:'http://100.94.184.141:5273' }), /HTTPS|private-network/iu);
  assert.throws(() => createInternalGenerationManifest({ ...base, VITE_API_BASE_URL:'https://127.0.0.1:5273' }), /private-network/iu);
  assert.doesNotThrow(() => createInternalGenerationManifest({ ...base, VITE_API_BASE_URL:'/api', VITE_RELEASE_MANIFEST_URL:'/internal-releases/latest.json' }));
  assert.doesNotThrow(() => createInternalGenerationManifest({ ...base, VITE_LIGHTBI_DISTRIBUTION_URL:'https://lightbi-next.thaiduy.digital/distribution-api' }));
});

test('rejects ambiguous internal namespaces', () => {
  assert.throws(() => createInternalGenerationManifest({ ...base, VITE_LIGHTBI_ANALYTICS_NAMESPACE:'production-shadow' }), /analytics namespace.*internal/iu);
  assert.throws(() => createInternalGenerationManifest({ ...base, VITE_LIGHTBI_RELEASE_NAMESPACE:'release/lightbi-next' }), /release namespace.*internal/iu);
});
