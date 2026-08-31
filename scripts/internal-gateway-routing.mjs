export function isControlPlanePublicPath(pathname) {
  return pathname === '/docs'
    || pathname.startsWith('/docs/')
    || pathname === '/distribution-assets'
    || pathname.startsWith('/distribution-assets/');
}
