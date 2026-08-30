import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalText, sha256Hex } from './canonical.js';
import { entitlementPayloadV1Schema, installationCertificatePayloadV1Schema, issuerKeysetPayloadV1Schema, proPackagePayloadV1Schema, releasePayloadV1Schema } from './schemas.js';
import type { RootPinV1 } from './types.js';
import { validateKeysetProgression, verifyEd25519Signature, verifyEntitlementEnvelope, verifyInstallationCertificateEnvelope, verifyIssuerKeysetEnvelope, verifyProPackageEnvelope, verifyReleaseEnvelope } from './verify.js';

const vectorDir = resolve(dirname(fileURLToPath(import.meta.url)), '../vectors');
const load = (name: string) => JSON.parse(readFileSync(resolve(vectorDir, name), 'utf8'));
const envelope = (vector: any) => ({ schema: 1, kid: vector.payload.kid, payload: vector.payload, signature: vector.signature });
const keysetV1 = load('keyset-v1.json');
const keysetEnvelopeV1 = envelope(keysetV1);
const rootPin: RootPinV1 = { schema: 1, kid: keysetV1.payload.kid, algorithm: 'Ed25519', public_key: keysetV1.public_key, status: 'configured', minimum_keyset_version: 1 };

test('all TEST-ONLY vectors freeze canonical UTF-8, SHA-256 and Ed25519 signatures', () => {
  const vectors = ['keyset-v1.json', 'keyset-v1-equivocation.json', 'keyset-v2-revoked-ent-rel.json', 'release-v1.json', 'installation-v1.json', 'entitlement-account-pro-v1.json', 'entitlement-business-v1.json', 'pro-package-v1.json'];
  for (const name of vectors) {
    const vector = load(name); const bytes = new TextEncoder().encode(canonicalText(vector.payload));
    assert.equal(vector.test_only, true); assert.equal(canonicalText(vector.payload), vector.canonical_text); assert.equal(Buffer.from(bytes).toString('hex'), vector.canonical_utf8_hex); assert.equal(sha256Hex(bytes), vector.sha256); assert.equal(verifyEd25519Signature(vector.payload, vector.public_key, vector.signature), true);
  }
});


test('adversarial ASCII ordering vector is locale-independent and preserves nested array order', () => {
  const vector = load('canonical-ordering-adversarial-v1.json');
  const bytes = new TextEncoder().encode(canonicalText(vector.payload));
  assert.equal(vector.test_only, true);
  assert.equal(canonicalText(vector.payload), vector.canonical_text);
  assert.equal(Buffer.from(bytes).toString('hex'), vector.canonical_utf8_hex);
  assert.equal(sha256Hex(bytes), vector.sha256);
  assert.deepEqual(JSON.parse(vector.canonical_text).nested.capabilities, ['aaa', 'Aaa']);
});

test('root pin verifies the root-signed keyset and rejects wrong roots or expired keysets', () => {
  const verified = verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin, previousState: null, at: new Date('2026-09-15T00:00:00Z') });
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, previousState: null, at: new Date('2026-09-15T00:00:00Z') }), /lightbi_root_public_key_not_configured/);
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin: { ...rootPin, public_key: 'abc' }, previousState: null, at: new Date('2026-09-15T00:00:00Z') }));
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin, at: new Date('2026-09-15T00:00:00Z') } as any), /previous_keyset_state_required/);
  assert.equal(verified.state.keysetVersion, 1);
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin: { ...rootPin, public_key: Buffer.alloc(32, 3).toString('base64url') }, previousState: null, at: new Date('2026-09-15T00:00:00Z') }), /invalid_root_signature/);
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin, previousState: null, at: new Date('2031-01-01T00:00:00Z') }), /keyset_expired/);
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin, previousState: null, minimumAcceptedVersion: 2, at: new Date('2026-09-15T00:00:00Z') }), /keyset_below_accepted_floor/);
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin: { ...rootPin, minimum_keyset_version: 2 }, previousState: null, at: new Date('2026-09-15T00:00:00Z') }), /keyset_below_accepted_floor/);
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin, previousState: null, at: new Date('invalid') }), /invalid_verification_time/);
});

test('keyset progression prevents rollback and same-version equivocation', () => {
  const first = verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin, previousState: null, at: new Date('2026-09-15T00:00:00Z') });
  const secondVector = load('keyset-v2-revoked-ent-rel.json');
  const second = verifyIssuerKeysetEnvelope({ envelope: envelope(secondVector), rootPin, previousState: first.state, at: new Date('2026-09-15T00:00:00Z') });
  assert.equal(second.state.keysetVersion, 2);
  assert.doesNotThrow(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin, previousState: first.state, at: new Date('2026-09-15T00:00:00Z') }));
  assert.throws(() => validateKeysetProgression({ keysetVersion: 2, payloadDigest: 'x'.repeat(64), issuedAt: first.state.issuedAt }, first.state), /issued_at_not_monotonic/);
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: keysetEnvelopeV1, rootPin, previousState: second.state, at: new Date('2026-09-15T00:00:00Z') }), /rollback/);
  const equivocation = load('keyset-v1-equivocation.json');
  assert.throws(() => verifyIssuerKeysetEnvelope({ envelope: envelope(equivocation), rootPin, previousState: first.state, at: new Date('2026-09-15T00:00:00Z') }), /equivocation/);
});

