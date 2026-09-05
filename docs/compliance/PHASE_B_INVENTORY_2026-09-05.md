# Phase B — Compliance Inventory Baseline

Status: ACTIVE inventory; not release approval
Date: 2026-09-05
Product source inspected: `/home/ubuntu/n8n2erpnext/LightBI-exp-focus-subject`
Branch observed: `codex/r1-roadmap-integration`
Governed by: `LIGHTBI_PUBLIC_COMPLIANCE_FRAMEWORK.md`
Release plan: `R1_PRE_RELEASE_ARMOR_TRUST_COMPLIANCE_PLAN.md`

## 1. Method and authority

This inventory records observed source/manifests and candidate obligations. It does not promote source observations into public claims without runtime/binary evidence.

Inventory states: `OBSERVED`, `VERIFY_RUNTIME`, `LICENSE_REVIEW`, `LEGAL_REVIEW`, `PLANNED`, `NOT_IMPLEMENTED`, `SUPERSEDED`.

The product worktree was inspected read-only. Existing product changes, if any, are outside this compliance-doc task and were not modified.

## 2. Technology tree — first observed pass

| Family | Observed technology/capability | Source evidence | Disclosure class | Next gate |
| --- | --- | --- | --- | --- |
| Semantic understanding | Micro Semantic Brain V1 | `understanding-core/micro-brain/` | LIGHTBI PROPRIETARY + public algorithms | separate proprietary/public layers |
| Retrieval | BM25 + TF-IDF/LSA + RRF | MB README/runtime | OPEN/PUBLISHED TECHNIQUE used by LightBI engineering | authoritative technology links + attribution/IP review |
| Numerical ML support | `ml-matrix` 6.15.0 | root `package.json` | THIRD PARTY | license/provenance review |
| Local analytics | DuckDB WASM + Rust DuckDB paths | desktop manifest + crates | THIRD PARTY | determine packaged/runtime roles |
| Desktop | Tauri 2 + React 19 | desktop manifest | THIRD PARTY | licenses + binary inclusion |
| Visualization | Apache ECharts / echarts-for-react | desktop manifest | THIRD PARTY | license review |
| Spreadsheet/export | SheetJS xlsx tarball + rust_xlsxwriter + jsPDF/html-to-image | manifests | THIRD PARTY | redistribution/license review |
| Secure transport | signed transport implementation | `crates/lightbi-tauri/src/signed_transport.rs` | LIGHTBI ENGINEERING over crypto primitives | exact primitive/boundary verification |
| Installation trust | installation trust implementation | `crates/lightbi-tauri/src/installation_trust.rs` | LIGHTBI ENGINEERING | lifecycle + key/certificate boundary audit |
| Update/distribution | update state/store + distribution pairing | desktop source | LIGHTBI ENGINEERING | endpoints, signing, integrity, metadata map |
| Account/auth | account API/hook + native capabilities | desktop source | LIGHTBI ENGINEERING | data-flow/endpoints/retention map |

## 3. Micro Brain / learning truth split

Observed MB documentation currently describes a **local deterministic recall/inference helper**, with sparse BM25, TF-IDF/LSA dense vectors, RRF and an evidence bridge. It explicitly states retrieval scores are not semantic confidence and that the runtime path has no network dependency.

The current MB README also states its foundation knowledge is generated from curated reusable knowledge and must not contain fixture identities, expected answers or customer-specific truth. These are source-level claims and still require release-binary reconciliation before public publication.

Durable adaptive user learning is **PLANNED**, not established as implemented by this inventory. Therefore the new transparency splash is also `PLANNED` and must not imply that LightBI already retains learned user patterns.

Learning implementation must preserve the authority boundary: learned observations/candidates may improve hypothesis priority but may not become semantic truth, metric authority or calculation authority merely by frequency.

## 4. Initial data/network boundary candidates

Observed source contains local-loopback runtime references and product/distribution endpoints, including current/future LightBI domains plus legacy `thaiduy.*` release/distribution references. This is not yet a verified network-flow map: examples, tests, historical strings and active runtime endpoints must be separated.

