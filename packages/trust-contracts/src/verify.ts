import { Buffer } from 'node:buffer';
import { createPublicKey, verify } from 'node:crypto';
import type { ZodType } from 'zod';
import { canonicalizeSignedPayload, sha256Hex } from './canonical.js';
import { requireConfiguredRootPin } from './root-pin.js';
import { entitlementPayloadV1Schema, installationCertificatePayloadV1Schema, issuerKeysetPayloadV1Schema, proPackagePayloadV1Schema, releasePayloadV1Schema, signedEnvelopeSchema, signedIssuerKeysetEnvelopeSchema } from './schemas.js';
import type { EntitlementPayloadV1, InstallationCertificatePayloadV1, IssuerKeysetPayloadV1, KeyPurpose, KeysetTrustStateV1, ProPackagePayloadV1, ReleasePayloadV1, RootPinV1, VerifiedIssuerKeysetV1, VerifiedTrustPayload } from './types.js';

const SPKI_ED25519_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function decodeCanonicalBase64Url(value: string, expectedLength: number): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  try { const bytes = Buffer.from(value, 'base64url'); return bytes.length === expectedLength && bytes.toString('base64url') === value ? bytes : null; } catch { return null; }
}

export function verifyEd25519Signature(payload: unknown, publicKey: string, signatureValue: string): boolean {
  const raw = decodeCanonicalBase64Url(publicKey, 32); const signature = decodeCanonicalBase64Url(signatureValue, 64);
  if (!raw || !signature) return false;
  try { const key = createPublicKey({ key: Buffer.concat([SPKI_ED25519_PREFIX, raw]), format: 'der', type: 'spki' }); return verify(null, canonicalizeSignedPayload(payload), key, signature); } catch { return false; }
}

function requireValidVerificationTime(at: Date): number {
  const value = at instanceof Date ? at.getTime() : Number.NaN;
  if (!Number.isFinite(value)) throw new Error('invalid_verification_time');
  return value;
}

export function validateKeysetProgression(next: KeysetTrustStateV1, previous?: KeysetTrustStateV1): void {
  if (!previous) return;
  if (next.keysetVersion < previous.keysetVersion) throw new Error('keyset_rollback_detected');
  if (next.keysetVersion === previous.keysetVersion && next.payloadDigest !== previous.payloadDigest) throw new Error('keyset_equivocation_detected');
  if (next.keysetVersion > previous.keysetVersion && Date.parse(next.issuedAt) <= Date.parse(previous.issuedAt)) throw new Error('keyset_issued_at_not_monotonic');
}

function verifyIssuerKeysetInternal({ envelope, rootPin, previousState, minimumAcceptedVersion, at = new Date() }: { envelope: unknown; rootPin?: RootPinV1; previousState: KeysetTrustStateV1 | null; minimumAcceptedVersion?: number; at?: Date }): { payload: IssuerKeysetPayloadV1; state: KeysetTrustStateV1 } {
  if (previousState === undefined) throw new Error('previous_keyset_state_required');
  const root = requireConfiguredRootPin(rootPin);
  const parsed = signedIssuerKeysetEnvelopeSchema.parse(envelope);
  if (parsed.kid !== root.kid) throw new Error('root_kid_mismatch');
  if (!verifyEd25519Signature(parsed.payload, root.public_key, parsed.signature)) throw new Error('invalid_root_signature');
  const now = requireValidVerificationTime(at); const issued = Date.parse(parsed.payload.issued_at); const expires = Date.parse(parsed.payload.expires_at);
  if (now < issued) throw new Error('keyset_not_yet_valid');
  if (now >= expires) throw new Error('keyset_expired');
  const requestedFloor = minimumAcceptedVersion ?? root.minimum_keyset_version;
  if (!Number.isSafeInteger(requestedFloor) || requestedFloor < root.minimum_keyset_version) throw new Error('invalid_minimum_keyset_version');
  if (parsed.payload.keyset_version < requestedFloor) throw new Error('keyset_below_accepted_floor');
  const state: KeysetTrustStateV1 = { keysetVersion: parsed.payload.keyset_version, payloadDigest: sha256Hex(canonicalizeSignedPayload(parsed.payload)), issuedAt: parsed.payload.issued_at };
  validateKeysetProgression(state, previousState ?? undefined);
  return { payload: issuerKeysetPayloadV1Schema.parse(parsed.payload), state };
}

export function verifyIssuerKeysetEnvelope(input: { envelope: unknown; rootPin?: RootPinV1; previousState: KeysetTrustStateV1 | null; minimumAcceptedVersion?: number; at?: Date }): VerifiedIssuerKeysetV1 {
  const verified = verifyIssuerKeysetInternal(input);
  return Object.freeze({ state: Object.freeze({ ...verified.state }) });
}

