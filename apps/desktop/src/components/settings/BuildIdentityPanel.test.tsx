import { describe, expect, it } from 'vitest';
import { buildGenerationManifest } from '../../lib/generation-manifest';
import { deriveOfficialVerificationState, describeBuildIdentity, independentVerificationSurfaceUrl, type BuildIdentityEvidence } from './BuildIdentityPanel';

const sha = 'a'.repeat(40);

function manifest(channel: 'internal' | 'production', trust: 'phase2a_unfrozen' | 'phase2a_frozen' | 'trust1_enabled') {
  return buildGenerationManifest({
    VITE_LIGHTBI_GENERATION_ID: channel === 'internal' ? 'g-next' : 'g-release',
    VITE_LIGHTBI_PARENT_GENERATION_ID: 'g-parent',
    VITE_LIGHTBI_CHANNEL: channel,
    VITE_LIGHTBI_CORE_COMMIT: sha,
    VITE_LIGHTBI_CONTROL_PLANE_COMMIT: sha,
    VITE_LIGHTBI_CONTROL_PLANE_SCHEMA_VERSION: '067_catalog_quarterly_pricing',
    VITE_LIGHTBI_VERSION: '1.0.0-rc.1',
    VITE_LIGHTBI_TEST_PACK_VERSION: 'identity-test',
    VITE_LIGHTBI_TRUST_STATUS: trust,
    VITE_LIGHTBI_TRUST_PHASE2A_HEAD: sha,
    VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL: channel === 'internal' ? 'internal' : 'beta',
    VITE_LIGHTBI_DISTRIBUTION_URL: channel === 'internal' ? 'https://lightbi-next.example.test' : 'https://lightbi.example.test',
    VITE_LIGHTBI_ANALYTICS_NAMESPACE: channel === 'internal' ? 'internal/test' : 'production',
    VITE_LIGHTBI_RELEASE_NAMESPACE: channel === 'internal' ? 'internal/lightbi/test' : 'release/lightbi',
    VITE_LIGHTBI_SOURCE_BRANCH: 'test',
    VITE_LIGHTBI_SOURCE_COMMIT: sha,
  });
}
const evidence = (overrides: Partial<BuildIdentityEvidence> = {}): BuildIdentityEvidence => ({
  relVerified: null,
  artifactDigestVerified: null,
  installationStatus: 'unavailable',
  osPublisherStatus: 'unavailable',
  ...overrides,
});

describe('build identity presentation', () => {
  it('derives the NEXT verifier from the public site origin instead of the API path', () => {
    expect(independentVerificationSurfaceUrl('internal', 'https://lightbi-next.example.test/distribution')).toBe('https://lightbi-next.example.test/verify');
  });

  it('requires an explicit verifier URL for Production and rejects non-web schemes', () => {
    expect(independentVerificationSurfaceUrl('production', 'https://lightbi.example.test/distribution')).toBeNull();
    expect(independentVerificationSurfaceUrl('production', 'https://lightbi.example.test/distribution', 'https://verify.lightbi.example.test/check')).toBe('https://verify.lightbi.example.test/check');
    expect(independentVerificationSurfaceUrl('production', 'https://lightbi.example.test/distribution', 'http://verify.lightbi.example.test/check')).toBeNull();
    expect(independentVerificationSurfaceUrl('production', 'https://lightbi.example.test/distribution', 'javascript:alert(1)')).toBeNull();
  });

  it('never presents an internal successor as an official public release', () => {
    const identity = describeBuildIdentity(manifest('internal', 'trust1_enabled'));
    expect(identity.verified).toBe(false);
    expect(identity.state).toBe('internal_test');
    expect(identity.title).toBe('Internal test build');
    expect(identity.badge).toContain('TEST authority');
  });

  it('fails closed when public publisher verification is unavailable', () => {
    const identity = describeBuildIdentity(manifest('production', 'phase2a_unfrozen'));
    expect(identity.verified).toBe(false);
    expect(identity.state).toBe('verification_unavailable');
    expect(identity.title).toContain('not cryptographically verified');
  });

  it('does not convert trust enablement into a self-asserted official badge', () => {
    const identity = describeBuildIdentity(manifest('production', 'trust1_enabled'));
    expect(identity.verified).toBe(false);
    expect(identity.state).toBe('verification_unavailable');
    expect(identity.detail).toContain('REL/ATT');
  });
  it('derives official_verified only from the full evidence conjunction', () => {
    expect(deriveOfficialVerificationState('production', evidence({
      relVerified: true,
      artifactDigestVerified: true,
      installationStatus: 'valid',
      osPublisherStatus: 'verified',
    }))).toBe('official_verified');
    expect(deriveOfficialVerificationState('production', evidence({
      relVerified: true,
      artifactDigestVerified: true,
      installationStatus: 'valid',
      osPublisherStatus: 'unavailable',
    }))).toBe('verification_unavailable');
  });

  it('distinguishes a verified release from an unverified installation', () => {
    expect(deriveOfficialVerificationState('production', evidence({
      relVerified: true,
      artifactDigestVerified: true,
      installationStatus: 'absent',
      osPublisherStatus: 'verified',
    }))).toBe('official_release_installation_unverified');
  });

  it('fails modified digest or invalid ATT evidence closed', () => {
    expect(deriveOfficialVerificationState('production', evidence({ relVerified: true, artifactDigestVerified: false }))).toBe('modified_or_unrecognized');
    expect(deriveOfficialVerificationState('production', evidence({ relVerified: true, artifactDigestVerified: true, installationStatus: 'invalid' }))).toBe('modified_or_unrecognized');
  });
});
