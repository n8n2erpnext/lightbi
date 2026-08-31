import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalText } from './canonical.js';
import { compare as compareSemVer } from 'semver';
import { entitlementPayloadV1Schema, installationCertificatePayloadV1Schema, issuerKeyRecordV1Schema, issuerKeysetPayloadV1Schema, organizationClaimTokenRecordV1Schema, proPackagePayloadV1Schema, releasePayloadV1Schema, semverSchema, signedEntitlementEnvelopeSchema } from './schemas.js';

const publicKey = Buffer.alloc(32, 7).toString('base64url');
const signature = Buffer.alloc(64, 9).toString('base64url');
const entitlement = { schema: 1 as const, kid: 'test-ent-v1', entitlement_id: 'ent_org_demo', subject: { type: 'organization' as const, id: 'org_demo' }, tier: 'business' as const, capabilities: ['pro_runtime', 'dashboard', 'advanced_scale'], issued_at: '2026-08-29T05:17:00Z', valid_until: '2029-08-29T05:17:00Z', entitlement_version: 1, source: 'internal' as const, seat_limit: 20 };

test('strict UTC timestamps and every lifecycle window fail closed', () => {
  const issuer = { kid: 'test-rel-v1', purpose: 'release' as const, algorithm: 'Ed25519' as const, public_key: publicKey, status: 'active' as const, not_before: '2026-01-01T00:00:00Z', not_after: '2030-01-01T00:00:00Z' };
  const keyset = { schema: 1 as const, kid: 'test-root-v1', keyset_version: 1, issued_at: '2026-01-01T00:00:00Z', expires_at: '2030-01-01T00:00:00Z', keys: [issuer] };
  assert.equal(entitlementPayloadV1Schema.safeParse(entitlement).success, true);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, issued_at: '2026-08-29T12:17:00+07:00' }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, issued_at: '2026-08-29T05:17:00.000Z' }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, issued_at: '2026-02-30T05:17:00Z' }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, valid_until: entitlement.issued_at }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, valid_until: '2026-08-29T05:16:59Z' }).success, false);
  assert.equal(issuerKeyRecordV1Schema.safeParse({ ...issuer, not_after: issuer.not_before }).success, false);
  assert.equal(issuerKeyRecordV1Schema.safeParse({ ...issuer, not_after: '2025-12-31T23:59:59Z' }).success, false);
  assert.equal(issuerKeysetPayloadV1Schema.safeParse({ ...keyset, expires_at: keyset.issued_at }).success, false);
  assert.equal(issuerKeysetPayloadV1Schema.safeParse({ ...keyset, expires_at: '2025-12-31T23:59:59Z' }).success, false);
});

test('subject and tier semantics are exact', () => {
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, seat_limit: 25 }).success, true);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, seat_limit: 7 }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, subject: { type: 'account', id: 'acct_demo' }, tier: 'pro', seat_limit: undefined }).success, true);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, subject: { type: 'account', id: 'acct_demo' }, tier: 'business', seat_limit: undefined }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, subject: { type: 'organization', id: 'org_demo' }, tier: 'pro', seat_limit: undefined }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, source: 'commerce' }).success, true);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, source: 'stripe' }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, source: 'paddle' }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, source: 'partner' }).success, false);
});

test('duplicate capabilities, unknown fields and invalid purpose fail before signing', () => {
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, capabilities: ['dashboard', 'dashboard'] }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, surprise: true }).success, false);
  assert.equal(issuerKeyRecordV1Schema.safeParse({ kid: 'issuer-1', purpose: 'anything', algorithm: 'Ed25519', public_key: publicKey, status: 'active', not_before: entitlement.issued_at, not_after: entitlement.valid_until }).success, false);
  const duplicateMaterial = [
    { kid:'issuer-rel', purpose:'release', algorithm:'Ed25519', public_key:publicKey, status:'active', not_before:'2026-01-01T00:00:00Z', not_after:'2030-01-01T00:00:00Z' },
    { kid:'issuer-ent', purpose:'entitlement', algorithm:'Ed25519', public_key:publicKey, status:'active', not_before:'2026-01-01T00:00:00Z', not_after:'2030-01-01T00:00:00Z' },
  ];
  assert.equal(issuerKeysetPayloadV1Schema.safeParse({ schema:1, kid:'test-root-v1', keyset_version:1, issued_at:'2026-01-01T00:00:00Z', expires_at:'2030-01-01T00:00:00Z', keys:duplicateMaterial }).success, false);
  assert.equal(signedEntitlementEnvelopeSchema.safeParse({ schema: 1, kid: 'other-kid', payload: entitlement, signature }).success, false);
});

