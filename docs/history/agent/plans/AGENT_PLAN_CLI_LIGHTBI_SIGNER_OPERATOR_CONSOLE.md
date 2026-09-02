# `cli-lightbi signer` Operator Console Plan

Status: owner-approved operational plan; Phase A implementation authorized
Date: 2026-09-02
Scope: host-side operator CLI/TUI for the LightBI Trust signer plane
Supersedes: none
Superseded by: none
Primary sources: [Project Book](../../../project-book/LIGHTBI_PROJECT_BOOK.md), [Control Plane Map](../../../project-book/LIGHTBI_CONTROL_PLANE_MAP.md), [Road-to-1.0 Trust contract](../../../architecture/road-to-1-0-trust-release-contract.md)

## 1. Purpose and authority

Add one predictable host-side operator entrypoint named `cli-lightbi`, initially focused on the signer/trust plane. The console is operator UX only. It is not signing authority, does not replace the hardened signer container, and does not override the canonical Trust Contracts.

The owner design intent follows the Frappe `bench` mental model: a complex system underneath, one predictable operator entrypoint, concise status, bounded commands, clear diagnostics and safe maintenance. The visual acceptance target is now explicit: the TUI must be a polished system-monitor console comparable in quality to `btop`, using Ratatui layout composition, bordered panels, semantic color, responsive terminal resizing, realtime refresh, keyboard navigation, modal overlays and a dense but readable hierarchy. A plain-text menu, debug console or CRUD-style terminal list does not satisfy Phase A.

Implementation authorization is intentionally narrower than the complete design below. **Phase A is authorized now. After the first usable read-only v0.1, implementation must stop and report before Phase B/C/D mutation or MFA work begins.**

## 2. Trust invariants that the console cannot weaken

1. Production Root private authority remains offline and owner-controlled.
2. Production Root private material must not exist in VPS runtime, Docker image, running signer, CI, public repository or `cli-lightbi`.
3. Online issuer authority remains purpose-separated: REL=`release`, ATT=`attestation`, ENT=`entitlement`, PRO=`pro_package`.
4. Signer semantics remain validate → canonicalize → sign; invalid payloads are rejected, never repaired.
5. No generic `/sign`, raw-sign, arbitrary-payload signing, signer shell or execute surface may be introduced.
6. NEXT/Internal authority remains cryptographically separate, disposable, test-only and non-promotable.
7. Engine promotion never promotes TEST trust material; Production issuer authority is freshly provisioned beneath Production Root.
8. Signer images remain secretless at build time. Runtime keys/secrets arrive only through governed mounts/storage.
9. Full signer-host compromise is a real incident. Purpose separation plus offline Root revoke/rotation authority must continue limiting blast radius.
10. The console must never display private key bytes, TOTP seeds/codes, operator credentials, signer bearer tokens or raw secret mounts.

## 3. Target topology

```text
Owner workstation
    |
    | NetBird private path + SSH key
    v
Signer host
    |
    +-- cli-lightbi             host-side operator console, no signing keys
    |
    +-- hardened signer Docker cryptographic appliance
          non-root / read-only / no Docker socket
          issuer-key mount only
          bounded UDS/control path
          no Production Root private key
```

For the current ARM NEXT rehearsal, the existing hardened signer boundary is preserved. The CLI must adapt to the signer; the signer must not be de-isolated for CLI convenience.

## 4. Entrypoints and home UX

Primary entry: `cli-lightbi` launches an interactive read-only TUI dashboard. Command mode may expose `status`, `doctor`, `signer`, `trust`, and `audit` namespaces.

The first screen must make environment identity impossible to miss without relying on color:

```text
LIGHTBI ADMIN / TRUST CONSOLE
NEXT / INTERNAL — TEST AUTHORITY — NON-PROMOTABLE

Signer        Healthy
Production Root private key  NOT PRESENT
TEST Root custody            explicit NEXT policy state
REL issuer    Active
ATT issuer    Active
ENT issuer    Active
PRO issuer    Active
Audit         Healthy
Pending ops   0

[1] Trust  [2] Issuers  [3] Releases  [4] Attestation
[5] Entitlements  [6] Pro packages  [7] Audit  [8] Diagnostics
[q] Quit
```

Production mode, once separately authorized and provisioned, must say `PRODUCTION AUTHORITY` in text and use stronger confirmation language for every mutation.

Keyboard model: arrows navigate, `Enter` opens, `Esc` backs out, `/` searches, `r` refreshes, `d` opens doctor, `a` opens audit, `?` opens help, `q` quits. Destructive mutation can never be a single-key action.

## 5. Phase A — authorized read-only v0.1

Implement only:

