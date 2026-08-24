# LightBI V1 release operations

This runbook describes the Beta release path without containing credentials.

## Release contract

One `lightbi.release.v1` manifest is authoritative for the public download portal and native updater. It contains a version/channel, publication time, release notes, minimum updater version, and an array of platform artifacts with filename, URL, architecture, size, kind, and SHA-256.

The Beta manifest must contain at least:

- Windows x86_64 NSIS `.exe` and `.sha256`.
- Linux x86_64 Debian/Ubuntu `.deb` and `.sha256`.

Future macOS artifacts can be added to the same array without changing the contract.

## R2 layout

The configured bucket name contains no slash. LightBI owns only this prefix:

```text
release/lightbi/<version>/<artifact>
release/lightbi/<version>/<artifact>.sha256
release/lightbi/<version>/manifest.json
release/lightbi/index.json
release/lightbi/beta/latest.json
release/lightbi/stable/latest.json
release/lightbi/latest.json
```

Versioned objects are immutable. `index.json` and latest manifests use short revalidation caching. The global/channel latest manifests are uploaded only after both platform artifacts, checksums, immutable manifest, and index succeed.

## Required GitHub Actions secrets

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_PUBLIC_URL`

Use **Validate R2 Release Storage** before the first publication or after credential rotation. It performs a read/list check only and rejects bucket values containing `/`.

## Pre-release validation

1. Keep the application version unchanged while feature/security tests are still failing.
2. Push the checkpoint to `main` and confirm the normal CI workflow succeeds.
3. Manually run **Cross-platform Beta Release** on `main`. This builds Windows and Linux artifacts but does not publish because there is no tag.
4. Download the workflow artifacts internally:
   - inspect the Windows icon/metadata and install/update behavior;
   - install the `.deb` on a clean supported Ubuntu/Debian VM;
   - verify app start, local import, Easy/Advanced, account login, updater check, and uninstall.
5. Run the explicit account, entitlement, devices, legacy-key, updater, privacy, and regression matrices.
6. Only then update all version declarations consistently, commit, and create the approved `v<version>-beta.<n>` tag.

## Publication

The tag launches both native jobs. The publication job waits for both, creates one GitHub prerelease containing the `.exe`, `.deb`, and checksums, uploads the identical immutable objects to R2, builds the cross-platform manifest/index, and updates latest manifests last.

The portal uses browser OS detection only as a recommendation. Windows resolves the `.exe`, Linux resolves the `.deb`, and Other Downloads always exposes every manifest artifact plus recent releases.

## Failure recovery

- Build/test failure: no GitHub release or R2 latest manifest is changed.
- One platform fails: publication is blocked for both platforms.
- R2 upload fails before latest publication: GitHub remains the fallback; the updater continues using the previous latest manifest.
- Checksum/verification failure: native updater discards the partial artifact and leaves the current installation running.
- Existing immutable version object: do not overwrite it. Diagnose the failed release and issue a new version.

## Rollback

1. Do not delete or overwrite the faulty immutable release.
2. Restore the previous known-good channel/global latest manifest and index entry from release history.
3. Keep the GitHub prerelease available or mark it clearly as withdrawn for auditability.
4. Revoke affected entitlements/keys only if the issue is authorization-related; do not revoke merely for an application bug.
5. Fix forward under a new version, rerun the complete matrix, and publish normally.

## Privacy boundary

Release/update requests may include only application version, platform, architecture, channel, random installation/device identity, entitlement tier, and approved update events. They must never include file names/content, source URLs, database credentials/URLs, SQL, schemas, tables, columns, query results, charts, BA findings, or business metrics.
