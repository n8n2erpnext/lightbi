# LightBI Public Compliance & Disclosure Framework

Status: canonical governance baseline
Date: 2026-09-05
Scope: all public LightBI documents, digital assets, releases, claims, technology disclosures, data/privacy statements, security statements, AI/ML/MB statements, licensing/IP notices, and distribution surfaces.
Supersedes: none
Superseded by: none
Primary sources: LightBI Project Book and Library Rules; applicable law and regulator guidance must be verified from current authoritative sources before each material publication/release.

> This document is an engineering and publication-governance control. It is not legal advice and does not declare LightBI compliant with any jurisdiction by itself.

## 1. Purpose and authority

This framework is the canonical publication-compliance baseline for LightBI. It governs what LightBI may say publicly, what evidence is required before saying it, how technology and third-party dependencies are disclosed, and how legal obligations are mapped to actual product behavior.

It applies to humans, AI agents, maintainers, contractors, release automation, websites, repositories, installers, applications, and future publication channels. Greater model capability, marketing urgency, or release pressure never grants authority to bypass this framework.

When this framework conflicts with observed product behavior, current verified behavior wins and the public claim must be corrected or the release blocked. When law conflicts with this framework, applicable law wins and this framework must be updated.

## 2. Governing principles

1. **Evidence before claim.** No public claim may be stronger than reproducible evidence.
2. **Behavior before prose.** Source, binary, runtime, network and deployment behavior outrank marketing/documentation wording.
3. **Bounded claims by default.** Avoid absolutes unless the complete relevant scope is proven and remains continuously controlled.
4. **Purpose limitation.** Data collection, transmission and retention must have a documented purpose and boundary.
5. **Disclosure without unnecessary exposure.** Explain user-relevant behavior and obligations without publishing secrets that weaken security or surrender legitimate trade secrets.
6. **Jurisdiction is explicit.** `compliant`, `certified`, `approved`, or equivalent language requires a named scope, evidence owner and legal basis.
7. **Provenance survives publication.** Material claims must remain traceable to evidence, version and review date.
8. **Uncertainty remains uncertainty.** Inference, probability, retrieval similarity and future intent must not be rewritten as fact.
9. **Change reopens review.** A feature, dependency, data flow, business model or distribution change may invalidate prior disclosures.
10. **Abstention is valid.** If evidence is insufficient, LightBI says so instead of inventing certainty.

## 3. Scope: public assets

Governed assets include, without limitation:
- README and repository pages in every language;
- product, distribution, documentation, support and marketing websites;
- Privacy Policy, Terms, EULA, DPA, security and vulnerability policies;
- pricing, licensing, entitlement, refund and commercial statements;
- installers, package metadata, About screens, onboarding and in-product notices;
- release notes, changelogs, GitHub Releases, manifests and update metadata;
- screenshots, diagrams, videos, demos, benchmark reports and case studies;
- API, connector, plugin, SDK and integration documentation;
- architecture/Tech Tree/whitepapers and public technical notes;
- AI, ML, Micro Brain and automation descriptions;
- OSS attribution, third-party notices, SBOM and dependency disclosures;
- telemetry, authentication, licensing, updater, cloud/team and sync disclosures;
- generated reports or exported artifacts that carry LightBI claims or provenance.

## 4. Claim classes and required evidence

| Claim class | Examples | Minimum evidence |
| --- | --- | --- |
| Product behavior | local-first, offline, export behavior | current code + runtime/package test |
| Data/privacy | data stays local, telemetry, retention | data-flow inventory + network/runtime evidence + policy mapping |
| Security | signed, encrypted, isolated, tamper-resistant | implementation path + threat boundary + verification test |
| AI/ML/MB | AI interaction, inference, confidence, generated content | feature classification + runtime behavior + user disclosure assessment |
| Performance | latency, capacity, benchmark | reproducible method + hardware/data/version + date |
| Compatibility | OS/database/file support | tested version matrix |
| Commercial | price, license, seats, refund | canonical commercial source + effective date |
| Legal/compliance | GDPR/AI Act/CRA/etc. | applicability assessment + evidence register + qualified review where required |
| Third-party/IP | library/model/service/license | dependency/license inventory + attribution/obligation review |

A screenshot, historical handoff, model assertion, README statement or passing unit test alone is not sufficient evidence for a broad legal, privacy or security claim.

## 5. No Absolute Claim Rule

The following claim families are prohibited by default: `100% secure`, `zero risk`, `fully private`, `never sends data`, `anonymous`, `cannot be tampered with`, `guaranteed accurate`, `fully compliant`, or equivalent unconditional wording.

An exception requires: exact scope; current reproducible evidence; known exceptions; accountable reviewer; review date; and a mechanism that reopens the claim when relevant behavior changes.

Prefer bounded wording such as `local-first`, `processed locally by default`, `network communication is limited to documented functions`, `cryptographically signed within the documented trust boundary`, or `designed to support <named requirement>`.