test('canonical semantic ordering is scoped to exact contract locations', () => {
  assert.equal(canonicalText({ capabilities: ['zeta', 'alpha'] }), canonicalText({ capabilities: ['alpha', 'zeta'] }));
  assert.notEqual(canonicalText({ metadata: { capabilities: ['zeta', 'alpha'] } }), canonicalText({ metadata: { capabilities: ['alpha', 'zeta'] } }));
  const keysA = { keys: [{ kid: 'z', value: 1 }, { kid: 'a', value: 2 }] };
  const keysB = { keys: [{ kid: 'a', value: 2 }, { kid: 'z', value: 1 }] };
  assert.equal(canonicalText(keysA), canonicalText(keysB));
  assert.notEqual(canonicalText({ nested: keysA }), canonicalText({ nested: keysB }));
});

test('canonical integer domain is exactly the JavaScript safe-integer range', () => {
  assert.doesNotThrow(() => canonicalText({ value: Number.MAX_SAFE_INTEGER }));
  assert.doesNotThrow(() => canonicalText({ value: -Number.MAX_SAFE_INTEGER }));
  assert.throws(() => canonicalText({ value: Number.MAX_SAFE_INTEGER + 1 }), /safe_integers/);
  assert.throws(() => canonicalText({ value: 1.5 }), /safe_integers/);
});

test('all canonical numeric contract fields stay inside the safe-integer domain', () => {
  const issuer = { kid: 'test-rel-v1', purpose: 'release' as const, algorithm: 'Ed25519' as const, public_key: publicKey, status: 'active' as const, not_before: '2026-01-01T00:00:00Z', not_after: '2030-01-01T00:00:00Z' };
  assert.equal(issuerKeysetPayloadV1Schema.safeParse({ schema: 1, kid: 'test-root-v1', keyset_version: Number.MAX_SAFE_INTEGER + 1, issued_at: '2026-01-01T00:00:00Z', expires_at: '2030-01-01T00:00:00Z', keys: [issuer] }).success, false);
  assert.equal(entitlementPayloadV1Schema.safeParse({ ...entitlement, entitlement_version: Number.MAX_SAFE_INTEGER + 1 }).success, false);
});

test('Ed25519 encodings require canonical base64url and exact lengths', () => {
  const record = { kid: 'test-rel-v1', purpose: 'release', algorithm: 'Ed25519', public_key: publicKey, status: 'active', not_before: '2026-01-01T00:00:00Z', not_after: '2030-01-01T00:00:00Z' };
  assert.equal(issuerKeyRecordV1Schema.safeParse(record).success, true);
  assert.equal(issuerKeyRecordV1Schema.safeParse({ ...record, public_key: `${publicKey}=` }).success, false);
  assert.equal(issuerKeyRecordV1Schema.safeParse({ ...record, public_key: Buffer.alloc(31).toString('base64url') }).success, false);
  assert.equal(signedEntitlementEnvelopeSchema.safeParse({ schema: 1, kid: entitlement.kid, payload: entitlement, signature }).success, true);
  assert.equal(signedEntitlementEnvelopeSchema.safeParse({ schema: 1, kid: entitlement.kid, payload: entitlement, signature: Buffer.alloc(63).toString('base64url') }).success, false);
});

