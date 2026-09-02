import { describe, expect, it } from 'vitest';
import { lightBIDistributionApiBase, lightBIDistributionApiUrl, lightBIFrontendUrl, lightBIInternalReleaseUrl, lightBIRoutingProfile } from './lightbi-routing';

describe('LightBI environment routing manifest', () => {
  it('keeps Production and NEXT route shapes identical while changing only authority origin', () => {
    const production = lightBIRoutingProfile('production');
    const next = lightBIRoutingProfile('next');
    expect(next.routes).toEqual(production.routes);
    expect(production.publicOrigin).toBe('https://lightbi.thaiduy.digital');
    expect(next.publicOrigin).toBe('https://lightbi-next.thaiduy.digital');
  });

  it('resolves frontend and Distribution API surfaces without leaking gateway internals into user routes', () => {
    expect(lightBIFrontendUrl('liveDemo', 'next')).toBe('https://lightbi-next.thaiduy.digital/app');
    expect(lightBIFrontendUrl('docs', 'next')).toBe('https://lightbi-next.thaiduy.digital/docs');
    expect(lightBIFrontendUrl('account', 'next')).toBe('https://lightbi-next.thaiduy.digital/account');
    expect(lightBIDistributionApiBase('next')).toBe('https://lightbi-next.thaiduy.digital/distribution-api');
    expect(lightBIDistributionApiUrl('/api/pair', 'next')).toBe('https://lightbi-next.thaiduy.digital/distribution-api/api/pair');
    expect(lightBIInternalReleaseUrl('/latest.json', 'next')).toBe('https://lightbi-next.thaiduy.digital/internal-releases/latest.json');
  });
});