- stable `cli-lightbi` Ratatui TUI home screen with bordered dashboard composition, semantic color and responsive resizing;
- explicit environment/authority identity;
- signer process/socket/health status;
- issuer metadata for REL/ATT/ENT/PRO;
- Root→issuer public-chain verification through existing canonical Trust Contracts;
- public-key fingerprint display only, never key bodies;
- recent bounded signer audit viewer;
- `cli-lightbi doctor` aggregate diagnostics;
- read-only command-mode equivalents such as `trust status`, `signer status`, `signer issuers`, `audit recent`;
- terminal-safe rendering that strips/escapes control sequences from audit/untrusted metadata;
- realtime refresh with visible last-refresh/clock state and non-blocking failure presentation;
- keyboard-driven panel navigation plus modal overlays for help/detail/doctor/audit views.

Phase A must introduce **no mutation path**. It must not modify signer keys/config, generate authority, change lifecycle state, or add a web listener.

### Phase A acceptance

- works against the current NEXT rehearsal signer;
- environment reads `NEXT / INTERNAL — TEST AUTHORITY — NON-PROMOTABLE`;
- signer and four issuer states are accurate;
- Production Root private presence check is explicit and fail-closed;
- TEST Root custody is reported truthfully according to the approved NEXT policy, without revealing a secret path;
- public Root/keyset verification succeeds;
- audit view works and is terminal-safe;
- `doctor` verifies expected container hardening and private control path;
- no signer mutation is possible from v0.1;
- no new TCP/web listener exists;
- no embedded secret/private authority exists;
- current signer/Trust regression suites remain green;
- Production remains untouched.

## 6. Read-only command contract

Initial commands may include:

```text
cli-lightbi
cli-lightbi status
cli-lightbi doctor
cli-lightbi trust status
cli-lightbi trust info
cli-lightbi signer status
cli-lightbi signer health
cli-lightbi signer issuers
cli-lightbi signer issuer inspect <kid>
cli-lightbi audit recent
cli-lightbi audit show <request-id>
```

Issuer inspection is metadata-only: purpose, KID, lifecycle state, validity interval, replacement relation when present, Root-chain verification, public-key fingerprint, bounded last-use/sign-count metadata when available, and revoked state. Never display private material or full public-key bodies by default.

## 7. `doctor` contract

`cli-lightbi doctor` aggregates bounded diagnostics rather than dumping raw JSON. At minimum check:

```text
Environment / authority namespace
Signer process and container health
Signer UDS/control path
Container rootfs read-only
Docker socket absent from signer
Expected network mode / no public signer listener
Production Root private material NOT PRESENT
NEXT TEST Root custody consistent with NEXT-only policy
REL/ATT/ENT/PRO issuer metadata and validity
Root→issuer public chain verified
Public trust material valid
Audit source readable/healthy
Secret-leak indicators clean
Clock within configured policy
Authority namespace next_internal_test_only
Promotable false
```

In a future Production deployment, detecting Production Root private material on the online signer host is **CRITICAL**. Doctor reports and fails closed; it never auto-deletes anything.

## 8. Audit model

Phase A reads bounded signer audit metadata only. Mutating audit requirements below become mandatory if later phases are explicitly authorized.

Every future mutation must record timestamp, operation/request ID, environment, operator reference, operation, purpose, affected KID, previous/resulting state, success/failure, bounded failure reason, signer response metadata and trust-verification result.

Never log private keys, TOTP seed/code, operator credential, bearer token, raw secret mounts, or sensitive payload bodies unless an existing canonical audit contract explicitly permits the field.

Audit text rendered in the TUI must be terminal-safe: untrusted ANSI/control sequences are stripped or escaped before display.

## 9. Operator authentication design — Phase B, not yet authorized

Future mutation authority separates operator credential, TOTP enrollment secret, recovery credentials, Root authority, issuer keys and device keys. TOTP is operator MFA only; it never derives or signs cryptographic authority.

READ operations may rely on the admitted SSH/operator environment. MUTATE operations require step-up. High-impact/catastrophic operations require operator credential + TOTP + typed confirmation + durable audit.

A short privileged local operator session of roughly 5–10 minutes is preferred if it can be implemented safely; otherwise per-command TOTP is acceptable. It must expire automatically, not contain signing material and not become a remote reusable bearer secret.

Suggested future enrollment flow: `cli-lightbi admin mfa enroll` → random seed → QR shown once → authenticator confirmation → protected persistence → secret never redisplayed. Signer-operator MFA remains distinct from Account/Admin web MFA unless a later ADR explicitly merges authorities.

## 10. Controlled issuer lifecycle — Phase C, not yet authorized

Only lifecycle states already present in canonical Trust Contracts may be used: `active`, `retiring`, `revoked`, `expired`. No new state is invented for UI convenience.

Potential future bounded commands are purpose-specific rotate/revoke/activate/retire operations. They require step-up MFA, preflight validation, post-change Root-chain verification and audit. Wrong-purpose operations and invalid lifecycle transitions must fail closed.

