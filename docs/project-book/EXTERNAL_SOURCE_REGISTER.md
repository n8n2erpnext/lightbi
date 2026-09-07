# LightBI External Source Register

This register tracks important source material supplied outside the repository so the Project Book can preserve provenance without pretending the material was repository-native.

## EXT-2026-08-29-PHASE2

- Source name: `LightBI_Session_Handoff_Phase2_2026-08-29.md`
- Supplied: 2026-08-29
- Lines: 2,089
- Bytes: 42,546
- SHA-256: `f20e05a6097882907047f950680ec67d66f004170676be608b50b33c674ecdd7`
- Classification: session handoff / approved design continuity record
- Incorporated into: `LIGHTBI_PROJECT_BOOK.md` Part XIV and `LIGHTBI_WORKLOG.md`
- Repository-native at intake: no
- Code/Git/CI reconciled: no

Authority rule: use this source for intended road-to-1.0 technical direction, but do not upgrade branch/PR/SHA/runtime claims to repository truth until the planned Git/code/CI audit verifies them.

## EXT-2026-09-04-DECISION-PRESENTATION-VISUAL-REVIEW

- Source name: Owner-supplied LightBI chart/dashboard reference and live UI review screenshots.
- Supplied: 2026-09-04 in the active owner/assistant conversation.
- Classification: owner visual reference + current-product UX evidence; non-authoritative for runtime truth.
- Repository-native at intake: no; image bytes were conversation attachments and were not copied into the documentation repository.
- Incorporated into: `docs/history/agent/plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md`, Project Book section 111, Worklog entry 2026-09-04, Road-to-1.0 overlay.
- Code/Git/CI reconciled: yes for the product-code paths cited in the plan; no product mutation or CI run was performed by this planning task.
- Visual 1 — chart/dashboard vocabulary reference: 202,811 bytes; SHA-256 `9a26c320d540aebd89bb8f5ead5de4a0d7fbed8b42821f5ceae425ccb560ecf5`.
- Visual 2 — Home/New Brief card-density screenshot: 62,120 bytes; SHA-256 `7ef5c321cfef9621c46f8e98899506d7467d3002928ab1507ce71e6c4400aba7`.
- Visual 3 — Understanding/Analysis Context screenshot A: 112,612 bytes; SHA-256 `47ca6ccdf11e17851be18d5218797fe724be947a5a9ef12392d40914c796aefb`.
- Visual 4 — Understanding/Analysis Context screenshot B: 128,202 bytes; SHA-256 `76ac184e070d4d9c954ab3c885c8d760e1e87ae30770ae9bb8d6f7625dd43972`.
- Visual 5 — Decision Workspace screenshot A: 101,315 bytes; SHA-256 `49a63508bf66090abea8325310c633735278643a944850eafbcf83918f3435c1`.
- Visual 6 — Decision Workspace screenshot B: 108,752 bytes; SHA-256 `38ed7a92036e871750c84e25a0d45f0a4c7c00ace4352d98548031bef3190ff0`.
- Visual 7 — Deep BA long-form screenshot: 69,431 bytes; SHA-256 `a5e4daf4a5ea418eebccf76cf64fdae94bc0fc64185b97aa91e0d36c7a4c1862`.

Authority rule: these visuals establish owner UX intent and observable presentation defects only. Product/source/runtime truth remains Git/code/test governed; semantic and metric authority remain under canonical contracts.
## EXT-2026-09-05-DEEP-RESEARCH-LEGAL-COMPLIANCE

- Source name: ChatGPT Deep Research — LightBI 1.0 legal/compliance research for EU/EEA, United States and Vietnam.
- Research session: `6a9b699a-b2b8-83ec-ae04-46f210cf4b9f`.
- Supplied: 2026-09-05 in the active owner/assistant conversation.
- Classification: external legal/compliance research baseline; reference evidence, not legal advice or legal authority.
- Repository-native at intake: no; Deep Research did not expose a standalone report file for direct repository copy.
- Preserved repository snapshot: `docs/compliance/LEGAL_RESEARCH_BASELINE_2026-09-05.md`, reconstructed from the research scope/results and reverified against authoritative regulator/statutory sources.
- Incorporated into: `docs/compliance/LIGHTBI_PUBLIC_COMPLIANCE_FRAMEWORK.md` and `docs/compliance/R1_PRE_RELEASE_ARMOR_TRUST_COMPLIANCE_PLAN.md`.

