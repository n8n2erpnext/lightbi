# NEXT-018 Commerce, Marketing, Admin Security and Infrastructure Audit

Status: verification / approval gate
Date: 2026-08-31
Scope: NEXT-018 commerce, Paddle/Stripe authority, mail/newsletter worker, Admin MFA/Passkey, app announcements, and read-only infrastructure posture
Supersedes: none
Superseded by: none
Primary sources: exact successor commits, authoritative test suites, read-only VPS/Docker/LXD/systemd inspection

## Purpose

This record captures the security and infrastructure review required before any NEXT-018 migration, secret provisioning, service restart, public webhook route, n8n activation, or Paddle sandbox E2E mutation.

The owner explicitly required that infrastructure-impacting changes be reported before execution. Nothing in this audit constitutes deployment approval.

## Exact source candidates

- Public Core announcement inbox: `57304194e7c21d3e036c6dcb1793914f97c74118` on `codex/next018-commerce-notify`.
- Private Control Plane: `1868e3db5039b3b08df63afe7bee9f7bd6f12125` on `codex/next018-paddle-sandbox`.
- Active Internal runtime remains NEXT-017 until an explicit deployment approval and promotion procedure.
- R1-P6 remains HOLD; no Root, issuer private key, or signer work is authorized by this track.

## Verification evidence

- Core `test:release-1.0`: PASS; 11 governed test files / 39 governed tests, production build, generation diagnostics and UAT contract all passed.
- Final CP authoritative suite after Admin MFA/Passkey and Redis marketing coordination: `157/157 PASS`.
- Focused commerce/mail/Redis adversarial pack: `20/20 PASS`.
- Focused Admin Security pack: `4/4 PASS`.
- Foundation boundary + Admin Security targeted run: `11/11 PASS`.
- `pnpm audit --prod --audit-level high`: no known vulnerabilities.
- `git diff --check`: PASS.
- Credential-prefix scan found no real credential material; one hit is an explicitly synthetic adversarial-test fixture.

## Security conclusions

### Payment and money authority

- Browser checkout chooses only an internal catalog price and optional discount code; provider price identifiers are resolved server-side.
- Signed checkout context binds provider, account, email, package, entitlement policy, catalog price, provider price, discount identity, expiry and nonce.
- Paddle fulfillment requires the exact raw-body `Paddle-Signature` and exact signed line-item price/quantity.
- Stripe fulfillment requires a server-created Checkout Session, webhook signature and paid status.
- Monetary authority remains integer minor amount plus ISO currency. Decimal/admin display conversion uses exact string/BigInt semantics, not floating-point arithmetic.
- Public campaign discounts and private email promo codes are distinct authority modes with audit/history.
- Legacy reusable-key payment fulfillment/status endpoints are absent from the NEXT-018 successor.

### Secret handling

- Commerce provider secrets: AES-256-GCM with provider-specific AAD and independent `LIGHTBI_COMMERCE_ENCRYPTION_KEY`.
- Managed SMTP password and newsletter token secret: AES-256-GCM with mail-specific AAD and independent `LIGHTBI_MAIL_ENCRYPTION_KEY`.
- Admin TOTP secret: AES-256-GCM with Admin-security-specific AAD and independent `LIGHTBI_ADMIN_SECURITY_ENCRYPTION_KEY`.
- Recovery codes are hashed with a dedicated Admin recovery pepper; plaintext recovery codes are shown only at creation/rotation.
- Admin read APIs expose only configured/decryptable flags, never stored secret plaintext.
- Break-glass bearer authority is intentionally rejected by high-value `sensitiveAdmin` mutations.

### Admin assurance

- Admin identity is separate from end-user LightBI Account identity.
- Admin password login becomes MFA-required when TOTP is enrolled.
- Admin Passkey sessions are phishing-resistant WebAuthn sessions.
- Admin sessions bind `security_version`; factor revocation invalidates older session authority.
- Payment, SMTP, catalog, discount, announcement and newsletter mutations require an enrolled strong factor plus recent strong authentication and password reauthentication.

## Worker and Redis model

PostgreSQL transactional outbox remains the durable source of truth. Redis is coordination only.

Newsletter flow is `campaign -> per-recipient delivery -> Postgres outbox -> worker -> Redis global rate slot -> SMTP`.