No generic signing command is ever allowed. If future operator issuance helpers are authorized, they map exactly to governed release/attestation/entitlement/pro-package schemas and existing validators.

## 11. Verification/operational helpers — Phase D, not yet authorized

Prefer verification and inspection over issuance: verify REL, ATT, ENT, PRO, inspect signed releases and public-trust publication health. Do not add operations merely because there is room in the TUI.

## 12. Explicitly forbidden surfaces

The project must not ship equivalents of:

```text
cli-lightbi signer sign file.json
cli-lightbi signer sign --payload ...
cli-lightbi signer raw-sign ...
cli-lightbi signer execute ...
cli-lightbi signer shell ...
--force-no-auth
--skip-mfa
DEBUG_ALLOW_SIGN
```

No hidden dev/test admin command may ship in a Production build. Local shell environment variables must not provide an undocumented authentication bypass.

## 13. Signer interaction and Docker boundary

Normal CLI management must never use `docker exec signer bash` or require a signer-container shell. Use the existing bounded local UDS/control path or a separately reviewed private host-side control interface only when necessary.

The CLI may consume a protected existing local control credential as runtime secret material when required by the bounded signer API, but it must never display/log/embed that credential. The signer continues to own its cryptographic boundary: non-root UID/GID, read-only rootfs, `cap-drop=ALL`, `no-new-privileges`, resource limits, no Docker socket, no host-filesystem authority, read-only issuer/config mount, no public TCP exposure, private UDS, minimal/no egress and secret-redacted logs.

## 14. Secret-leak acceptance assumption

Security must survive publication of `cli-lightbi` source/binary, signer source/image, public Trust Contracts, public Root, public issuer keysets and public REL metadata. Security relies on protected private authority, not obscurity.

Tests must enforce no embedded secrets, no environment-specific private material in images, no generated key files in source trees, no TOTP seed in CLI, no operator credential in config templates and no issuer private keys in image layers.

## 15. NEXT → Production migration model

NEXT test keys never migrate into Production. After rehearsal acceptance: archive only non-secret evidence; destroy disposable TEST private authority through an approved cleanup; verify absence from old locations; build a clean dedicated signer host; perform the separate authorized Production Root ceremony offline; provision fresh Production issuers; verify Root→issuer chain; prove TEST authority rejection; run negative tests; prove Production Root private absence from signer host; run `cli-lightbi doctor`; then perform Production acceptance.

Copying TEST signer volumes and renaming them Production is forbidden.

## 16. Technology decision for v0.1

The Phase A presentation layer is now fixed to **Rust + Ratatui + Crossterm** after owner visual acceptance guidance. Ratatui owns terminal layout/rendering only; it must not reimplement Trust cryptography. The existing TypeScript/Node read-only collector remains the canonical bridge to the current UDS signer and exact audited Trust Contracts module, and the Rust frontend consumes only bounded structured snapshot data from that local collector. This preserves one cryptographic semantics implementation while allowing btop-quality terminal composition.

Dependency review is mandatory before adding Rust crates. The Ratatui frontend may depend only on the minimum terminal/render/serialization/time crates required for Phase A. It must not introduce HTTP servers, signing libraries, shell interpolation, secret storage or mutation authority.

## 17. Minimum security tests

The implementation must cover, as applicable to its current phase: no known secret material in CLI/image, no private-key output, no public signer control path, NEXT cannot be labeled/promoted as Production, no arbitrary signing surface, terminal-safe audit rendering, no undocumented auth bypass flags, Root-private detection behavior, and absence of hidden mutation commands in the Phase A build.

Later Phase B/C tests must additionally prove invalid TOTP blocks mutation, expired privileged session blocks mutation, wrong-purpose/lifecycle changes fail, failed mutation attempts are audited and no TOTP material leaks.

## 18. Operational tests against current NEXT signer

Phase A live acceptance should launch the TUI on the authorized host, prove NEXT/Internal identity, four issuer purposes, Root-chain verification, audit and doctor; stop signer and observe visible failure; restore it; controlled-test socket permission failure and fail-closed recovery; prove no mutation exists; prove no web port/listener was introduced. Production is outside this test scope.

## 19. Definition of done — first usable release

`cli-lightbi` v0.1 is complete only when the Ratatui dashboard meets the polished system-monitor target (responsive bordered composition, semantic status color, realtime refresh, keyboard navigation and modal overlays) and is stable; environment identity is unmistakable; signer health and REL/ATT/ENT/PRO metadata are correct; Root private presence/absence policy is checked; trust chain verifies; audit is usable and safe; doctor provides bounded diagnostics; no web listener/private authority/generic signing capability exists; signer hardening is unchanged; current NEXT tests remain green; Production remains untouched; and canonical/operational docs describe the console as operator UX rather than signing authority.

