const controlPlaneApiPrefixes = [
  '/api/account',
  '/api/admin',
  '/api/announcements',
  '/api/app/event',
  '/api/auth/google',
  '/api/catalog',
  '/api/checkout',
  '/api/config',
  '/api/docs',
  '/api/download',
  '/api/installation',
  '/api/license',
  '/api/newsletter',
  '/api/pair',
  '/api/releases',
  '/api/visit',
  '/api/webhooks',
];

function matchesPathPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isControlPlaneApiPath(pathname) {
  return controlPlaneApiPrefixes.some((prefix) => matchesPathPrefix(pathname, prefix));
}

export function isControlPlanePublicPath(pathname) {
  return pathname === '/'
    || pathname === '/docs'
    || pathname.startsWith('/docs/')
    || pathname === '/account'
    || pathname.startsWith('/account/')
    || pathname === '/admin'
    || pathname === '/verify'
    || pathname === '/distribution-assets'
    || pathname.startsWith('/distribution-assets/')
    || pathname === '/internal-releases'
    || pathname.startsWith('/internal-releases/');
}