Candidate externally communicating families requiring tracing: account/auth; distribution pairing; updater/update manifest/artifact download; license/entitlement; signed transport/verification; support/docs/external opener; future Team/workspace/cloud; any telemetry if present.

Phase B must classify each endpoint as `ACTIVE_RUNTIME`, `BUILD_ONLY`, `TEST_FIXTURE`, `DOC_ONLY`, `LEGACY`, or `FUTURE`, then record data categories, purpose, recipient/controller/processor role, retention and user control.

## 5. Dependency/IP inventory — first pass

Observed JS material includes DuckDB WASM, Monaco, TanStack Table, Tauri API/opener, ECharts, fflate, Framer Motion, html-to-image, jsPDF, Lucide, React, React Router, SheetJS xlsx, Zustand and build/test tooling.

Observed Rust material includes Axum, DuckDB, MongoDB, reqwest, ring, rust_xlsxwriter, SQLx, Tauri, Tiberius, Tokio, tower-http, keyring, SHA-2 and other crates. Exact versions and transitive graph must come from lockfiles/SBOM tooling rather than this textual first pass.

The SheetJS dependency is sourced from a vendor CDN tarball rather than the ordinary npm registry; its exact license/redistribution terms are a specific `LICENSE_REVIEW` item before 1.0.

No dependency is cleared for redistribution merely because it appears in a package manifest. Final status requires exact version, license text, notice/source obligations, binary inclusion and transitive review.

## 6. Initial claim inventory

Claims requiring evidence reconciliation already include: `local-first`; `no hosted LightBI service required for analysis`; local MB runtime/no network dependency; signed/authenticated transport; cryptographic/installation trust; update integrity; evidence-governed analysis; deterministic calculation; official/verified build identity; supported database/file compatibility; privacy/learning statements; and future AI/ML terminology.

Each will move into the Claim–Behavior–Obligation Matrix with exact source/binary/runtime evidence and bounded public wording.

## 7. Planned MB/ML splash inventory item

Required product surfaces: first-run/onboarding disclosure before durable learning activation; `Settings → Privacy & Learning`; `How LightBI learns`; privacy/data commitment; learned-memory inspect/delete UI if durable learning exists.

Required user-visible distinctions: Micro Brain vs durable learning; raw/source values vs derived semantic patterns; local processing vs network communication; hypothesis assistance vs truth/authority; learning enabled vs disabled behavior.

Required controls/evidence: explicit choice where required; preference persistence; no durable learning while disabled; scope boundary; inspect/delete; reset/uninstall semantics; storage measurement where exposed; network proof; EN/VI semantic parity.

Candidate splash copy is intentionally **not frozen in Phase B**. Final copy must follow implementation truth and jurisdiction/legal review, not precede it.

## 8. Phase B queue

1. Extract exact JS/Rust dependency versions and licenses; produce first SBOM/license exception list.
2. Trace account/update/distribution/signed-transport endpoint construction and payload categories.
3. Inventory current public claims across README EN/VI and public-facing product strings.
4. Build the first Data Flow & Privacy Register, explicitly separating business source data, learned state and operational/account metadata.
5. Build Legal Applicability Matrix rows tied to observed LightBI features rather than generic laws.
6. Build Public Asset Register and identify canonical EN/VI owners.
7. Convert technology inventory into the public Tech Tree disclosure draft only after provenance/license status is known.

## 9. Current blockers/findings requiring follow-up

- `LICENSE_REVIEW`: SheetJS CDN package and all bundled/transitive licenses before commercial redistribution.
- `VERIFY_RUNTIME`: active vs test/legacy LightBI and `thaiduy.*` endpoints.
- `VERIFY_RUNTIME`: exact signed-transport primitive, verification boundary and enforcement coverage.
- `VERIFY_RUNTIME`: whether any telemetry exists in the candidate release and, if so, exact fields/endpoints/default state.
- `PLANNED`: durable MB/local learning and transparency splash; do not describe as shipped behavior yet.
- `LEGAL_REVIEW`: final learning consent/legal-basis wording and consumer/privacy documents per actual distribution territory.

Phase B remains open. This file is an inventory checkpoint, not a compliance certificate and not a substitute for the final candidate-binary audit.