Authority rule: the research snapshot establishes provenance and issues-to-assess. Current statutes/regulator sources outrank it; actual LightBI applicability must be reassessed against current product/business facts and qualified counsel where required.

## EXT-2026-09-05-FRAPPE-UI-REFERENCE

- Source name: Frappe UI — `https://github.com/frappe/frappe-ui`.
- Reviewed: 2026-09-05 against the current LightBI successor frontend stack.
- Classification: external design-system / interaction reference; non-authoritative for LightBI runtime architecture.
- Repository-native at intake: no.
- Incorporated into: `docs/history/agent/plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md`.
- LightBI compatibility finding: use as design/interaction inspiration only. Current LightBI Desktop is React/Tauri; no Vue bridge or framework migration is approved to consume Frappe UI directly.

Authority rule: Frappe UI may inform primitive composition, tokens, interaction density and enterprise UX patterns. LightBI code, tests, design baseline and owner decisions remain authoritative for implementation.

## EXT-2026-09-06-FRAPPE-BOOKS-REFERENCE

- Source name: Frappe Books — `https://github.com/frappe/books`.
- Intake snapshot: `master` at `a79a1e3b03f424805ad094e2fd8731d04f84d36f` on 2026-09-06; re-pin at DPR-0 before implementation.
- Companion source: Frappe UI `https://github.com/frappe/frappe-ui`, observed `main` at `ada484717135d9c50e272402012e718ef1dfc2d3` for the same amendment.
- Classification: external product UI/UX, dashboard-composition and interaction reference; non-authoritative for LightBI runtime/metric architecture.
- Repository-native at intake: no.
- Incorporated into: `docs/history/agent/plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md`.
- Owner intent: study the source implementation, not only screenshots, with special attention to clean accounting workflows, flat-canvas hierarchy, restrained surfaces, navigation/action placement, tables/forms and dashboard information rhythm.
- Chart direction: use Frappe/owner references to build a semantic LightBI Chart Pattern Library; do not copy external chart APIs or pursue visual variety for its own sake.
- DPR-0 re-pin: verified again at exact `a79a1e3b03f424805ad094e2fd8731d04f84d36f` and cloned read-only to `/home/ubuntu/n8n2erpnext/_external-reference/frappe-books-a79a1e3` for source study.
- Measured study scope now includes Windows/macOS window chrome, 28px Windows title bar, 64px page header, 14rem sidebar, row-height rhythm, Inter typography scale, neutral/semantic color palette, spacing/radius/shadow usage, dashboard section ratios and drag/no-drag window-control behavior.
- Source finding: Books ships dedicated Bar/Line/Donut charts plus progress-style invoice status; it does not cover LightBI's full target chart grammar, so owner chart references remain required.

Authority rule: Frappe Books/Frappe UI may inform product behavior, design-system structure and visualization grammar. LightBI owner decisions, current React/Tauri code, governed evidence/metric contracts, accessibility requirements and LightBI-specific acceptance remain authoritative.

## EXT-2026-09-07-MICRO-BRAIN-LEARNING-PIPELINE

- Source name: Owner-approved Micro Brain live-learning / R2 data-lake / Redis worker design discussion.
- Supplied: 2026-09-07 in the active owner/assistant conversation.
- Classification: owner architecture direction and implementation-planning input; not proof of deployed behavior.
- Repository-native at intake: no.
- Incorporated into: `docs/architecture/micro-brain-cross-domain-semantic-expansion.md` and `docs/history/agent/plans/AGENT_IMPLEMENTATION_PLAN_MICRO_BRAIN_R2_REDIS_LEARNING_PIPELINE_2026-09-07.md`.
- Code reconciliation: yes for the planning baseline — current Desktop observation cadence and current Control Plane Redis/outbox/worker/cache primitives were inspected directly before the plan was written.
- Owner intent: scale learning contribution without VPS pull connections, use private R2 as bounded learning lakes, adopt ERPNext-style `short/default/long` workers, expose queue/scheduler/lake controls in Admin, and selectively expand Redis caching without granting it authority.

Authority rule: this source approves design direction. PostgreSQL/Redis/R2/worker code, migrations, NEXT runtime evidence and owner UAT must separately prove implementation; raw-user-data collection or automatic semantic promotion is not authorized by this discussion.
