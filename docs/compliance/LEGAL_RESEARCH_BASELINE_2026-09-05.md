# LightBI Legal Research Baseline — EU/EEA, United States, Vietnam

Status: research/reference evidence; not legal advice and not a declaration of compliance
Date: 2026-09-05
Scope: pre-release legal/compliance research baseline for LightBI 1.0
Research origin: ChatGPT Deep Research session `6a9b699a-b2b8-83ec-ae04-46f210cf4b9f`, followed by primary-source verification on 2026-09-05.
Derived governance: [`LIGHTBI_PUBLIC_COMPLIANCE_FRAMEWORK.md`](./LIGHTBI_PUBLIC_COMPLIANCE_FRAMEWORK.md)

## 1. Provenance rule

This file preserves the research basis used to design LightBI's public-compliance framework and R1 pre-release gate. It is intentionally a durable source snapshot so future maintainers can trace a LightBI rule back to the legal/regulatory source family that motivated it.

The original Deep Research result is conversation-native and was not exposed as a standalone repository file by the research tool. Therefore this repository artifact is a provenance-preserving research baseline reconstructed from that research scope/results and rechecked against authoritative primary/regulator sources. It must not be represented as a verbatim export of the Deep Research UI.

Legal instruments and regulator guidance change. Before a material release or legal claim, reopen the authoritative source, verify current text/effective dates, record the review date, and obtain qualified counsel where this framework requires it.

## 2. Research question

Determine which privacy/data-protection, AI/ML, cybersecurity, software/product, consumer, electronic-signature, IP/OSS, distribution, incident, cross-border, accessibility and public-claim obligations may affect commercial/public release of LightBI, with priority on EU/EEA, United States and Vietnam.

Applicability is feature-, market-, role-, data-flow- and business-model-dependent. Presence in this baseline means `ASSESS`, not automatically `APPLICABLE`.
## 3. EU/EEA source baseline

| Instrument/source | Why LightBI must assess it | Baseline status |
| --- | --- | --- |
| GDPR — Regulation (EU) 2016/679 | Personal-data processing, controller/processor roles, transparency, lawful basis, minimisation, retention, rights, security, transfers, DPIA where triggered | In force; applicability depends on processing/territorial scope |
| EU AI Act — Regulation (EU) 2024/1689, as amended | Feature classification, provider/deployer roles, prohibited/high-risk/transparency/GPAI obligations where triggered | In force; Article 50 transparency obligations apply from 2026-08-02 for covered features |
| Cyber Resilience Act — Regulation (EU) 2024/2847 | Software/product-with-digital-elements cybersecurity, vulnerability handling, support and market obligations where LightBI is in scope | Reporting obligations from 2026-09-11; full application 2027-12-11 |
| Product Liability Directive (EU) 2024/2853 | Software expressly treated as a product for modernised product-liability rules | Member-state transposition/application must be assessed for target markets |
| European Accessibility Act — Directive (EU) 2019/882 | Accessibility may apply to covered products/services, notably e-commerce and specified digital services | National implementation/applicability must be assessed |
| Data Act — Regulation (EU) 2023/2854 | Data-access/use/switching obligations may matter if future LightBI offerings enter covered roles/services | Assess per feature/business model; do not assume scope |
| ePrivacy/national cookie rules | Website cookies, trackers and electronic communications may trigger consent/information duties | Assess actual website/telemetry implementation and member-state rules |

Primary sources:
- GDPR principles and privacy-by-design: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en
- AI Act official text: https://eur-lex.europa.eu/eli/reg/2024/1689
- Article 50 Commission guidance: https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems
- CRA official text: https://eur-lex.europa.eu/eli/reg/2024/2847/oj
- CRA implementation timeline: https://digital-strategy.ec.europa.eu/en/factpages/cyber-resilience-act-implementation
- CRA reporting: https://digital-strategy.ec.europa.eu/en/policies/cra-reporting
- Product Liability Directive: https://eur-lex.europa.eu/eli/dir/2024/2853/oj
- European Accessibility Act overview: https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en
## 4. United States source baseline

The US baseline is intentionally split into federal enforcement/sectoral law and state privacy/consumer law. There is no single LightBI-wide conclusion called `US compliant`.

Federal baseline:
- FTC Act / FTC privacy-security enforcement: public privacy and security representations must match actual practices; reasonable security and data minimisation are core risk controls.
- Sectoral laws may become relevant only when LightBI enters their trigger facts (for example health, financial, education, credit/employment use). Domain recognition alone does not make LightBI subject to a sectoral regime.
- State breach-notification, privacy and consumer-protection rules require state-by-state applicability review when LightBI processes covered residents' information.

