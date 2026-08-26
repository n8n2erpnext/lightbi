import assert from 'node:assert/strict';
import test from 'node:test';
import { accountPublicUrls, normalizePublicOrigin, publicDistributionApiUrl, publicFrontendUrl } from './public-url-contract.mjs';
import { assertLicenseGrantsPro, licenseGrantsPro } from './license-policy.mjs';

test('separates public origin, frontend routes and distribution API routes', () => {
  const origin = normalizePublicOrigin('https://lightbi.thaiduy.digital/distribution', 'http://localhost:5174');
  assert.equal(origin, 'https://lightbi.thaiduy.digital');
  assert.equal(publicFrontendUrl(origin, '/account?reset=token'), 'https://lightbi.thaiduy.digital/account?reset=token');
  assert.equal(publicDistributionApiUrl(origin, '/api/account/verify?token=token'), 'https://lightbi.thaiduy.digital/distribution-api/api/account/verify?token=token');
  assert.deepEqual(accountPublicUrls('https://lightbi.thaiduy.digital/distribution'), {
    origin: 'https://lightbi.thaiduy.digital',
    account: 'https://lightbi.thaiduy.digital/account',
    verify: 'https://lightbi.thaiduy.digital/distribution-api/api/account/verify',
    googleCallback: 'https://lightbi.thaiduy.digital/distribution-api/api/auth/google/callback',
  });
});

test('never treats partner discounts as Pro entitlements at any percentage', () => {
  assert.equal(licenseGrantsPro({ kind: 'complimentary' }), true);
  assert.equal(licenseGrantsPro({ kind: 'paid' }), true);
  assert.equal(licenseGrantsPro({}), true);
  for (const discount_percent of [10, 50, 90, 100]) {
    const offer = { kind: 'partner_discount', discount_percent };
    assert.equal(licenseGrantsPro(offer), false);
    assert.throws(() => assertLicenseGrantsPro(offer), /partner_discount_requires_checkout/);
  }
});