test('release and Pro contracts enforce SemVer, basename artifacts and compatibility order', () => {
  const release = { schema: 1 as const, kid: 'test-rel-v1', product_id: 'digital.thaiduy.lightbi', release_id: 'release_demo', version: '1.0.0-beta.1', channel: 'beta' as const, platform: 'windows' as const, architecture: 'x86_64', artifact_name: 'LightBI.exe', artifact_sha256: 'a'.repeat(64), artifact_size: 1, created_at: entitlement.issued_at };
  assert.equal(releasePayloadV1Schema.safeParse(release).success, true);
  assert.equal(releasePayloadV1Schema.safeParse({ ...release, version: '01.0.0' }).success, false);
  assert.equal(semverSchema.safeParse('v1.2.3').success, false);
  assert.equal(semverSchema.safeParse(' 1.2.3 ').success, false);
  assert.equal(semverSchema.safeParse('1.2.3+build.7').success, true);
  assert.equal(releasePayloadV1Schema.safeParse({ ...release, channel:'stable', version:'1.0.0-beta.1' }).success, false);
  assert.equal(releasePayloadV1Schema.safeParse({ ...release, channel:'stable', version:'1.0.0' }).success, true);
  assert.equal(releasePayloadV1Schema.safeParse({ ...release, artifact_name: '../LightBI.exe' }).success, false);
  assert.equal(releasePayloadV1Schema.safeParse({ ...release, artifact_name: 'dir\\LightBI.exe' }).success, false);
  assert.equal(releasePayloadV1Schema.safeParse({ ...release, artifact_name: 'LightBI\n.exe' }).success, false);
  assert.equal(releasePayloadV1Schema.safeParse({ ...release, artifact_size: 0 }).success, false);
  assert.equal(releasePayloadV1Schema.safeParse({ ...release, artifact_size: Number.MAX_SAFE_INTEGER + 1 }).success, false);
  const pro = { schema: 1 as const, kid: 'test-pro-v1', package_id: 'pkg_demo', product_id: release.product_id, version: '1.0.0-beta.1', core_min: '1.0.0-beta.1', core_max: '1.0.0', platform: 'windows' as const, architecture: 'x86_64', sha256: 'b'.repeat(64), size: 1, issued_at: entitlement.issued_at };
  assert.equal(proPackagePayloadV1Schema.safeParse(pro).success, true);
  assert.equal(proPackagePayloadV1Schema.safeParse({ ...pro, core_min: '2.0.0', core_max: '1.0.0' }).success, false);
  assert.equal(proPackagePayloadV1Schema.safeParse({ ...pro, size: 0 }).success, false);
  assert.equal(proPackagePayloadV1Schema.safeParse({ ...pro, size: Number.MAX_SAFE_INTEGER + 1 }).success, false);
  assert.ok(compareSemVer('1.0.0-beta.7', '1.0.0') < 0);
});

test('installation certificate declares Ed25519 device signing keys while one-time claim lifecycle is strict', () => {
  const installation = { schema: 1 as const, kid: 'test-att-v1', product_id: 'digital.thaiduy.lightbi', installation_id: 'install_demo', device_key_algorithm: 'Ed25519' as const, device_public_key: publicKey, release_id: 'release_demo', platform: 'windows' as const, architecture: 'x86_64', issued_at: '2026-08-30T00:00:00Z', expires_at: '2027-08-30T00:00:00Z', certificate_id: 'cert_demo' };
  assert.equal(installationCertificatePayloadV1Schema.safeParse(installation).success, true);
  assert.equal(installationCertificatePayloadV1Schema.safeParse({ ...installation, device_key_algorithm: 'X25519' }).success, false);
  assert.equal(installationCertificatePayloadV1Schema.safeParse({ ...installation, device_public_key: Buffer.alloc(48, 7).toString('base64url') }).success, false);
  assert.equal(installationCertificatePayloadV1Schema.safeParse({ ...installation, expires_at: installation.issued_at }).success, false);
  assert.equal(installationCertificatePayloadV1Schema.safeParse({ ...installation, expires_at: '2026-08-29T23:59:59Z' }).success, false);
  const claim = { schema: 1 as const, token_id: 'claim_demo', organization_id: 'org_demo', entitlement_id: 'ent_demo', token_hash: 'c'.repeat(64), issued_at: '2026-08-30T00:00:00Z', expires_at: '2026-09-01T00:00:00Z', consumed_at: '2026-08-31T00:00:00Z' };
  assert.equal(organizationClaimTokenRecordV1Schema.safeParse(claim).success, true);
  assert.equal(organizationClaimTokenRecordV1Schema.safeParse({ ...claim, expires_at: claim.issued_at }).success, false);
  assert.equal(organizationClaimTokenRecordV1Schema.safeParse({ ...claim, expires_at: '2026-08-29T23:59:59Z' }).success, false);
  assert.equal(organizationClaimTokenRecordV1Schema.safeParse({ ...claim, consumed_at: '2026-08-29T23:59:59Z' }).success, false);
  assert.equal(organizationClaimTokenRecordV1Schema.safeParse({ ...claim, consumed_at: claim.expires_at }).success, false);
  assert.equal(organizationClaimTokenRecordV1Schema.safeParse({ ...claim, consumed_at: '2026-09-01T00:00:01Z' }).success, false);
});
