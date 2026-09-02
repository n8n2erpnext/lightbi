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

## 19. Public selected-CI versus historical full-suite taxonomy debt

Current public CI remains the bounded gate described in section 3; it is not the full historical Vitest universe. During the `AnalysisSessionIdentityV1` durability checkpoint at `326d991`, the selected feature gates passed (release contract 3/3, public boundary, desktop build, targeted durability 4 files / 27 tests), while an explicit full-desktop Vitest run reported 198 passed / 27 failed files and 1374 passed / 51 failed / 9 skipped tests.

Failure inspection showed that many historical governance/corpus tests require `docs/architecture/*.json` evidence that the sanitized public lineage intentionally does not carry, while other textual/frozen assertions had already drifted before the durability commit. A detached clean `999dc75` representative differential probe produced the same 11-pass / 7-fail identity set as the current branch. That proves those representative failures are pre-existing; it does not prove exhaustive equivalence for all 51 current full-suite failures.

For 1.0, test ownership must therefore be made explicit instead of widening CI blindly:

```text
current public release/feature gates
archive evidence replay requiring historical artifacts
sanitized-public compatibility assertions
full-source/end-to-end user acceptance
native/package/platform checks
```

Until that reconciliation is complete, the accurate statement is **selected public CI can be green while the historical full suite remains baseline-red**. This is known test-infrastructure debt, not permission to ignore a new failure introduced inside the selected/current gate.

## 20. NEXT generation and owner-acceptance gates

The successor branch adds a distinct verification layer ahead of promotion:

```text
generation manifest contract
→ internal infrastructure isolation contract
→ desktop generation/diagnostics tests
→ existing selected governed public CI
→ owner UAT pack
→ explicit promotion decision
```

Core NEXT CI validates the generation manifest builder, the 4-fixture/14-scenario owner UAT manifest, generation/diagnostics contracts, desktop build and the existing selected governed regression gates. Private NEXT CI retains strict TypeScript/build/full compiled-runtime tests and additionally verifies the checked-in NEXT environment example.

Owner UAT is intentionally separate from automated CI. A green CI run proves the successor satisfies machine contracts; promotion still requires user-visible acceptance against one immutable `generation_id`. This complements rather than hides the known historical full-suite taxonomy debt recorded in section 19.

The 2026-08-30 latest-head revalidation checkpoint at Core `b1b40277e5e6e8389bc13c2c75f439fdb861600c` passed generation contract 3/3, UAT-pack validation, release/public-boundary gates, generation diagnostics 8/8, desktop build, and the exact selected governed command from `.github/workflows/ci.yml` at **11 files / 39 tests**. Private control-plane head `c251fb1ee981a529c33335d25d3ada4e6ea9d23f` passed strict typecheck/build and **116/116** tests. Those source gates did not by themselves prove the already-running artifacts: at that historical checkpoint the ordinary desktop build had cleared `dist/lightbi-generation.json`, producing an SPA fallback. Later runtime sections document deliberate manifest restoration and exact generation reconciliation; NEXT-012 subsequently served a real immutable generation manifest; NEXT-013 introduced governed docs, NEXT-014 hardened docs/demos/admin, and NEXT-015 now supersedes them as the current Internal candidate after the secondary-route first-paint regression fix.

## 21. NEXT-009 round-trip regression and runtime gate

The `g-2026-08-31-next-009` bug-test checkpoint pins Core `ecfff03fe7924fe5d7477f10df61b26b31cd9258` and CP `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`. Current-machine gates pass: continuity/session 5 files / 20 tests, focused Advanced source/return 2 files / 6 tests, selected governed CI 11 files / 39 tests, generation contract 3/3, generation diagnostics 8/8, UAT manifest 4 fixtures / 14 scenarios / 3 levels, release contract 3/3, public boundary, production desktop build and source-size 470 modules / 0 violations.

