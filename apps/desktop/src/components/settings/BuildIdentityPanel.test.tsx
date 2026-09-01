import { describe, expect, it } from 'vitest';
import { buildGenerationManifest } from '../../lib/generation-manifest';
import { describeBuildIdentity } from './BuildIdentityPanel';

const sha = 'a'.repeat(40);

function manifest(channel: 'internal' | 'production', trust: 'phase2a_unfrozen' | 'phase2a_frozen' | 'trust1_enabled') {
  return buildGenerationManifest({
    VITE_LIGHTBI_GENERATION_ID: channel === 'internal' ? 'g-next' : 'g-release',
    VITE_LIGHTBI_PARENT_GENERATION_ID: 'g-parent',
    VITE_LIGHTBI_CHANNEL: channel,
    VITE_LIGHTBI_CORE_COMMIT: sha,
    VITE_LIGHTBI_CONTROL_PLANE_COMMIT: sha,
    VITE_LIGHTBI_CONTROL_PLANE_SCHEMA_VERSION: '065_marketing_newsletter_mail',
    VITE_LIGHTBI_VERSION: '1.0.0-rc.1',
    VITE_LIGHTBI_TEST_PACK_VERSION: 'identity-test',
    VITE_LIGHTBI_TRUST_STATUS: trust,
    VITE_LIGHTBI_TRUST_PHASE2A_HEAD: sha,
    VITE_LIGHTBI_RELEASE_UPDATE_CHANNEL: channel === 'internal' ? 'internal' : 'beta',
    VITE_LIGHTBI_DISTRIBUTION_URL: channel === 'internal' ? 'https://internal.example.test' : 'https://lightbi.thaiduy.digital/distribution',
    VITE_LIGHTBI_ANALYTICS_NAMESPACE: channel === 'internal' ? 'internal/test' : 'production',
    VITE_LIGHTBI_RELEASE_NAMESPACE: channel === 'internal' ? 'internal/lightbi/test' : 'release/lightbi',
    VITE_LIGHTBI_SOURCE_BRANCH: 'test',
    VITE_LIGHTBI_SOURCE_COMMIT: sha,
  });
}

describe('build identity presentation', () => {
  it('never presents an internal successor as an official public release', () => {
    const identity = describeBuildIdentity(manifest('internal', 'trust1_enabled'));
    expect(identity.verified).toBe(false);
    expect(identity.title).toBe('Internal test build');
    expect(identity.badge).toContain('Not an official public release');
  });

  it('fails closed when public publisher verification is unavailable', () => {
    const identity = describeBuildIdentity(manifest('production', 'phase2a_unfrozen'));
    expect(identity.verified).toBe(false);
    expect(identity.title).toContain('not cryptographically verified');
  });

  it('does not convert trust enablement into a self-asserted official badge', () => {
    const identity = describeBuildIdentity(manifest('production', 'trust1_enabled'));
    expect(identity.verified).toBe(false);
    expect(identity.badge).toBe('Release verification pending');
    expect(identity.detail).toContain('REL/ATT verification evidence');
  });
});