**Stop and report at this boundary. Phase B MFA and Phase C/D mutations are not implicitly authorized by completion of Phase A.**

## 20. Current implementation starting point

At plan approval, the active application chassis is NEXT-029 while the NEXT signer remains the isolated `next_internal_test_only` rehearsal authority. R1-P7 through R1-P10 NEXT rehearsals are machine-verified; Production Phase 2A remains unfrozen and Production Root ceremony remains owner-gated.

R1-P11 implementation had begun but is deliberately paused before commit so this operator-console plan can be recorded and Phase A can be implemented on a separate clean worktree. The paused private worktree is based on P10 head `31fa5428896f6e9cb7877d353e2485b43d7a1671` and currently has WIP only under `apps/trust-attestation/src/{server.ts,verifier.ts,verifier.test.ts}` and `apps/trust-pro-delivery/`. This plan does not supersede R1-P11; it temporarily preempts it to avoid architecture/documentation backtracking.

## 21. Conflict rule

If implementation discovers a conflict with frozen Trust Contracts, stop. Record the exact affected contract, why the plan cannot proceed safely, and the smallest required decision. Do not silently weaken Trust Contracts, signer isolation, purpose separation or Production freeze gates.

## 22. Phase A implementation result — v0.1 machine-verified

Phase A is implemented and installed on the current NEXT signer host at exact private source `a4d8ae69d28eec9cc24a6ac9edac582ef6ab4a9f`, pinned to audited public Trust Contracts `10de4da8e551a46f93f7b62985a0a6e611581b8e`. The operator entrypoint resolves to an immutable Rust binary release whose SHA-256 is `02619735a1965ba19c2deb95d683430749d92c6178dca6af52c2e6fcdaed40b1`. The user-facing TUI uses Rust/Ratatui/Crossterm; a bounded sibling TypeScript/Node collector remains the sole bridge to the existing UDS `/health` and authenticated `/v1/keyset` reads plus the exact public Trust verifier. The Rust layer does not implement Trust cryptography or signer control semantics.

The v0.1 dashboard satisfies the owner visual target with rounded bordered composition, explicit `NEXT / INTERNAL — TEST AUTHORITY — NON-PROMOTABLE` identity, semantic status color, REL/ATT/ENT/PRO issuer panel, health panel, selectable audit table, live clock/keyset state, two-second refresh, wide/narrow responsive layouts, panel navigation and modal overlays for issuer detail, doctor, audit detail and help. Real PTY acceptance exercised keyboard navigation, modal open/close, resize from 120x38 to 76x24 and back, and clean quit.

Security and regression evidence is green at the exact source head: Node collector/command tests **15/15**, Rust TUI tests **3/3** with Clippy `-D warnings`, signer **6/6**, attestation/Pro **12/12**, and private Distribution authoritative suite **193/193**. The dependency set is pinned to Ratatui 0.29.0, Crossterm 0.28.1, Serde 1.0.228, serde_json 1.0.145 and Chrono 0.4.41; normal dependency-tree review found no web/HTTP/async/cryptographic authority stack. Scanning the actual TEST bearer token and actual TEST Root PEM bytes against source/build/binary artifacts found neither embedded.

Operational fail-closed acceptance also passes. Stopping only the NEXT signer while the TUI was active produced visible `DATA STALE`; command mode failed with exit 2 while the socket was absent, then recovered after the signer returned. Changing the signer socket from 0600 to 0644 caused `cli_signer_socket_permissions_too_open` and exit 2; restoring 0600 returned `doctor` to green. Proposed rotate, revoke, sign, raw-sign and `--skip-mfa` commands all fail before signer mutation; the Root-signed keyset SHA remained `931468554b61c203b52637364c5a54f2863756362746e3d35f1c29799a8c5016` and the signer container identity did not change across those probes.

Final `doctor` reports signer active, UDS 0600, rootfs read-only, `network=none`, no published ports, Docker socket absent, `cap-drop=ALL`, `no-new-privileges`, signer key/config mount read-only, Production Root private material absent from the signer boundary, Root→issuer verification PASS, all four issuers active/valid, structured audit healthy, leakage scan clean and clock synchronized. Installing `cli-lightbi` did not rebuild/reconfigure the signer; live signer image remains `sha256:8dcb8e96feda93bb54c747ced89da02176dc6ad64b425730dab7930561bac0e2` and no CLI web/TCP listener was introduced. Production was not mutated.

**Phase A stops here.** This is machine-verified implementation evidence, not authorization for Phase B/C/D. Operator credential/TOTP enrollment, privileged sessions and all issuer lifecycle mutations remain unimplemented and unauthorized until the owner explicitly opens the next phase. R1-P11 WIP remains paused in its separate private worktree and was not absorbed into this console change.
