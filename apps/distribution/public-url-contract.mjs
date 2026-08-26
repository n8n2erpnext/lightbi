export function normalizePublicOrigin(value, fallback) {
  const candidate = new URL(String(value || fallback));
  if (!['http:', 'https:'].includes(candidate.protocol)) throw new Error('invalid_public_origin');
  return candidate.origin;
}

export function publicFrontendUrl(origin, pathname = '/') {
  const target = new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, `${normalizePublicOrigin(origin, origin)}/`);
  return target.toString();
}

export function publicDistributionApiUrl(origin, pathname) {
  const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return new URL(`/distribution-api${suffix}`, `${normalizePublicOrigin(origin, origin)}/`).toString();
}

export function accountPublicUrls(origin) {
  const normalized = normalizePublicOrigin(origin, origin);
  return {
    origin: normalized,
    account: publicFrontendUrl(normalized, '/account'),
    verify: publicDistributionApiUrl(normalized, '/api/account/verify'),
    googleCallback: publicDistributionApiUrl(normalized, '/api/auth/google/callback'),
  };
}