## 6. Claim → Behavior → Obligation → Evidence chain

Every material public claim must be representable as:

`Public claim → exact product behavior → affected data/technology → applicable obligation → evidence → approved wording → publication surfaces → review trigger`

If any required link is unknown, the claim is `UNVERIFIED` and must not be published as fact. A future registry may implement this chain in machine-readable form; the semantic contract in this section is canonical now.

## 7. Technology disclosure rule

Every material technology used by LightBI must be classified by purpose, user impact, data access, network behavior, security boundary, third-party ownership/license, and disclosure tier.

Disclosure tiers:
- **PUBLIC:** information users reasonably need to understand behavior, limitations, material data handling, AI interaction, security expectations, compatibility or licensing.
- **COMPLIANCE/CUSTOMER:** deeper material supplied where required, including relevant data flows, processors/subprocessors, retention, SBOM/OSS obligations, vulnerability/support information and contractual security material.
- **CONFIDENTIAL/INTERNAL:** proprietary algorithms, heuristic weights, unreleased research, credentials, signing secrets, anti-abuse internals, exploit-sensitive implementation and legitimate trade secrets.

Confidentiality never permits LightBI to make a misleading public claim. It limits detail; it does not alter truth.

## 8. Data and privacy publication rule

Before publishing privacy statements, maintain an inventory of data categories, source, purpose, processing location, recipients/endpoints, retention/deletion, security controls, user controls, legal/contractual basis where applicable, and cross-border implications where applicable.

`Local-first` does not mean `no network`. Authentication, licensing, update discovery/download, telemetry, support, team/workspace, payment or future cloud functions must be described separately from local business-data processing when their behavior differs.

Any new telemetry field, identifier, cloud feature, processor, retention change or cross-border path automatically reopens privacy review and affected public assets.

## 9. AI / ML / Micro Brain publication rule

LightBI must distinguish deterministic calculation, retrieval, statistical/ML inference, AI-generated explanation, user-authored content and externally supplied model/service behavior.

Core epistemic rule: **retrieval similarity is not semantic confidence; inference is not evidence; evidence is not automatically execution authority.** Public descriptions must preserve the governed sequence from hypothesis/retrieval through evidence and resolution/abstention to governed calculation where applicable.

Where applicable law requires users to be informed that they are interacting with AI or that content is AI-generated/manipulated, the relevant product surface must provide the required disclosure. Applicability must be assessed per feature and jurisdiction rather than assumed globally.

## 10. Security publication rule

Security claims must name their boundary. `Signed` must identify what is signed; `encrypted` must distinguish transit/at-rest where relevant; `isolated` must identify the isolation boundary; `verified` must identify the verifier/evidence.

Never publish secrets, private keys, credentials, exploit-enabling details or controls whose disclosure materially weakens protection. Public security documentation should instead describe architecture, supported reporting channels, support/vulnerability handling and user-relevant guarantees with bounded language.

A discovered severe incident or actively exploited vulnerability must trigger jurisdiction/applicability review immediately; release notes alone are not an incident-reporting mechanism.

## 11. Third-party, OSS, IP and digital-asset rule

Before publicly distributing a component, asset, model, font, icon, dataset, sample, library or bundled technology, record its source/provenance, license/terms, modification state, redistribution rights, attribution/notice obligations, patent/trademark concerns where known, and whether it enters an SBOM or other required inventory.

Do not assume `free`, `open source`, `public on GitHub`, `AI-generated`, or `available online` means unrestricted commercial redistribution.

LightBI-owned screenshots, diagrams, datasets and generated assets must not expose personal data, credentials, customer-confidential data, secret infrastructure details or third-party content beyond authorized use.

## 12. Jurisdiction and legal applicability register

Each material legal regime is classified as one of: `APPLICABLE`, `POTENTIALLY_APPLICABLE`, `FUTURE/TRANSITION`, `BEST_PRACTICE`, `NOT_APPLICABLE`, or `REQUIRES_COUNSEL`.

Each entry must record jurisdiction, instrument/requirement, triggering facts, product/release scope, effective/application dates, obligations, evidence owner, public assets affected, authoritative source, last verification date and next review trigger.

The initial jurisdiction set is Vietnam, EU/EEA and United States federal/state as relevant to actual distribution and users. Expansion follows actual market/distribution scope.

As of this baseline, EU AI Act Article 50 transparency obligations have applied since 2026-08-02 for covered systems/features. EU Cyber Resilience Act reporting obligations begin 2026-09-11 and its main obligations apply from 2027-12-11. These dates are reference triggers, not declarations that every LightBI feature is in scope; current official guidance must be rechecked at the gate.

## 13. Public Asset Register

Every material publication surface must have an owner, canonical source, language/locale, current version/effective date, material claims, linked evidence IDs, legal/privacy/security dependencies, and review trigger.