An additional headless Chromium replay executes the owner-reported workflow with `Sales_ERP_May_2026.xlsx`: import, choose perspective, create chart, return to perspectives, open the canonical source in Advanced, and return to Easy without edits. Acceptance requires the final Easy workspace to remain the same 1,500-row/13-column full source, retain its perspective pool, avoid auto-charting, avoid `advanced:...` dataset identity, avoid source reselection, and create no new synthetic Investigation session. `next-009` satisfies all of these checks.

This browser replay is Internal bug-test evidence, not a substitute for formal owner UAT or release acceptance. Promotion remains gated by explicit owner acceptance. CP and worker now run through their existing Internal user-systemd units, and diagnostics must report the same generation/commit and current schema before the browser checkpoint is treated as runtime-valid.

## 22. NEXT-010/NEXT-011 sidebar-source authority regression

NEXT-010 adds browser evidence for the route that NEXT-009 had not covered: an Investigation chart is open, the user enters Advanced through the persistent sidebar, opens CURRENT, and returns to Easy. Acceptance requires the supplementary Investigation Advanced source not to become active merely through registration. Core `92906b1a91b283d248b9a7eb911265a8126498b9` satisfies that browser workflow and is packaged in `g-2026-08-31-next-010` with manifest SHA-256 `d8ce0a61319a565589b74f706984d3c71eaafcca18f2a289220a859490a9eb74`.

NEXT-011 adds the component-level regression at Core `fcefeb0d3c3a3c0d36f618d77c9cd654e8635a6d`, so the non-activating Investigation registration is tested at the actual component boundary rather than only through store/action isolation. That exact head is packaged in `g-2026-08-31-next-011`, manifest SHA-256 `5d0495a179e62d8e17f37e80d5efce8be89a467572689463be562d767a841ab0`. These are Internal bug-test gates; formal owner UAT remains independent.

## 23. NEXT-012 six-file collection round-trip gate

NEXT-012 adds a collection-scale browser acceptance in addition to the machine suite. The exact repository fixture set contains six ERP files, 9,000 rows, three business roles and two periods. The replay selects Executive Overview, enters the six-table Advanced collection, requires `Return to Easy` to be visible, returns without edits, verifies `6 sources / 3 roles / 2 periods / Governed`, then opens Advanced again and requires the same CURRENT collection with six tables / 9,000 rows.

At Core `d82bdb625b69755af51f42c01e2a35fe00731c28`, focused Advanced continuity tests pass 10/10. The exact selected governed CI command remains 11 files / 39 tests; generation contract 3/3, generation diagnostics 8/8, UAT manifest 4 fixtures / 14 scenarios / 3 levels, release contract 3/3, public boundary, desktop build and source-size 470 modules / zero violations all pass. The immutable runtime manifest is `g-2026-08-31-next-012`, SHA-256 `0f8ec8f1178a6298a69f297f5254ecb81603fea248615e4a7bfdd092f3bc9264`.

A green collection replay proves continuity of the Internal test workspace; it does not authorize promotion. Explicit owner UAT and release acceptance remain required, and production `5172/5173/5174` is outside this test lifecycle.


## 24. NEXT-013 documentation/demo/native-recovery acceptance gate

NEXT-013 pins Core `00e6d89c9465fd75bd72a824f48dabbdc83495b6`, CP `d1a7d439fe43d8678626e377c2853558bc50c8d6`, schema `062_documentation_content`, and immutable manifest SHA-256 `c54df6e84f3fe90fe0ca99f9a0107d39c4b7b839ccc47ce6cd6bcbf23e400e7d`.

Exact-head machine gates pass: CP TypeScript/build/full compiled-runtime **122/122**, Core desktop production build, selected governed CI **11 files / 39 tests**, release contract 3/3, public/private boundary, generation contract 3/3, generation diagnostics 8/8, owner UAT manifest 4 fixtures / 14 scenarios / 3 levels, and source-size 471 modules / zero violations. Focused exact-head native/demo regressions pass for native credential mode, native embedded source-vault routing, and deterministic demo scenarios. The known jsdom `Blob/File.text()` environment debt in an unrelated persisted-copy test is not reclassified as a product failure or hidden by changing the gate.