Marketing rate is Admin-configurable from 1 to 600 messages/minute, defaulting to 30. Rate-limit deferral moves `available_at` without consuming delivery retry attempts. If Redis marketing coordination is unavailable, marketing delivery fails closed/deferred; payment/account/entitlement and other durable commerce authority do not move into a Redis queue.

## Read-only infrastructure findings

### Confirmed protections

- Oracle Cloud ingress evidence supplied by the owner allows public TCP 80/443 and the required NetBird/VPN UDP ports; other host-bound application ports are blocked at the cloud edge.
- NEXT PostgreSQL is host-bound only at `127.0.0.1:55432`.
- NEXT Redis is host-bound only at `127.0.0.1:56379`.
- NEXT Core/Gateway/CP bind to the NetBird address `100.94.184.141` on 5272/5273/5274.
- ERPNext LXD is on `10.192.135.2`; host proxy access observed is NetBird-address scoped.
- NEXT environment files are mode `0600`, owner `ubuntu:ubuntu`.
- Internal LightBI systemd services already use `NoNewPrivileges=true` and `PrivateTmp=true`.
- n8n runs as user `node`, is not privileged, and its public hostname resolves through HTTPS reverse proxying.
- Traefik Docker socket bind is mounted read-only at the filesystem level.

### Hardening debt, not current sandbox blockers

- n8n currently runs image `docker.n8n.io/n8nio/n8n:latest`; observed runtime version is `2.20.7-exp.0`. Pinning a tested exact stable version is recommended before live commerce operation.
- Several Docker services bind `0.0.0.0` internally. Owner-provided Oracle firewall evidence prevents direct Internet reachability, so this is defense-in-depth debt rather than an Internet exposure finding.
- Traefik has access to the Docker daemon socket. A socket proxy or a reduced provider model would further reduce daemon-control blast radius.
- HTTP HEAD probes for `n8n.thaiduy.store` and `lightbi.thaiduy.digital` did not visibly include a complete hardened security-header set. This should be verified with the final GET/proxy policy before stable 1.0.
- LightBI systemd units can be hardened further with service-specific filesystem/kernel/capability restrictions after verifying runtime write/network requirements.

## Proposed mutations requiring owner approval

1. Apply PostgreSQL migrations `063_commerce_runtime_settings`, `064_commerce_catalog_discounts_announcements`, `065_marketing_newsletter_mail`, and `066_admin_security_mfa_passkeys` to the **Internal** CP database only.
2. Generate and install three independent Internal secrets: commerce encryption key, mail encryption key, and Admin security encryption key, plus an Admin recovery-code pepper. Store only in the existing mode-0600 Internal environment file.
3. Build/promote a new immutable Internal generation carrying Core `57304194...` and CP `1868e3db...`; restart only Internal units and verify manifest/diagnostics/schema/worker.
4. Enroll at least one Admin strong factor before any Commerce or Mail mutation. Prefer a Passkey plus TOTP/recovery backup.
5. Configure Paddle **sandbox** catalog/provider credentials through Admin; live environments remain blocked by NEXT-018 code.
6. Configure managed SMTP through Admin, test transport, keep marketing disabled until consent/audience review.
7. Add an HTTPS sandbox webhook route to the Internal CP without repointing Production distribution.
8. Configure Paddle sandbox notification destination and secret; then activate the existing n8n LightBI revenue workflow.
9. Run one synthetic Paddle sandbox E2E and prove account entitlement, Postgres order/outbox, n8n idempotency, ERPNext Sales Invoice + Paddle Clearing, and branded purchase email/PDF behavior.

## Expected impact and rollback

- Migrations are additive; they do not alter current Production schema. Rollback for runtime is to stop/revert the Internal successor while preserving additive tables for forensic evidence rather than destructive down-migration.
- New encryption keys affect only newly configured NEXT-018 ciphertext. If configuration fails, disable provider/mail state and return to NEXT-017; do not delete ciphertext until root cause is understood.
- Internal promotion affects only 5272/5273/5274 and the Internal worker. Production 5172/5173/5174 remains no-touch.
- Sandbox webhook routing can be removed independently. Paddle sandbox notifications can be disabled without affecting Basic/local operation.
- n8n/ERPNext remain downstream mirrors: failure or rollback must not revoke an already committed LightBI account entitlement.

## Approval state

`READY_FOR_OWNER_INFRA_APPROVAL`

No migration, runtime secret provisioning, service restart, reverse-proxy mutation, Paddle notification setup, n8n activation, or real/sandbox checkout execution was performed while producing this audit.
