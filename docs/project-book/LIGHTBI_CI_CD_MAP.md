# LightBI CI/CD Map

**Edition:** 0.5 CI/CD Baseline
**Audit date:** 2026-08-30
**Public repository:** `n8n2erpnext/lightbi`
**Public main at audit:** `466898372fcf3869ae10140cafce83bf57c5d392`
**Release currently advertised:** `0.9.2-beta.7`
**Status:** repository workflow configuration, recent GitHub Actions runs, GitHub Release assets, R2 catalog, and distribution release-discovery endpoint reconciled.

---

## 1. Scope and evidence classes

This map separates four kinds of CI/CD truth:

1. workflow source committed on current public `main`;
2. workflow source that actually ran at a historical release tag;
3. GitHub Actions run/job/step conclusions;
4. live publication state observed from GitHub Release, R2 catalogs, and the distribution release API.

A workflow file alone does not prove that publication succeeded. A release asset alone does not prove that current workflow source produced it.
## 2. Current workflow inventory

Current public `main` contains four workflows:

| Workflow | Trigger | Primary purpose |
|---|---|---|
| `.github/workflows/ci.yml` | push/PR to `main` | public Basic build + selected governed regression gates |
| `.github/workflows/release.yml` | Beta tag push + manual dispatch | Windows/Linux native build; tag publication to GitHub Release and R2 |
| `.github/workflows/r2-validate.yml` | manual dispatch | read-only validation of configured R2 release namespace |
| `.github/workflows/macos-unsigned.yml` | manual dispatch + relevant PR changes | universal ad-hoc-signed macOS DMG validation; optional additive publication |

Workflow history is concentrated in the public lineage. The public root `b10f8d0` introduced CI/release files; later commits added Beta 7 distribution gates, R2 publication, Debian packaging, updater integrity checks, control-plane boundary checks, and finally the macOS path.

Current workflows use Node 22 and pnpm 11.4.0. Native release jobs use stable Rust and platform-specific Tauri builds.

## 3. Current CI gate

`ci.yml` has one Ubuntu job named `desktop`, timeout 30 minutes.
Its blocking sequence is:

```text
checkout
→ install dependencies
→ test:release-contract
→ test:public-boundary
→ desktop production build
→ selected public governed Vitest regression set
```

The selected governed set currently covers canonical multi-source, perspective collection, repository corpus, runtime-source continuity, distribution pairing, semantic capability matrix, and the XomData SQL semantic corpus.

Current CI is intentionally narrower than the full historical archive test universe. It does **not** run the complete TypeScript test corpus, all Rust workspace tests, every E2E test, or native packaging on ordinary push/PR.

At public main `4668983`, GitHub run `33247397734` completed successfully; every current CI step passed.

## 4. Phase 2A PR adds gates that are not yet on main

Open draft PR #4, head `d17abe0`, adds Rust setup plus a trust-contract gate to CI:

```text
pnpm --filter @lightbi/trust-contracts lint
pnpm --filter @lightbi/trust-contracts test
cargo test -p lightbi-trust-contracts
```
GitHub run `33233956306` on PR #4 head `d17abe0` passed all of those trust-contract steps plus the normal desktop/governed gates.

Therefore the correct statement is:

- Phase 2A CI proof exists on the PR branch;
- those trust-contract gates are not current `main` policy until PR #4 is reconciled and merged;
- private signer/attestation implementation is still not authorized by this CI result alone.

### 4.1 Phase 2A remediation head update

After the independent audit of `d17abe0`, remediation was pushed to the same Draft PR #4 branch as `fb8225c951fc27692e6b0e7554c3112ada08e49f`. GitHub CI run `33290983683` completed successfully at that exact head. The job passed the public Basic release contract, public/private boundary guard, TypeScript + Rust trust-contract/vector gate, desktop production build, and governed regression gate.

This CI success does **not** freeze Trust Contracts v1. Independent re-audit of `fb8225c` is still required before PR #4 may merge or private signer/attestation work may begin.

The concurrent macOS unsigned validation workflow is explicitly treated as a separate test branch/workflow and is **not part of the Phase 2A freeze gate**.

## 5. Current Windows release build

`release.yml` builds Windows on `windows-latest` with target `x86_64-pc-windows-msvc`.

Blocking gates include:

- public Basic release contract;
- public/private source boundary;
- desktop updater state-machine tests;
- generated branded icon validation;
- native updater Rust integrity tests;
- Tauri NSIS build;
- extracted installer icon inspection;
- SHA-256 sidecar generation;
- required Actions artifact upload.

The release environment binds the desktop distribution URL and version at build time; version is derived from the tag for tagged runs.
## 6. Current Linux release build

Linux runs on `ubuntu-24.04` and installs WebKit/AppIndicator/RSVG/patchelf build dependencies before the native build.

It repeats the public release/boundary gates and updater tests, then:

```text
Tauri Linux build
→ Debian package
→ SHA-256 sidecar
→ LightBI-Linux-Debian-Beta Actions artifact
```

The current tagged publish job depends on **both** Windows and Linux jobs. A failed native platform job therefore blocks the tagged publication job.

## 7. Tagged publication topology

For an actual tag ref, `publish-release` downloads both platform artifacts and then performs two publication actions:

```text
Windows + Linux build artifacts
        ↓
GitHub prerelease assets
        ↓
immutable R2 version objects
        ↓
version manifest
        ↓
release index
        ↓
channel latest + global latest
```
R2 version keys use `release/lightbi/<version>/<artifact>`. Before upload, the workflow rejects an already-existing Windows or Linux immutable object.

The generated manifest contract is `lightbi.release.v1`; the index is `lightbi.release-index.v1`. Mutable catalog objects use short revalidation caching while immutable artifacts use one-year immutable caching.

The workflow publishes:

```text
release/lightbi/<version>/manifest.json
release/lightbi/index.json
release/lightbi/<channel>/latest.json
release/lightbi/latest.json
```

This makes the manifest/catalog path the release-discovery authority rather than the distribution website HTML.

## 8. What actually produced v0.9.2-beta.7

The latest advertised Beta tag `v0.9.2-beta.7` peels to `28e2aae`.

GitHub Actions run `33028417121` completed successfully with three successful jobs:

- `build-windows`;
- `build-linux`;
- `publish-release`.

Every recorded step in all three jobs succeeded, including GitHub Release publication and the immutable R2/catalog publication step.
That release ran the **pre-control-plane-split** release workflow. Its Windows/Linux release gate still executed `apps/distribution` test/build directly.

After Phase 0–1, current `main` replaced those portal gates with:

```text
pnpm test:release-contract
pnpm test:public-boundary
```

No newer Beta tag has exercised the post-split tagged release workflow yet. Therefore current release workflow correctness has CI/build evidence in pieces, but not a newer end-to-end tag publication after the split.

## 9. Live v0.9.2-beta.7 publication state

Live R2 was checked during this audit.

`release/lightbi/beta/latest.json` responds HTTP 200 and currently declares:

- product `digital.thaiduy.lightbi`;
- version `0.9.2-beta.7`;
- channel `beta`;
- minimum updater version `0.9.1-beta.7`;
- Windows x86_64 EXE;
- Linux x86_64 DEB;
- SHA-256 for each artifact.
`release/lightbi/index.json` also responds HTTP 200 and contains the same Beta release with two platform artifacts.

The running distribution API `/distribution/api/releases/latest` responds HTTP 200, reports `source: r2`, and exposes that same two-artifact manifest with GitHub Releases as fallback.

GitHub Release `v0.9.2-beta.7` contains the matching Windows/Linux binaries and checksum files. Observed GitHub asset digests match the hashes advertised by R2 for both binaries.

This cross-check closes the Windows/Linux chain:

```text
tag → Actions → binaries → checksums → GitHub Release
    → R2 immutable objects → manifest/index → distribution discovery
```

## 10. R2 validation workflow

`r2-validate.yml` is manual and intentionally does not write objects. It validates that the configured release-storage identity can list the expected release namespace and that the bucket/public URL configuration is structurally valid.

Run `33166603887` on public commit `653122e` completed successfully.

This is a configuration/permission probe, not a substitute for a tagged publication run.
## 11. macOS is an additive Beta path, not part of tagged release build

Current macOS workflow uses `macos-14` and produces one `universal-apple-darwin` DMG with deployment floor macOS 11.0.

Its validation proves:

- desktop release/updater contracts;
- branded `.icns` generation;
- x86_64 + arm64 slices;
- DMG integrity;
- `LSMinimumSystemVersion=11.0`;
- deep ad-hoc code-signature validity;
- SHA-256 sidecar.

