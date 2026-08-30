# LightBI trust contracts v1 — Phase 2A

Status: **freeze-remediation candidate; not frozen until independent audit explicitly approves it.** This does not enable Pro, add a private signer, or change the Beta version/release.

Public source defines the only valid signed bytes: strict schema parse, semantic policy validation, canonical UTF-8 JSON, then Ed25519 verification. Private signers may later execute `parse → policy → canonicalize → sign`; they may not repair or reinterpret payloads.

## Canonical contract

Signed numeric values use the JavaScript safe-integer domain in both TypeScript and Rust. Floats and integers outside `[-9007199254740991, 9007199254740991]` fail closed. Object keys use deterministic UTF-8 byte ordering, never locale-dependent collation.

Semantic array ordering is intentionally path-scoped: only root `capabilities` and root issuer-keyset `keys` are order-insensitive. A nested property that merely happens to be named `capabilities` or `keys` is not silently reordered. Duplicate capabilities and duplicate issuer `kid` values are invalid before canonicalization.

Timestamps are RFC3339 UTC seconds exactly `YYYY-MM-DDTHH:mm:ssZ`; offsets, milliseconds and invalid calendar dates are rejected. Strict schemas reject unknown fields.

## Root and issuer trust

The offline root public key is the trust anchor. A runtime issuer keyset is trusted only after verifying its signed envelope against the configured root pin. The production root pin remains deliberately unconfigured until the offline-root ceremony; test roots are passed explicitly by tests and vectors.

Issuer purposes remain exactly `release`, `attestation`, `entitlement`, and `pro_package`. Issuer statuses remain `active`, `retiring`, `revoked`, and `expired`.

Keysets carry `keyset_version`, `issued_at`, and `expires_at`. The root pin carries a built-in minimum accepted keyset version, and callers may raise that floor. Callers must also supply the previously accepted keyset state or explicit `null` for first trust. `verifyIssuerKeysetEnvelope` returns only opaque persisted trust state, not a raw caller-trusted keyset. Verification rejects versions below the accepted floor, version rollback, same-version/different-digest equivocation, and non-monotonic `issued_at` when the version increases.

Issuer validity is checked at the payload's signing timestamp. Payload validity is checked at verification time. This lets an expired historical issuer continue to verify payloads signed while that issuer was valid, while a revoked issuer always fails.

## Purpose-specific verification

Public verification entry points are purpose-specific:

- `verifyReleaseEnvelope`;
- `verifyInstallationCertificateEnvelope`;
- `verifyEntitlementEnvelope`;
- `verifyProPackageEnvelope`.

Each path verifies root → keyset → purpose-matched issuer → payload signature, then applies its own lifecycle policy. There is no public generic `/sign` concept and no private signer implementation in Phase 2A.

Release versions and Pro compatibility bounds use the maintained npm `semver` implementation. Release artifact names are portable basenames only and reject path separators/control characters. Issuer Ed25519 public keys are canonical unpadded base64url encodings of exactly 32 bytes; signed-envelope Ed25519 signatures are canonical unpadded base64url encodings of exactly 64 bytes. Installation Certificate v1 explicitly declares `device_key_algorithm: "Ed25519"` and requires a canonical raw 32-byte Ed25519 signing public key. This device signing key is not an X25519/content-key wrapping key; future Pro-package encryption remains a separate phase.

## Entitlement semantics

Account subjects may carry only `basic` or `pro`. Organization subjects require `business`, and Business named-user limits remain exactly `5 / 10 / 20 / 25 / 30`. Membership remains mutable control-plane state and is not embedded in a signed entitlement.

Organization claim tokens remain one-time bootstrap credentials represented by a SHA-256 hash, expiry and optional consumption timestamp; their lifecycle ordering is strict.

## TEST-ONLY vectors and cross-runtime parity

The public vectors contain distinct TEST-ONLY ROOT, REL, ATT, ENT and PRO authorities. No test private seed/key is committed. Vectors cover a root-signed keyset, rollback/equivocation/revocation cases, release, installation certificate, account Pro entitlement, Business entitlement and Pro package.

Every signed v1 vector carries canonical text, canonical UTF-8 hex, SHA-256, public key and expected Ed25519 signature. An additional adversarial ordering vector freezes `A/a/-/./:/_` ordering and proves that nested arrays named `keys` or `capabilities` retain their order. TypeScript and Rust verify the same bytes/digests for all vectors and the same signatures for every signed v1 payload. The public-boundary guard rejects obvious private-key/seed files and literal private-key material in addition to private control-plane/signer implementation paths.

## Freeze gate

This remediation addresses the twelve blocker classes recorded by the independent audit: deterministic/path-scoped canonical ordering; safe-integer parity; root-signed keyset trust; keyset expiry/rollback/equivocation; signing-time versus current-time lifecycle separation; purpose-specific verification; subject/tier semantics; strict lifecycle windows; canonical Ed25519 encodings; SemVer/basename release rules; distinct full-chain TEST-ONLY authorities/vectors; and stronger private-key boundary checks.

Passing CI is necessary but **not sufficient** to declare Phase 2A frozen. The next gate is an independent re-audit of this exact commit. Private Rust signer/attestation work remains blocked until that review explicitly records `FREEZE APPROVED`.