function verifyIssuerPayload<T>({ envelope, payloadSchema, keyset, purpose, signedAt }: { envelope: unknown; payloadSchema: ZodType<T>; keyset: IssuerKeysetPayloadV1; purpose: KeyPurpose; signedAt: (payload: T) => string }): T {
  const parsed = signedEnvelopeSchema(payloadSchema).parse(envelope);
  const key = keyset.keys.find((candidate) => candidate.kid === parsed.kid);
  if (!key) throw new Error('unknown_kid');
  if (key.purpose !== purpose) throw new Error('wrong_key_purpose');
  if (key.status === 'revoked') throw new Error('revoked_key');
  const signed = Date.parse(signedAt(parsed.payload));
  if (signed < Date.parse(key.not_before) || signed > Date.parse(key.not_after)) throw new Error('key_outside_signing_validity');
  if (!verifyEd25519Signature(parsed.payload, key.public_key, parsed.signature)) throw new Error('invalid_signature');
  return parsed.payload;
}

function assertNotFuture(timestamp: string, at: Date, error: string): void { if (Date.parse(timestamp) > requireValidVerificationTime(at)) throw new Error(error); }
function assertCurrentWindow(start: string, end: string, at: Date, prefix: string): void {
  const now = requireValidVerificationTime(at); if (now < Date.parse(start)) throw new Error(`${prefix}_not_yet_valid`); if (now >= Date.parse(end)) throw new Error(`${prefix}_expired`);
}

function verifyWithKeyset<T>({ envelope, keysetEnvelope, rootPin, previousKeysetState, minimumAcceptedVersion, at, payloadSchema, purpose, signedAt, lifecycle }: { envelope: unknown; keysetEnvelope: unknown; rootPin?: RootPinV1; previousKeysetState: KeysetTrustStateV1 | null; minimumAcceptedVersion?: number; at: Date; payloadSchema: ZodType<T>; purpose: KeyPurpose; signedAt: (payload: T) => string; lifecycle: (payload: T, at: Date) => void }): VerifiedTrustPayload<T> {
  const trusted = verifyIssuerKeysetInternal({ envelope: keysetEnvelope, rootPin, previousState: previousKeysetState, minimumAcceptedVersion, at });
  const payload = verifyIssuerPayload({ envelope, payloadSchema, keyset: trusted.payload, purpose, signedAt }); lifecycle(payload, at);
  return { payload, keysetState: trusted.state };
}

export function verifyReleaseEnvelope(input: { envelope: unknown; keysetEnvelope: unknown; rootPin?: RootPinV1; previousKeysetState: KeysetTrustStateV1 | null; minimumAcceptedVersion?: number; at?: Date }): VerifiedTrustPayload<ReleasePayloadV1> {
  const at = input.at ?? new Date(); return verifyWithKeyset({ ...input, at, payloadSchema: releasePayloadV1Schema, purpose: 'release', signedAt: (payload) => payload.created_at, lifecycle: (payload, current) => assertNotFuture(payload.created_at, current, 'release_created_in_future') });
}
export function verifyInstallationCertificateEnvelope(input: { envelope: unknown; keysetEnvelope: unknown; rootPin?: RootPinV1; previousKeysetState: KeysetTrustStateV1 | null; minimumAcceptedVersion?: number; at?: Date }): VerifiedTrustPayload<InstallationCertificatePayloadV1> {
  const at = input.at ?? new Date(); return verifyWithKeyset({ ...input, at, payloadSchema: installationCertificatePayloadV1Schema, purpose: 'attestation', signedAt: (payload) => payload.issued_at, lifecycle: (payload, current) => assertCurrentWindow(payload.issued_at, payload.expires_at, current, 'installation_certificate') });
}
export function verifyEntitlementEnvelope(input: { envelope: unknown; keysetEnvelope: unknown; rootPin?: RootPinV1; previousKeysetState: KeysetTrustStateV1 | null; minimumAcceptedVersion?: number; at?: Date }): VerifiedTrustPayload<EntitlementPayloadV1> {
  const at = input.at ?? new Date(); return verifyWithKeyset({ ...input, at, payloadSchema: entitlementPayloadV1Schema, purpose: 'entitlement', signedAt: (payload) => payload.issued_at, lifecycle: (payload, current) => assertCurrentWindow(payload.issued_at, payload.valid_until, current, 'entitlement') });
}
export function verifyProPackageEnvelope(input: { envelope: unknown; keysetEnvelope: unknown; rootPin?: RootPinV1; previousKeysetState: KeysetTrustStateV1 | null; minimumAcceptedVersion?: number; at?: Date }): VerifiedTrustPayload<ProPackagePayloadV1> {
  const at = input.at ?? new Date(); return verifyWithKeyset({ ...input, at, payloadSchema: proPackagePayloadV1Schema, purpose: 'pro_package', signedAt: (payload) => payload.issued_at, lifecycle: (payload, current) => assertNotFuture(payload.issued_at, current, 'pro_package_issued_in_future') });
}
