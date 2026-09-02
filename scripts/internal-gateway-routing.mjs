export function isControlPlanePublicPath(pathname) {
  return pathname === '/docs'
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
