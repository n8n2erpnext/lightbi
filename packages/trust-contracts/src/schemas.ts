import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { compare as compareSemVer, valid as validSemVer } from 'semver';
import { BUSINESS_SEAT_LIMITS, KEY_PURPOSES, KEY_STATUSES } from './types.js';

export const canonicalTimestampSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u).refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value.replace('Z', '.000Z'), 'invalid UTC timestamp');
const id = z.string().min(3).max(160).regex(/^[a-zA-Z0-9._:-]+$/u);
const sha = z.string().regex(/^[a-f0-9]{64}$/u);
const integer = z.number().int().safe().nonnegative();
const positiveInteger = z.number().int().safe().positive();
const platform = z.enum(['windows', 'linux', 'macos']);
const strict = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

function canonicalBase64UrlRange(minLength: number, maxLength: number, label: string) {
  return z.string().regex(/^[A-Za-z0-9_-]+$/u).superRefine((value, context) => {
    try {
      const bytes = Buffer.from(value, 'base64url');
      if (bytes.length < minLength || bytes.length > maxLength || bytes.toString('base64url') !== value) context.addIssue({ code: 'custom', message: `${label} must use canonical base64url encoding with ${minLength}-${maxLength} bytes` });
    } catch { context.addIssue({ code: 'custom', message: `${label} is invalid base64url` }); }
  });
}
function canonicalBase64UrlBytes(length: number, label: string) { return canonicalBase64UrlRange(length, length, label); }

export const ed25519PublicKeySchema = canonicalBase64UrlBytes(32, 'Ed25519 public key');
export const ed25519SignatureSchema = canonicalBase64UrlBytes(64, 'Ed25519 signature');
export const devicePublicKeySchema = canonicalBase64UrlBytes(32, 'Ed25519 device public key');
export const semverSchema = z.string().min(1).max(80).refine((value) => validSemVer(value) !== null, 'invalid SemVer');
const basenameArtifact = z.string().min(1).max(255).refine((value) => value !== '.' && value !== '..' && !value.includes('/') && !value.includes('\\') && !value.includes(':') && !/[\u0000-\u001F\u007F]/u.test(value), 'artifact_name must be a portable basename');
const capabilities = z.array(id).max(128).superRefine((items, context) => { if (new Set(items).size !== items.length) context.addIssue({ code: 'custom', message: 'duplicate capabilities are invalid' }); });

