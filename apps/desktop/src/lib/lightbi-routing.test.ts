import { describe, expect, it } from 'vitest';
import { lightBIDistributionApiBase, lightBIDistributionApiUrl, lightBIFrontendUrl, lightBIInternalReleaseUrl, lightBIRoutingProfile, resolveLightBIRoutingUrl } from './lightbi-routing';

describe('LightBI environment routing manifest', () => {
  it('keeps Production and NEXT route shapes identical while changing only authority origin', () => {
    const production = lightBIRoutingProfile('production');
    const next = lightBIRoutingProfile('next');
    expect(next.routes).toEqual(production.routes);
    expect(new URL(production.publicOrigin).protocol).toBe('https:');
    expect(new URL(next.publicOrigin).protocol).toBe('https:');
    expect(next.publicOrigin).not.toBe(production.publicOrigin);
  });

  it('supports a future domain migration by changing only routing profile data', () => {
    const production = { ...lightBIRoutingProfile('production'), publicOrigin: 'https://lightbi.app' };
    const next = { ...lightBIRoutingProfile('next'), publicOrigin: 'https://next.lightbi.app' };
    expect(resolveLightBIRoutingUrl(production, 'docs')).toBe('https://lightbi.app/docs');
    expect(resolveLightBIRoutingUrl(production, 'plans')).toBe('https://lightbi.app/distribution/#plans');
    expect(resolveLightBIRoutingUrl(next, 'account')).toBe('https://next.lightbi.app/account');
    expect(resolveLightBIRoutingUrl(next, 'distributionApi')).toBe('https://next.lightbi.app/distribution-api');
  });

  it('resolves frontend and Distribution API surfaces from the selected JSON profile', () => {
    const next = lightBIRoutingProfile('next');
    const expected = (route: keyof typeof next.routes) => new URL(next.routes[route], `${next.publicOrigin.replace(/\/$/u, '')}/`).toString();
    expect(lightBIFrontendUrl('liveDemo', 'next')).toBe(expected('liveDemo'));
    expect(lightBIFrontendUrl('docs', 'next')).toBe(expected('docs'));
    expect(lightBIFrontendUrl('account', 'next')).toBe(expected('account'));
    expect(lightBIDistributionApiBase('next')).toBe(expected('distributionApi').replace(/\/$/u, ''));
    expect(lightBIDistributionApiUrl('/api/pair', 'next')).toBe(`${expected('distributionApi').replace(/\/$/u, '')}/api/pair`);
    expect(lightBIInternalReleaseUrl('/latest.json', 'next')).toBe(`${expected('internalReleases').replace(/\/$/u, '')}/latest.json`);
  });
});
