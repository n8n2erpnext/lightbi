# R1 Pre-Release Armor / Trust & Compliance Plan

Status: approved planning baseline; implementation/evidence gates remain open
Date: 2026-09-05
Scope: mandatory work before LightBI 1.0 public/commercial release
Governed by: [`LIGHTBI_PUBLIC_COMPLIANCE_FRAMEWORK.md`](./LIGHTBI_PUBLIC_COMPLIANCE_FRAMEWORK.md)
Research basis: [`LEGAL_RESEARCH_BASELINE_2026-09-05.md`](./LEGAL_RESEARCH_BASELINE_2026-09-05.md)

## 1. Release rule

LightBI 1.0 does not ship merely because product code is feature-complete. It ships only when product behavior, public claims, data handling, technology/IP obligations, security posture, release artifacts and public documentation tell the same evidence-backed story.

This plan is a hard Road-to-1.0 gate. It does not rotate NEXT/Main roles and does not itself declare any jurisdiction compliant.

## 2. Workstreams

### W1 — Public Technology & Architecture Showcase
Publish a high-level `LightBI Technology Tree` that explains capability and design rationale without disclosing proprietary core implementation or exploit-sensitive security details.

Showcase families: Data Understanding/Micro Brain; analytical intelligence; evidence/trust governance; local-first data plane; secure transport; cryptographic/digital-signature trust; software/release/update trust; governance/provenance.
For each public technology node disclose only: `what it is → why LightBI uses it → conceptual operation → user/trust boundary → open standard/third-party attribution where applicable`.

Classify every node as `OPEN STANDARD`, `OPEN SOURCE/THIRD PARTY`, `LIGHTBI ENGINEERING`, or `LIGHTBI PROPRIETARY`. Do not market a public algorithm/standard as proprietary LightBI technology.

Do not publish curated MB knowledge, weights/thresholds, resolver heuristics, anti-abuse rules, private key material, certificate operational topology, exploit-sensitive controls or other trade-secret implementation unless a separate review explicitly approves it.

### W2 — Technology, Dependency, OSS & IP Register
Inventory direct/material transitive dependencies, frameworks, databases, algorithms/standards, models/services, fonts, icons, datasets, sample data and bundled assets.

For each record: purpose, version, source/project, official technology link, license/terms, modification, redistribution/notice/source obligations, patent/trademark concerns where known, binary inclusion and SBOM status.

Deliverables include an SBOM strategy and `THIRD_PARTY_NOTICES`/license artifacts where obligations require them.

### W3 — Legal Applicability Matrix
Build dated EU/EEA, US federal/state and Vietnam matrices from actual distribution/business/data facts. Each row records trigger, status, affected LightBI feature/data flow, required action, evidence, timing, severity and `REQUIRES_COUNSEL` uncertainty.

No generic `EU compliant`, `US compliant`, `GDPR compliant`, `AI Act compliant` or equivalent badge is permitted without an approved scoped basis.
### W4 — Privacy, Data Flow & MB Learning Disclosure
Audit source + packaged binary + runtime/network behavior. Map raw business data, personal data, learned patterns, identifiers and operational metadata across local storage and every external endpoint.

For MB/local learning define: opt-in/opt-out behavior; exactly what may be retained; what is never retained; scope; aggregation/compaction; retention/decay; inspect/delete controls; whether anything leaves the device/workspace; and what happens when learning is disabled.

Do not publish `we do not store user data` if derived learned patterns or account/operational data are retained. Use category-specific bounded statements proven by implementation.

### W5 — Public Legal Documents & Disclaimers
Prepare/reconcile, as actually applicable: Privacy Policy; Terms of Use/Service; desktop EULA/license terms; consumer/refund/cancellation notices; AI/ML/MB disclosure; security/vulnerability policy; support/version policy; OSS/third-party notices; cookie/tracker notice; DPA/subprocessor/SCC material for relevant business roles.

Disclaimers must explain analytical limitations, dependence on source quality/evidence, forecasting/inference uncertainty, unsupported decision use and professional-advice boundaries where relevant. A disclaimer may not pretend to waive mandatory law or excuse misleading/security/privacy behavior.

### W6 — Security, Signing & Supply-Chain Trust
Document public security boundaries for authenticated/signed transport, replay resistance, digital signatures, release signing, update verification, artifact integrity and provenance without exposing secret operational details.

Create/verify `SECURITY.md`, vulnerability intake, supported versions, incident escalation, key/certificate lifecycle governance, dependency vulnerability review, artifact checksum/signing and secure update behavior. CRA applicability/readiness receives an explicit gate.
### W7 — Claim–Behavior–Obligation Audit
Create the matrix required by the framework. Audit at minimum: `local-first`, `raw data stays local`, `offline`, `no hosted service required`, `private`, `secure`, `signed`, `verified`, `AI`, `machine learning`, `Micro Brain`, `confidence`, `accurate`, `official`, `anonymous`, telemetry and compliance claims.