It is **ad-hoc signed**, not Apple Developer ID signed and not notarized. This is a Beta owner-test path, not production macOS trust/signing completion.

PR #5 validation runs succeeded, including run `33247082875` at branch head `42b09e3`. The PR was merged and current main contains the workflow/config.

## 12. Current macOS publication is not complete

After merge, manual run `33247413779` on main `4668983` produced a valid universal DMG: job `build-macos-universal` passed every step and uploaded an Actions artifact.
The dependent `publish-macos` job failed at its combined publication step. Public Actions metadata does not expose the failing command text without authenticated logs, so the exact subcommand is not proven here.

Publication state after that failed job is unambiguous:

- GitHub Release `v0.9.2-beta.7` has no macOS asset;
- R2 Beta latest still lists only Windows and Linux;
- R2 release index still lists two artifacts for `0.9.2-beta.7`;
- distribution release discovery also lists only Windows and Linux.

Therefore macOS **build validation is green, publication is red/incomplete**. Do not advertise the DMG as a current official release artifact yet.

## 13. Release authority and fallback behavior

The current authority chain is:

```text
R2 latest/index available
→ distribution API returns R2 catalog

R2 catalog unavailable
→ control plane returns release-unavailable/fallback state
→ GitHub Releases remains archive/fallback destination
```

The distribution portal is a consumer/presenter of release truth; it does not author the immutable release identity.
## 14. CI coverage limits that must not be mistaken for proof

Current green CI does not establish all of the following:

- complete Rust workspace correctness;
- full desktop unit/corpus/E2E suite;
- Windows/Linux native packaging on every PR;
- macOS notarization or Developer ID signing;
- a post-Phase-0–1 tagged release publication;
- Phase 2A trust contracts on `main`;
- private control-plane CI status;
- future Pro delivery/signing/attestation behavior.

These are coverage boundaries, not claims that those areas are broken.

## 15. Blocking versus optional paths

| Path | Blocking condition |
|---|---|
| main push/PR | any current `ci.yml` step fails |
| tagged Windows/Linux release | either native build fails, or publish job fails |
| R2 publication | immutable collision, malformed manifest/index, missing storage configuration, or upload failure blocks publication |
| R2 validation | manual only; failure does not itself alter published objects |
| macOS PR | relevant macOS build/validation workflow runs and can block PR expectations |
| macOS publication | manual opt-in; failure leaves the official release without macOS until repaired |
## 16. Workflow evolution anchors

Key public commits changing CI/release behavior:

| Commit | Change |
|---|---|
| `b10f8d0` | public CI/release baseline |
| `c92dca6` | Beta 7 semantic/distribution release stack |
| `872194d` | manifest-driven R2 releases |
| `bc7d46c` | Debian release path |
| `917a926` / `e0cf5fb` | R2 validation/config normalization |
| `a9d97cd` / `5884595` | staged updater gates and 0.9.2 preparation |
| `66d84ee` | standalone public Basic release contract |
| `99e42bd` | remove private control-plane implementation from public CI/release |
| `4668983` | universal unsigned macOS validation/publication workflow |

This history explains why the successful `0.9.2-beta.7` run names a portal gate that current `main` no longer owns.

## 17. Safe release-reading rule

When investigating a release, always read the workflow at the **tag commit**, not merely current `main`.

When deciding what the next release would do, read current `main` and separately check whether that workflow has ever completed the same trigger path.
## 18. CI/CD conclusion

The Windows/Linux Beta release chain is real and was proven end-to-end for `v0.9.2-beta.7`. R2 is the live release-discovery source and GitHub Releases is the public mirror/archive.

Current public `main` has since strengthened the source-boundary separation and retained release/updater gates, but no newer tag has exercised the post-split tagged workflow.

The macOS universal Beta build is technically validated but is not successfully attached to the official release/catalog yet.

Phase 2A trust-contract CI is green on its draft PR branch but remains outside current main.

The most accurate current state is therefore:

```text
Windows Beta build/publish     VERIFIED
Linux Debian build/publish     VERIFIED
R2 manifest/index discovery    VERIFIED
GitHub Release mirror          VERIFIED
post-split tagged publication  NOT YET EXERCISED
macOS universal build          VERIFIED
macOS official publication     INCOMPLETE
Apple notarization/signing     NOT IMPLEMENTED
Phase 2A trust gates on main   NOT MERGED
```
