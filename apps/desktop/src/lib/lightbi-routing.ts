import routing from './lightbi-routing.json';
import { buildGenerationManifest } from './generation-manifest';

export type LightBIRoutingEnvironment = 'production' | 'next';
export type LightBIRouteName = keyof typeof routing.production.routes;

type RoutingProfile = typeof routing.production;

export function lightBIRoutingEnvironment(): LightBIRoutingEnvironment {
  return buildGenerationManifest().channel === 'internal' ? 'next' : 'production';
}

export function lightBIRoutingProfile(environment: LightBIRoutingEnvironment = lightBIRoutingEnvironment()): RoutingProfile {
  return routing[environment] as RoutingProfile;
}

function join(origin: string, path: string): string {
  const base = origin.replace(/\/$/u, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return suffix === '/' ? `${base}/` : `${base}${suffix}`;
}

export function resolveLightBIRoutingUrl(profile: RoutingProfile, route: LightBIRouteName): string {
  return join(profile.publicOrigin, profile.routes[route]);
}

export function lightBIPublicOrigin(environment?: LightBIRoutingEnvironment): string {
  return lightBIRoutingProfile(environment).publicOrigin.replace(/\/$/u, '');
}

export function lightBIFrontendUrl(route: LightBIRouteName, environment?: LightBIRoutingEnvironment): string {
  return resolveLightBIRoutingUrl(lightBIRoutingProfile(environment), route);
}

export function lightBIDistributionApiBase(environment?: LightBIRoutingEnvironment): string {
  return lightBIFrontendUrl('distributionApi', environment).replace(/\/$/u, '');
}

export function lightBIDistributionApiUrl(path: string, environment?: LightBIRoutingEnvironment): string {
  return join(lightBIDistributionApiBase(environment), path);
}

export function lightBIInternalReleaseUrl(path: string, environment?: LightBIRoutingEnvironment): string {
  const base = lightBIFrontendUrl('internalReleases', environment).replace(/\/$/u, '');
  return join(base, path);
}

export function resolveLightBIExternalTarget(target: string): string {
  const symbolic: Partial<Record<string, LightBIRouteName>> = {
    home: 'home',
    'live-demo': 'liveDemo',
    docs: 'docs',
    'keyboard-shortcuts': 'keyboardShortcuts',
    account: 'account',
    admin: 'admin',
    verify: 'verify',
  };
  const route = symbolic[target];
  return route ? lightBIFrontendUrl(route) : target;
}