Every material claim receives evidence identity, bounded approved wording, publication surfaces and change trigger. Unsupported absolutes are removed or narrowed.

### W8 — Public Asset & EN/VI Consistency Audit
Inventory README EN/VI, GitHub pages/releases, distribution website, docs, pricing, installer, onboarding, About/Settings, screenshots/video/demo, manifests, release notes, support pages and generated/exported LightBI notices.

Material EN/VI semantic divergence is a defect unless explicitly jurisdiction-specific and documented.

### W9 — Final Binary Compliance Verification
After feature freeze, audit the exact candidate binary/artifacts rather than source assumptions: network capture, filesystem/storage behavior, updater/auth/license flows, learning state, telemetry, dependency/SBOM, signatures/checksums, installer/uninstaller, public endpoints and clean-machine behavior.

The candidate SHA/artifact identity becomes the evidence anchor for final public claims.

## 3. Mandatory final artifacts

Before 1.0 release, the gate must resolve or explicitly block on: Technology Showcase/Architecture overview; Technology/Dependency Register; Legal Applicability Matrix; Claim–Behavior–Obligation Matrix; Public Asset Register; Data Flow/Privacy Register; AI/ML/MB Disclosure Register; Security/Vulnerability Register; SBOM/third-party notices; Privacy/Terms/EULA/disclaimers as applicable; and final release compliance evidence.
## 4. Gate order

1. **Inventory now** — establish technology/assets/data/public-claim truth while R1 development continues.
2. **Design corrections before freeze** — fix architectural/privacy/security/license issues that are expensive to patch after packaging.
3. **Draft public documents from verified registers** — never invent policy language first and force implementation to fit later.
4. **Feature freeze** — lock release candidate behavior.
5. **Binary/runtime audit** — verify the thing users will actually receive.
6. **Legal/IP/security reconciliation** — close blockers and obtain qualified review where required.
7. **Publication parity** — README EN/VI, website, installer, About, Privacy, Terms, Technology Showcase and release notes match the candidate.
8. **Owner release decision** — only after gate evidence is recorded.

## 5. Hard blockers

Release is blocked by unresolved material license/redistribution rights; unknown material data egress; misleading privacy/security/AI claim; missing legally required notice/control; unresolved reportable severe security issue; unsigned/unverified release path where signing is a declared requirement; material EN/VI contradiction; or `REQUIRES_COUNSEL` item that the framework classifies as release-critical.

A vulnerability finding is not automatically a blocker solely by severity label. It must be triaged against exploitability, affected release artifact, exposure, remediation/mitigation, applicable reporting duties and accepted risk authority.

## 6. Definition of done

The R1 Armor Gate closes only when every material public claim traces to the exact release behavior/evidence, every material technology/asset has provenance and obligation status, relevant legal triggers are dated and assessed, required public legal/security/technology documents are consistent, and no release-critical blocker remains unresolved.

Passing this gate means `release governance complete for the assessed scope`; it does not authorize an unqualified claim that LightBI is universally legally compliant.
## 7. MB / Machine-Learning transparency splash — implementation requirement

Before any durable adaptive/local-learning behavior is enabled for a user, LightBI must implement an explicit onboarding/in-product disclosure rather than burying the behavior only in Privacy/Terms.

The splash must explain in plain language: why LightBI learns; the distinction between Micro Brain semantic assistance and durable machine/local learning; what categories may become learned patterns; what raw/source values are excluded from learned memory; whether learned state leaves the device/workspace; how learned candidates affect hypothesis ranking without becoming semantic truth; and that disabling learning does not disable normal LightBI analysis.

The interaction must provide an explicit choice such as `Allow local learning` and `Do not allow`, with no deceptive visual hierarchy. Do not use a generic `OK = consent` pattern where consent is the required legal/UX basis. Exact consent/legal-basis requirements remain jurisdiction-dependent and must be reconciled in W3/W4.

Settings must provide a durable `Privacy & Learning` control surface covering learning ON/OFF, scope, learned-pattern count/storage where technically meaningful, inspect learned memory, clear learned memory, and links to `How LightBI learns` plus the current privacy/data commitment.

Public wording must not claim `no user data is stored` merely because raw rows are excluded. It must distinguish source/raw data, learned semantic patterns, account/license/auth metadata and other operational data according to verified implementation.

Implementation evidence must prove the splash state, preference persistence, disabled-learning behavior, inspect/delete semantics, local/network boundary and uninstall/reset behavior. These become W4, W7, W8 and W9 release-gate evidence.

This splash is a **planned mandatory R1 artifact**, not evidence that local learning is already implemented. Final wording must be generated from the verified Data Flow/Privacy and AI/ML/MB registers and re-reviewed if learning architecture changes.
