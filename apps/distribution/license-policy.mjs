export function normalizedLicenseKind(license) {
  return String(license?.kind || 'paid').trim().toLowerCase();
}

export function licenseGrantsPro(license) {
  return ['paid', 'complimentary'].includes(normalizedLicenseKind(license));
}

export function assertLicenseGrantsPro(license) {
  if (!licenseGrantsPro(license)) throw new Error('partner_discount_requires_checkout');
  return license;
}
