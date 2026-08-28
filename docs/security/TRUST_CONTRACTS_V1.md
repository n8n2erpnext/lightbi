# LightBI trust contracts v1 — Phase 2A

Status: implementation candidate; not frozen until audit passes. This does not enable Pro or change the Beta version/release.

Public source defines the only valid signed bytes: strict Zod schema parse, semantic policy validation, canonical UTF-8 JSON, then Ed25519 verification. Private signers may later execute `parse → policy → canonicalize → sign`; they may not repair or reinterpret payloads.

The generic envelope contains `schema`, `kid`, validated `payload`, and a base64url signature. `kid` is also inside the signed payload and must match. Unknown fields, floats, non-UTC timestamps, duplicate capabilities and unsupported schema/purpose/status values fail closed.

Issuer purposes are `release`, `attestation`, `entitlement`, and `pro_package`; statuses are `active`, `retiring`, `revoked`, and `expired`. The offline root signs issuer keysets. Runtime issuer signers never require the root private key. The root public pin remains deliberately unconfigured until the offline-root ceremony; there is no fallback/test root in production.

Entitlements share one envelope. `subject.type` is `account` or `organization`. Only organization Business entitlements accept named-user limits 5/10/20/25/30. Membership is mutable control-plane state and is not embedded in the entitlement. Organization claim tokens are one-time bootstrap credentials represented only by a SHA-256 hash, expiry and consumption time.

The canonical vector under `packages/trust-contracts/vectors` uses a public RFC 8032 test key and is never a production authority. TypeScript and Rust must verify identical canonical bytes, digest and signature.