test('purpose-specific verification follows the full root → issuer → payload chain', () => {
  const release = load('release-v1.json'); const installation = load('installation-v1.json'); const account = load('entitlement-account-pro-v1.json'); const business = load('entitlement-business-v1.json'); const pro = load('pro-package-v1.json');
  assert.equal(verifyReleaseEnvelope({ envelope: envelope(release), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2026-09-15T00:00:00Z') }).payload.version, '0.9.2-beta.7');
  assert.equal(verifyInstallationCertificateEnvelope({ envelope: envelope(installation), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2026-09-15T00:00:00Z') }).payload.certificate_id, 'cert_vector_001');
  assert.equal(verifyEntitlementEnvelope({ envelope: envelope(account), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2028-01-01T00:00:00Z') }).payload.tier, 'pro');
  assert.equal(verifyEntitlementEnvelope({ envelope: envelope(business), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2028-01-01T00:00:00Z') }).payload.tier, 'business');
  assert.equal(verifyProPackageEnvelope({ envelope: envelope(pro), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2026-09-15T00:00:00Z') }).payload.package_id, 'pkg_vector_001');
});

test('retiring issuer remains valid for historical verification inside its signing window', () => {
  const release = load('release-v1.json'); const retiringKeyset = load('keyset-v1-equivocation.json');
  assert.doesNotThrow(() => verifyReleaseEnvelope({ envelope: envelope(release), keysetEnvelope: envelope(retiringKeyset), rootPin, previousKeysetState: null, at: new Date('2028-01-01T00:00:00Z') }));
});

test('historical release survives natural REL expiry but not REL revocation', () => {
  const release = load('release-v1.json');
  assert.doesNotThrow(() => verifyReleaseEnvelope({ envelope: envelope(release), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2028-01-01T00:00:00Z') }));
  const revokedReleaseKeyset = load('keyset-v2-revoked-ent-rel.json');
  assert.throws(() => verifyReleaseEnvelope({ envelope: envelope(release), keysetEnvelope: envelope(revokedReleaseKeyset), rootPin, previousKeysetState: null, at: new Date('2028-01-01T00:00:00Z') }), /revoked_key/);
});

test('issuer validity is checked at signing time while payload validity is checked at current time', () => {
  const business = load('entitlement-business-v1.json');
  const entKey = keysetV1.payload.keys.find((key: any) => key.kid === business.payload.kid);
  assert.equal(entKey.status, 'expired'); assert.equal(entKey.not_after, '2027-01-01T00:00:00Z');
  assert.doesNotThrow(() => verifyEntitlementEnvelope({ envelope: envelope(business), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2028-01-01T00:00:00Z') }));
  assert.throws(() => verifyEntitlementEnvelope({ envelope: envelope(business), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2029-08-29T05:17:00Z') }), /entitlement_expired/);
  const revoked = load('keyset-v2-revoked-ent-rel.json');
  assert.throws(() => verifyEntitlementEnvelope({ envelope: envelope(business), keysetEnvelope: envelope(revoked), rootPin, previousKeysetState: null, at: new Date('2028-01-01T00:00:00Z') }), /revoked_key/);
});

test('purpose lifecycles reject not-yet-valid, expired and future payloads', () => {
  const installation = load('installation-v1.json'); const pro = load('pro-package-v1.json');
  assert.throws(() => verifyInstallationCertificateEnvelope({ envelope: envelope(installation), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2026-08-29T23:59:59Z') }), /not_yet_valid/);
  assert.throws(() => verifyInstallationCertificateEnvelope({ envelope: envelope(installation), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2027-08-30T00:00:00Z') }), /expired/);
  assert.throws(() => verifyProPackageEnvelope({ envelope: envelope(pro), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2026-08-29T23:59:59Z') }), /issued_in_future/);
});

test('tampering, malformed signatures and purpose confusion fail closed', () => {
  const business = load('entitlement-business-v1.json');
  assert.throws(() => verifyEntitlementEnvelope({ envelope: { ...envelope(business), payload: { ...business.payload, seat_limit: 25 } }, keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2028-01-01T00:00:00Z') }), /invalid_signature/);
  assert.throws(() => verifyEntitlementEnvelope({ envelope: { ...envelope(business), signature: 'abc' }, keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2028-01-01T00:00:00Z') }));
  const release = load('release-v1.json');
  assert.throws(() => verifyEntitlementEnvelope({ envelope: envelope(release), keysetEnvelope: keysetEnvelopeV1, rootPin, previousKeysetState: null, at: new Date('2026-09-15T00:00:00Z') }));
});

test('vector payload schemas parse independently of signature verification', () => {
  assert.equal(issuerKeysetPayloadV1Schema.safeParse(keysetV1.payload).success, true);
  assert.equal(releasePayloadV1Schema.safeParse(load('release-v1.json').payload).success, true);
  assert.equal(installationCertificatePayloadV1Schema.safeParse(load('installation-v1.json').payload).success, true);
  assert.equal(entitlementPayloadV1Schema.safeParse(load('entitlement-business-v1.json').payload).success, true);
  assert.equal(proPackagePayloadV1Schema.safeParse(load('pro-package-v1.json').payload).success, true);
});