California baseline:
- CCPA, as amended by CPRA, provides rights including know, delete, correct, opt out of sale/sharing, limit certain sensitive-information use, and non-discrimination for covered businesses.
- Applicability thresholds, role, exemptions, contracts, notices, request handling and Global Privacy Control must be assessed against the actual LightBI business/data model before claiming coverage or non-coverage.

Primary sources:
- FTC Consumer Privacy: https://www.ftc.gov/business-guidance/privacy-security/consumer-privacy
- FTC Data Security: https://www.ftc.gov/business-guidance/privacy-security/data-security
- FTC Start with Security: https://www.ftc.gov/business-guidance/resources/start-security-guide-business
- California Attorney General CCPA: https://oag.ca.gov/privacy/ccpa

Required LightBI posture: never convert `local-first` or a privacy policy into a blanket US-law claim. Maintain a state-law trigger matrix as distribution/revenue/data practices evolve.
## 5. Vietnam source baseline

| Instrument/source | Why LightBI must assess it | Baseline status |
| --- | --- | --- |
| Law 91/2025/QH15 on Personal Data Protection | Personal-data processing, rights, responsibilities and related data-protection duties | Effective 2026-01-01 |
| Law 116/2025/QH15 on Cybersecurity | Current cybersecurity statutory baseline and relevant obligations for covered systems/services | Effective 2026-07-01 |
| Decree 333/2026/ND-CP | Detailed implementation measures under the Cybersecurity Law | Effective 2026-08-19 |
| Law 20/2023/QH15 on Electronic Transactions | Electronic transactions, electronic messages/signatures and related trust questions | Effective 2024-07-01 |
| Law 19/2023/QH15 on Protection of Consumers' Rights | Consumer information, digital transactions, terms and commercial conduct where LightBI sells to consumers | Effective 2024-07-01 |
| Vietnam IP law and implementing rules | Copyright, software, trademarks, third-party assets, licenses and commercial distribution | Assess current consolidated law at release |

Primary sources:
- Personal Data Protection Law: https://vanban.chinhphu.vn/?docid=214590&pageid=27160&typegroupid=3
- Official Gazette copy: https://congbao.chinhphu.vn/van-ban/luat-so-91-2025-qh15-45578/57730.htm
- Cybersecurity Law: https://vanban.chinhphu.vn/?classid=1&docid=216499&orggroupid=1&pageid=27160
- Decree 333/2026/ND-CP: https://vanban.chinhphu.vn/?docid=219244&pageid=27160&typegroupid=4
- Electronic Transactions Law: https://vanban.chinhphu.vn/?docid=208421&pageid=27160
- Consumer Protection Law: https://vanban.chinhphu.vn/?classid=1&docid=208363&pageid=27160

Vietnam is a first-class jurisdiction in the release gate, not a fallback jurisdiction merely because LightBI is developed from Vietnam.
## 6. Cross-jurisdiction findings carried into LightBI governance

1. Inventory actual data and network behavior before writing privacy claims.
2. Separate local business-data processing from account, licensing, updater, payment, support, telemetry, workspace/team and future cloud paths.
3. Treat AI/ML applicability per feature. `Micro Brain`, retrieval, deterministic resolution and external generative AI must not be collapsed into one marketing label.
4. Preserve user-visible controls and truthful disclosure for any learned memory; raw source values, derived patterns, retention, scope, deletion and transfer behavior must be distinguished.
5. Maintain vulnerability handling, supported-version policy, incident escalation and secure-update/release provenance; CRA readiness is an R1 design target even before full CRA application.
6. Maintain dependency/license provenance, SBOM capability and third-party notices. `Open source` does not erase redistribution obligations.
7. Terms/EULA/disclaimers cannot waive mandatory privacy, consumer, product-safety, cybersecurity or statutory liability obligations.
8. Public claims such as `secure`, `private`, `local-first`, `anonymous`, `AI`, `signed`, `verified`, `compliant` or `guaranteed accurate` require bounded scope and evidence.
9. Cross-border distribution requires jurisdiction-specific applicability, not one global compliance badge.
10. High-impact ambiguity is a counsel gate, not an AI inference opportunity.

## 7. Research maintenance

This snapshot is immutable historical research evidence except for correction of factual transcription errors. New legal research should create a dated successor baseline and link `Supersedes`/`Superseded by` rather than silently rewriting what was known on 2026-09-05.

At each 1.0 release-candidate legal gate, verify at least: effective/application dates; regulator guidance changes; LightBI distribution territories; business thresholds; data flows; AI feature classification; CRA/product classification; consumer sales model; security incidents/vulnerabilities; and third-party license changes.

Qualified legal review is required before LightBI makes broad compliance/certification claims, relies on uncertain exemptions, enters regulated decision-use cases, resolves material cross-border-transfer uncertainty, responds to a reportable incident, or accepts unresolved IP/consumer-contract risk.