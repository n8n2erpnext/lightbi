# LightBI chassis deployment and disaster recovery

This directory is an operational contract. Product code and immutable build artifacts are the **engine**; domains, databases, Redis, secrets, payment/mail providers, storage namespaces and users are **chassis state**.

- `lightbi-next.thaiduy.digital` is the permanent pre-production chassis.
- `lightbi.thaiduy.digital` is the permanent production chassis.
- Engine artifacts may be promoted after acceptance; database rows never promote between chassis.
- R2 `drive/lightbi-next/releases/` is the private backing store for immutable NEXT release artifacts. The Control Plane mirrors it locally and exposes read-only `/internal-releases/*` through the NEXT domain.
- R2 `lightbi-dr/v1` is the encrypted restic repository for chassis backups.

## Fresh VPS recovery

1. Provision Ubuntu 24.04 with Docker, Restic, Git, Node.js 22+, curl, jq and OpenSSL.
2. Obtain the encrypted DR bootstrap from private `lightbi-control-plane` branch `ops/dr-bootstrap-v1` and decrypt it with the RSA SSH private key whose fingerprint matches `metadata.json`.
3. Clone/check out the accepted public Core repository so `scripts/ops/` is available.
4. Run `scripts/ops/lightbi-vps-restore-bootstrap.sh <unsealed-dir> next`.
5. Restore edge/NetBird separately, update DNS/origin only after health/diagnostics pass, then run the same procedure for Production when required.

The restore command is fail-closed when an existing PostgreSQL container is present unless explicit overwrite approval is supplied. Redis uses the configured fresh-start policy; durable authority is PostgreSQL, SQLite where still present, Core source-vault data, runtime manifests and exact engine bundles.

## Backup scope rule

Backups contain mutable chassis state and exact provenance only. Git worktrees, `node_modules`, Rust `target/` caches and deploy bytes that can be reproduced from pinned Git SHAs are excluded. Redis is intentionally `fresh_start`: after disaster recovery users re-authenticate instead of restoring ephemeral sessions.