Browser acceptance on the reconciled Internal generation proves all four starter chips execute real canonical flows. Separate Chromium checks prove CP root distribution, direct CP `/docs`, and gateway `/docs`. Real Internal admin documentation CRUD was exercised against migrated schema 062 and the temporary test page was deleted after create/read/update/delete proof.

Schema mutation remains explicit: migration 062 was inspected as the only pending Internal migration, applied through the migration CLI, then re-read as 15/15 applied with zero pending. Runtime API/worker startup does not auto-apply schema. Production persistence was not migrated.

One pre-existing CP tooling debt was observed during deployment verification: the `verify:runtime` package script points at a stale compiled path while the verifier is emitted under `dist/platform/runtime/`. This does not invalidate the green CP build/test/runtime diagnostics, but the script path should be repaired in a dedicated tooling change rather than silently worked around forever.

Packaged Windows native E2E is not claimed by these Linux/VPS gates. The native recovery/auth code paths have contract proof, while owner acceptance on the actual Windows Tauri package remains an explicit release-quality gate.


## 25. NEXT-014/NEXT-015 portal-hardening and first-paint gates

NEXT-014 pins Core `d96011bfe2d3deca8424eac15f6d3e7d39cf7a97`, CP `497ffbf9592faddefec72280a4ddd244efab648c`, schema `062_documentation_content`, and manifest SHA-256 `2878d3b6893db87940ad82d76070da92a34bc546a024ff45ad373a55b917fe05`. Exact-machine proof added the focused demo/session suite **3 files / 10 tests** to the existing Core gate while retaining selected governed **11 files / 39 tests**, generation 3/3, diagnostics 8/8, UAT 4 fixtures / 14 scenarios / 3 levels, release/public-boundary, desktop build and source-size 471/0. CP at `497ffbf...` passed **127/127** compiled-runtime tests. Live browser acceptance covered docs/sidebar/screenshots/Internal SEO, real admin login/Docs controls and demo-history ephemerality.

The owner's screen recording then supplied a new UI acceptance criterion: secondary distribution routes must never visibly paint the homepage before their own renderer takes control. CP `f1879c65453cdf0bc9798257e462264f0424e907` adds a deterministic first-paint guard plus a server regression covering `/docs`, `/docs/getting-started`, `/admin` and `/account`. Full CP proof increases to **128/128**. A Chromium animation-frame observer independently reports `homeFlash=false` for Docs index, Docs detail, Account login, Admin login, authenticated Admin and Admin Accounts.

Because the CP source SHA changed, the fix was not folded into immutable NEXT-014. It was cut as `g-2026-08-31-next-015`, preserving Core `d96011b...`, moving CP to `f1879c6...`, and producing manifest SHA-256 `110d7503bed7b93a849a9e453fa82bb9fc4be7be4aad30670fb69e04f719e97a`. Final exact-head Core CI was rerun after the cut and remains green. Production 5172/5173/5174 and production data remained outside this deployment/test lifecycle.

## 26. NEXT-016 Monaco suggestion-controller gate

NEXT-016 advances only Core/frontend source. Core `451c9b6afe0a95bce5bce473a4a84c8b918f42cd` adds a dedicated runtime-contract test proving the Monaco suggestion controller is enabled while leaving the existing contextual SQL semantic provider as the completion authority. Focused proof is 1/1 PASS.

After the change, exact-head revalidation passes generation contract 3/3, generation diagnostics 3/3, desktop production build and the selected governed suite 11 files / 39 tests. The immutable Internal manifest is `g-2026-08-31-next-016`, SHA-256 `72f223df5c2508e2d1e278497e1d8a664aa55f87c5c497f8d48d5a76b77e7f90`, with Core `451c9b6...`, unchanged CP `f1879c6...`, and schema 062. A post-build restore re-copies the archived manifest into `apps/desktop/dist/lightbi-generation.json`; gateway acceptance confirms JSON content, matching generation header and byte-identical manifest hash rather than SPA fallback.

