export const TRUST_SCHEMA_VERSION = 1 as const;
export const LIGHTBI_PRODUCT_ID = 'digital.thaiduy.lightbi' as const;
export const BUSINESS_SEAT_LIMITS = [5, 10, 20, 25, 30] as const;
export const KEY_PURPOSES = ['release', 'attestation', 'entitlement', 'pro_package'] as const;
export const KEY_STATUSES = ['active', 'retiring', 'revoked', 'expired'] as const;
export type KeyPurpose = typeof KEY_PURPOSES[number];
export type KeyStatus = typeof KEY_STATUSES[number];
export type EntitlementSubject = { type: 'account'; id: string } | { type: 'organization'; id: string };
export interface IssuerKeyRecordV1 { kid: string; purpose: KeyPurpose; algorithm: 'Ed25519'; public_key: string; status: KeyStatus; not_before: string; not_after: string }
export interface IssuerKeysetPayloadV1 { schema: 1; kid: string; keyset_version: number; issued_at: string; expires_at: string; keys: IssuerKeyRecordV1[] }
export interface ReleasePayloadV1 { schema: 1; kid: string; product_id: typeof LIGHTBI_PRODUCT_ID; release_id: string; version: string; channel: 'beta' | 'stable'; platform: 'windows' | 'linux' | 'macos'; architecture: string; artifact_name: string; artifact_sha256: string; artifact_size: number; created_at: string }
export interface InstallationCertificatePayloadV1 { schema: 1; kid: string; product_id: typeof LIGHTBI_PRODUCT_ID; installation_id: string; device_key_algorithm: 'Ed25519'; device_public_key: string; release_id: string; platform: 'windows' | 'linux' | 'macos'; architecture: string; issued_at: string; expires_at: string; certificate_id: string }
export interface EntitlementPayloadV1 { schema: 1; kid: string; entitlement_id: string; subject: EntitlementSubject; tier: 'basic' | 'pro' | 'business'; capabilities: string[]; issued_at: string; valid_until: string; entitlement_version: number; source: 'commerce' | 'complimentary' | 'beta_campaign' | 'internal'; seat_limit?: number }
export interface ProPackagePayloadV1 { schema: 1; kid: string; package_id: string; product_id: typeof LIGHTBI_PRODUCT_ID; version: string; core_min: string; core_max: string; platform: 'windows' | 'linux' | 'macos'; architecture: string; sha256: string; size: number; issued_at: string }
export interface SignedEnvelope<T> { schema: 1; kid: string; payload: T; signature: string }
export interface OrganizationClaimTokenRecordV1 { schema: 1; token_id: string; organization_id: string; entitlement_id: string; token_hash: string; issued_at: string; expires_at: string; consumed_at: string | null }
export interface RootPinV1 { schema: 1; kid: string; algorithm: 'Ed25519'; public_key: string | null; status: 'configured' | 'unconfigured'; minimum_keyset_version: number }
export interface KeysetTrustStateV1 { keysetVersion: number; payloadDigest: string; issuedAt: string }
export interface EntitlementTrustStateV1 { subject: EntitlementSubject; entitlementVersion: number; payloadDigest: string; issuedAt: string }
export interface VerifiedIssuerKeysetV1 { readonly state: KeysetTrustStateV1 }
export interface VerifiedTrustPayload<T> { payload: T; keysetState: KeysetTrustStateV1 }
export interface VerifiedEntitlementV1 extends VerifiedTrustPayload<EntitlementPayloadV1> { entitlementState: EntitlementTrustStateV1 }