export const entitlementSubjectSchema = z.discriminatedUnion('type', [strict({ type: z.literal('account'), id }), strict({ type: z.literal('organization'), id })]);
export const issuerKeyRecordV1Schema = strict({ kid: id, purpose: z.enum(KEY_PURPOSES), algorithm: z.literal('Ed25519'), public_key: ed25519PublicKeySchema, status: z.enum(KEY_STATUSES), not_before: canonicalTimestampSchema, not_after: canonicalTimestampSchema }).superRefine((value, context) => { if (Date.parse(value.not_before) >= Date.parse(value.not_after)) context.addIssue({ code: 'custom', path: ['not_after'], message: 'key validity window must increase' }); });
export const issuerKeysetPayloadV1Schema = strict({ schema: z.literal(1), kid: id, keyset_version: positiveInteger, issued_at: canonicalTimestampSchema, expires_at: canonicalTimestampSchema, keys: z.array(issuerKeyRecordV1Schema).min(1) }).superRefine((value, context) => {
  if (new Set(value.keys.map((key) => key.kid)).size !== value.keys.length) context.addIssue({ code: 'custom', path: ['keys'], message: 'duplicate key ids are invalid' });
  if (Date.parse(value.issued_at) >= Date.parse(value.expires_at)) context.addIssue({ code: 'custom', path: ['expires_at'], message: 'keyset validity window must increase' });
});
export const releasePayloadV1Schema = strict({ schema: z.literal(1), kid: id, product_id: id, release_id: id, version: semverSchema, channel: z.enum(['beta', 'stable']), platform, architecture: id, artifact_name: basenameArtifact, artifact_sha256: sha, artifact_size: positiveInteger, created_at: canonicalTimestampSchema });
export const installationCertificatePayloadV1Schema = strict({ schema: z.literal(1), kid: id, product_id: id, installation_id: id, device_key_algorithm: z.literal('Ed25519'), device_public_key: devicePublicKeySchema, release_id: id, platform, architecture: id, issued_at: canonicalTimestampSchema, expires_at: canonicalTimestampSchema, certificate_id: id }).superRefine((value, context) => { if (Date.parse(value.issued_at) >= Date.parse(value.expires_at)) context.addIssue({ code: 'custom', path: ['expires_at'], message: 'installation certificate validity window must increase' }); });
export const entitlementPayloadV1Schema = strict({ schema: z.literal(1), kid: id, entitlement_id: id, subject: entitlementSubjectSchema, tier: z.enum(['basic', 'pro', 'business']), capabilities, issued_at: canonicalTimestampSchema, valid_until: canonicalTimestampSchema, entitlement_version: positiveInteger, source: z.enum(['stripe', 'complimentary', 'beta_campaign', 'partner', 'internal']), seat_limit: positiveInteger.optional() }).superRefine((value, context) => {
  if (value.subject.type === 'account') {
    if (value.tier === 'business') context.addIssue({ code: 'custom', path: ['tier'], message: 'account subjects may only receive basic or pro tier' });
    if (value.seat_limit !== undefined) context.addIssue({ code: 'custom', path: ['seat_limit'], message: 'account entitlement cannot carry seat_limit' });
  } else {
    if (value.tier !== 'business') context.addIssue({ code: 'custom', path: ['tier'], message: 'organization subjects require business tier' });
    if (!BUSINESS_SEAT_LIMITS.includes(value.seat_limit as never)) context.addIssue({ code: 'custom', path: ['seat_limit'], message: 'unsupported named-user seat limit' });
  }
  if (Date.parse(value.issued_at) >= Date.parse(value.valid_until)) context.addIssue({ code: 'custom', path: ['valid_until'], message: 'entitlement validity window must increase' });
});
export const proPackagePayloadV1Schema = strict({ schema: z.literal(1), kid: id, package_id: id, product_id: id, version: semverSchema, core_min: semverSchema, core_max: semverSchema, platform, architecture: id, sha256: sha, size: positiveInteger, issued_at: canonicalTimestampSchema }).superRefine((value, context) => { if (compareSemVer(value.core_min, value.core_max) > 0) context.addIssue({ code: 'custom', path: ['core_max'], message: 'core compatibility range must increase' }); });
export const signedEnvelopeSchema = <T extends z.ZodTypeAny>(payload: T) => strict({ schema: z.literal(1), kid: id, payload, signature: ed25519SignatureSchema }).superRefine((value, context) => { const envelope = value as unknown as { kid: string; payload: { kid?: string } }; if (envelope.kid !== envelope.payload.kid) context.addIssue({ code: 'custom', path: ['kid'], message: 'envelope and payload kid must match' }); });
export const signedEntitlementEnvelopeSchema = signedEnvelopeSchema(entitlementPayloadV1Schema);
export const signedIssuerKeysetEnvelopeSchema = signedEnvelopeSchema(issuerKeysetPayloadV1Schema);
export const signedReleaseEnvelopeSchema = signedEnvelopeSchema(releasePayloadV1Schema);
export const signedInstallationCertificateEnvelopeSchema = signedEnvelopeSchema(installationCertificatePayloadV1Schema);
export const signedProPackageEnvelopeSchema = signedEnvelopeSchema(proPackagePayloadV1Schema);
export const organizationClaimTokenRecordV1Schema = strict({ schema: z.literal(1), token_id: id, organization_id: id, entitlement_id: id, token_hash: sha, issued_at: canonicalTimestampSchema, expires_at: canonicalTimestampSchema, consumed_at: canonicalTimestampSchema.nullable() }).superRefine((value, context) => {
  const issued = Date.parse(value.issued_at); const expires = Date.parse(value.expires_at);
  if (issued >= expires) context.addIssue({ code: 'custom', path: ['expires_at'], message: 'claim validity window must increase' });
  if (value.consumed_at !== null) { const consumed = Date.parse(value.consumed_at); if (consumed < issued || consumed > expires) context.addIssue({ code: 'custom', path: ['consumed_at'], message: 'claim consumption must occur inside validity window' }); }
});