The CP first-paint gate remains inherited from unchanged CP `f1879c6...`; live Chromium revalidation continues to observe no homepage paint on Docs, Account or Admin routes. Production 5172/5173/5174 remains outside this lifecycle.


## 27. NEXT-026 authentication-recovery deployment gate

NEXT-026 reuses exact Core `c78124df3973fcfe2107a966563f3266e97f3deb`, whose NEXT-025 transport/updater acceptance source already passed focused transport/updater/diagnostics **20/20**, History durability **13/13**, the complete `test:release-1.0` authority and governed product regression **39/39**. The new source change is private control-plane UX/documentation authority at CP `30bb58ffeaaad80014fb7c57522a7b8a4eb6feb8`.

The CP-focused auth/docs gate passes **21/21** after a full server/web build, and the complete private authoritative suite passes **175/175**. The immutable generation-manifest contract passes **3/3** before packaging. The resulting Internal engine bundle was built from exact Core source, not by relabeling the predecessor runtime.

Runtime acceptance for `g-2026-09-02-next-026` requires and currently proves: gateway manifest/header identity match; Core health; CP diagnostics exact generation/commit; schema `065_marketing_newsletter_mail` current with pending `[]`; healthy same-generation worker; published `/docs/sign-in-and-account-recovery`; served Account/Admin assets containing `Use authenticator or recovery code`, `Need help?` and fingerprint markers; and absence of the raw W3C WebAuthn diagnostic URL.

Generation manifest SHA-256 is `98addf25986a513d728c5e19743106a25af0d0c4e90f37d1a3d76a9e8bf63b7a`; Core server binary SHA-256 is `3a6e87f37a8016eebae71b714cf4fc8e5f6f4af954b1617a543a1a35a23b9c8a`. This machine gate does not substitute for owner interaction: Admin/Account Passkey cancellation and TOTP/recovery fallback still require manual browser acceptance. The independent Windows A→B/History acceptance remains open. Production is outside this Internal deployment lifecycle.

## 21. 2026-09-02 platform stabilization priority — Windows first

Owner acceptance of the current macOS Beta found substantial application defects. Road-to-1.0 execution is therefore sequenced **Windows first**: Windows product/update/package stability and publisher-trust readiness are the active platform lane; macOS Beta defect repair/signing/notarization and Linux package validation are deferred until Windows is genuinely stable.

This does not convert the product contract into a permanent Windows-only policy. The existing macOS workflow remains an ad-hoc-signed Beta validation path and must not be used as stable publisher evidence. Linux/macOS may be resumed later, but neither platform receives a stable/official claim merely because the Windows lane closes. The active release hardening task is to prevent the Beta workflow or unsigned Windows artifacts from being promoted to stable authority and to prepare a fail-closed Authenticode evidence gate for the eventual Windows stable lane.

## 22. 2026-09-02 Windows-first Beta release and publisher-evidence gate

Public commit `72cfb385f1d35c605d3a09f80657572dc25abe02` changes the active Beta release lane from cross-platform packaging to **Windows-only** packaging in accordance with the owner-approved stabilization order. Linux Beta build/publication is removed from this active workflow while the release schema remains platform-capable for later Linux/macOS re-entry.

The Beta lane is fail-closed against stable promotion: tag authority is checked, publication channel is hard-coded `beta`, and a non-Beta version aborts. Existing stable `release/lightbi/latest.json` is read directly from R2 and cannot be overwritten by a later Beta publication; `beta/latest.json` remains the Beta channel pointer.

Every Windows Beta installer now produces an immutable publisher-evidence sidecar from native PowerShell `Get-AuthenticodeSignature` plus installer SHA-256. Beta records the observed status without claiming official publisher trust. Stable manifest generation for a Windows artifact requires a publisher-evidence file, exact expected signer subject and matching digest; the validator rejects non-`Valid` Authenticode status. This is signing-readiness only. The current NEXT installer still has PE certificate table `0/0`, and no stable/official claim is permitted until real publisher signing and the remaining Production Trust gates exist.
