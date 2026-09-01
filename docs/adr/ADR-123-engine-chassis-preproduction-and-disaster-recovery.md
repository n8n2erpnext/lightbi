# ADR-123: Engine/Chassis Promotion, Permanent Pre-Production, and Disaster Recovery

Status: decision
Date: 2026-09-01
Scope: NEXT/Production environment identity, promotion semantics, data isolation, 1.0 database cutover, backup and VPS recovery
Supersedes: none
Superseded by: none
Primary sources: ../architecture/road-to-1-0-trust-release-contract.md, ../project-book/LIGHTBI_PROJECT_BOOK.md

## Decision

LightBI separates the **engine** from the **chassis**.

The engine is immutable product/release material: Core and Control Plane code, compiled artifacts, schema/migration definitions, frontend bundle, workers, API contracts, release/update logic, and exact Git/artifact identities.

The chassis is environment state: domain/origin, PostgreSQL, Redis, SQLite where still present, secrets, OAuth/WebAuthn wiring, payment/mail providers, R2 namespaces, analytics, users, licenses/devices, source-vault data, and operational configuration.

`lightbi-next.thaiduy.digital` is the permanent pre-production chassis. `lightbi.thaiduy.digital` is the permanent production chassis. Hostnames do not swap roles; accepted engine generations are promoted between chassis.
## Promotion and data rules

Promotion transfers an exact accepted engine identity, never database rows. NEXT databases, Redis state, test users, Paddle sandbox transactions, mail tests, announcements and telemetry are proving-ground data and must not be copied into Production.

Before stable 1.0, the current Beta Production database is snapshotted and archived, then a fresh Production database is created and migrated from zero to the accepted schema. This establishes a clean Day-0 measurement baseline. After 1.0, Production data is durable and is never reset as part of normal promotion.

Schema changes are proven on NEXT first. Production receives the same migration only after acceptance; migrations should remain forward-compatible where practical so engine rollout and backfill can be staged safely.

## Release and R2 lanes

NEXT owns an isolated internal release namespace backed by R2 `lightbi-next/releases/`. Production release namespaces remain separate. The NEXT app may exercise real manifest lookup, download, checksum verification and installer staging without publishing or mutating Production.

Encrypted disaster-recovery backups use a separate R2 restic repository under `lightbi-dr/`. An encrypted bootstrap package stores the wiring needed to reconnect a fresh VPS; its content is encrypted to an operator-controlled recovery SSH key and is not public authority.

## Backup boundary

Back up mutable chassis state and provenance only. Rebuild Git worktrees, `node_modules`, Rust `target/` caches and reproducible deploy bytes from pinned source/artifact identities instead of copying large build caches.
Redis uses a fresh-start recovery policy unless a later decision promotes specific Redis state to durable authority. Recovery therefore favors forced re-authentication over restoring stale sessions.

## Disaster-recovery contract

A fresh VPS recovery must be able to reconstruct the accepted engine from Git/artifact identity, restore PostgreSQL and SQLite/Core source-vault state from encrypted off-host backup, restore environment/service wiring from the encrypted bootstrap, then prove diagnostics before DNS/origin cutover.

Recovery scripts must fail closed on destructive overwrite unless the operator explicitly confirms the target chassis. Restore drills use ephemeral PostgreSQL and integrity checks so backup validity is tested without mutating the running chassis.

## Verified baseline on 2026-09-01

The activated R2/restic lane contained eight off-host snapshots across NEXT, Production-Beta and edge state. A NEXT restore drill passed SQLite and Core metadata integrity, restored 48 PostgreSQL public tables and observed all 19 schema migrations. A Production-Beta drill passed SQLite integrity and restored 11 public tables. The encrypted DR bootstrap and wrapped recovery key were present in R2.

The NEXT internal release namespace was initialized separately in R2. Its sync timer polls every two minutes; absence of `latest.json` before the first internal build is a healthy no-release-yet state, while malformed or hash-mismatched published releases remain fail-closed.

## Non-goals

This ADR does not authorize Phase 2A freeze, Root/signer work, Production promotion, Production database reset today, or copying NEXT data into Production.