Translations are separate governed assets. A translated README, Privacy Policy or Terms must not silently change the semantic scope of the canonical statement. Material EN/VI divergence is a release/publication defect unless intentionally jurisdiction-specific and documented.

## 14. Required compliance registers

The framework requires these logical registers; they may begin in Markdown and later become machine-readable:
1. Legal Applicability Register.
2. Claim–Behavior–Obligation Matrix.
3. Public Asset Register.
4. Technology Disclosure Register.
5. Data Flow & Privacy Register.
6. Third-party/OSS/IP/SBOM Register.
7. Security & Vulnerability Disclosure Register.
8. AI/ML/MB Disclosure Register.
9. Release Compliance Gate evidence.

Do not create duplicate documents merely to satisfy this list. Existing canonical sources should be linked or extended where they already own the truth.

## 15. Release Compliance Gate

A public release is not compliance-ready until the responsible gate verifies, at minimum:
- release identity, source SHA and distributed artifact identity;
- relevant source/binary/runtime/network behavior against material claims;
- README/docs/site/in-product/installer/release-note consistency;
- EN/VI material semantic parity where both are published;
- privacy/data-flow changes and required notices/consent/control updates;
- AI/ML/MB feature classification and required transparency;
- security claims, vulnerability status and support/reporting obligations;
- third-party licenses/notices and required inventory/SBOM changes;
- pricing/licensing/entitlement statements against canonical commercial truth;
- jurisdiction register and effective-date triggers;
- unresolved `BLOCKER`, `REQUIRES_COUNSEL`, or unverified material claim.

A blocker may be closed by changing implementation, narrowing/correcting the claim, adding required disclosure/control, or producing sufficient evidence. It may not be waived merely because publication is urgent.

## 16. Change Impact Gate

Any material change to code, dependency, data collection, network endpoint, AI/ML behavior, authentication, updater, licensing, payment, team/cloud workflow, export, security boundary, supported platform, business model or distribution territory must answer:

`Which claims, policies, registers, notices, contracts, SBOM entries, screenshots, translations, release gates and jurisdiction assessments become stale?`

If the answer is not known, the change is not publication-ready.

## 17. Publication states

Material claims use one of these states internally:
- `VERIFIED` — evidence current and scope matched.
- `BOUNDED` — verified only within stated conditions/limitations.
- `PENDING_REVIEW` — evidence exists but required review is incomplete.
- `UNVERIFIED` — insufficient evidence; cannot publish as fact.
- `SUPERSEDED` — historical claim retained only for provenance.
- `PROHIBITED` — wording/claim cannot be published under this framework.

A public-facing document need not expose these labels, but its claims must originate from a permissible state.

## 18. Evidence retention and reproducibility

Evidence should record version/SHA, date, environment, test method, relevant configuration, source path or artifact identity, result, reviewer/automation identity, and known limitations. Legal-source evidence records authoritative URL/title, jurisdiction, publication/effective date and verification date.

Historical evidence is not automatically current evidence. Reproducibility is preferred over screenshots; screenshots may supplement but should not replace machine-verifiable evidence when available.

## 19. Exception and escalation rule

No AI agent may invent a legal interpretation to unblock release. Ambiguous high-impact obligations, regulated-market classification, certification claims, cross-border data questions, consumer-contract ambiguity, material incident reporting, sanctions/export controls, or unresolved IP rights must be marked `REQUIRES_COUNSEL` or equivalent qualified review.

An exception record must state the exact rule, reason, scope, risk owner, expiry/review date and compensating control. Permanent silent exceptions are prohibited.

## 20. Relationship to LightBI Library governance

This framework follows `docs/project-book/LIBRARY_RULES.md`. It governs public/compliance truth; the Project Book governs project truth and provenance. Neither replaces implementation evidence.

Source precedence for public claims is:
`applicable law/regulator requirement → verified current product/distribution behavior → current canonical LightBI contract/register → approved public wording → historical material`.

When a public asset conflicts with higher authority, publication must be corrected and the conflict recorded rather than rationalized away.

## 21. Initial implementation plan

Phase A — Baseline: adopt this framework and link it from Project Book/library entry points.

Phase B — Inventory: build the registers by reusing existing canonical sources before creating new documents.

Phase C — Reconcile: audit current README EN/VI, distribution site, installer/in-product notices, Privacy/Terms/EULA/security, updater/licensing/auth/telemetry, AI/MB claims, third-party assets and release metadata.

Phase D — Gate: connect a release compliance checklist to Road-to-1.0 so unresolved material blockers stop public release.

Phase E — Automate: machine-readable claim/register IDs, SBOM/license checks, link/translation drift checks, network/data-flow probes and release evidence generation where practical.

## 22. Definition of done

This framework is operational when every material public claim can be traced to current behavior and evidence; every material technology/data flow has an accountable disclosure classification; every relevant jurisdiction has a dated applicability assessment; EN/VI public semantics are controlled; and release automation/process can identify unresolved compliance blockers before publication.
