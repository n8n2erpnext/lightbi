# LightBI CPR-8 NEXT Owner UAT + Vietnamese i18n Semantic QA Handoff — 2026-09-12

Status: handoff / operational continuity, not canonical architecture
Date: 2026-09-12
Scope: Chart Presentation Plane CPR-0→CPR-8 closure state, immutable NEXT deployment, owner-UAT readiness, Vietnamese i18n catalog hardening and semantic QA
Supersedes: none
Superseded by: none
Primary sources: [Library Rules](../../../project-book/LIBRARY_RULES.md), [Project Book](../../../project-book/LIGHTBI_PROJECT_BOOK.md), [Decision/Presentation UI/UX Refactor Plan](../plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md), [CPR-7 Broad Runtime Acceptance](../walkthroughs/AGENT_CPR7_BROAD_RUNTIME_ACCEPTANCE_2026-09-12.md), [Visual Narrative Audit Remediation Handoff](AGENT_HANDOFF_VISUAL_NARRATIVE_AUDIT_REMEDIATION_2026-09-11.md)

## 0. Stop-point instruction — read before doing anything

The owner stopped the session because the chat context was near capacity and explicitly requested a **full VPS handoff** so the successor can resume immediately.

At this stop point there are **two different Product truths that must not be conflated**:

1. Public NEXT currently serves the immutable CPR-8 chart-presentation candidate built from Product commit `d778ce758b80fde7fbdfccb34efd73f6fc5f1b92`.
2. The Product repository itself has advanced to pushed commit `c398105081592080b2e27802a655ccbc3bb63959` and additionally contains **three intentionally dirty i18n/UI files** that must not be reset.

Do **not** checkout `d778ce75`, reset the Product tree, stash-and-forget, or deploy `c3981050`/the dirty i18n work automatically. The live candidate and current source work are intentionally different.

The immediate unfinished owner request is Vietnamese localization work:

> add `Nhấp vào để xem hoặc xuất` / `Click to view or export`; audit language text hard-coded in code and move/catalog it in `vi/en.json`; then re-review all Vietnamese copy so it reads naturally in current LightBI context, following the source-aware semantic principles used by the local `erpnext2vi` repository.

The i18n work is already partially implemented and tests are green at this exact dirty state. **Do not restart it from scratch.**

Project safety boundary remains unchanged:

- NEXT / 52xx is the only deploy target for this work.
- **Do not touch Production / 51xx.**
- Do not start Windows/native E3/E4 until the owner explicitly accepts the Web/NEXT candidate.
- This localization task must not change Understanding/Data semantics, SQL, metrics, joins, formulas, evidence authority, aggregation, or canonical source truth.

## 1. Required read order for the successor

Before mutation, read in this order:

1. `docs/project-book/LIBRARY_RULES.md`
2. `docs/project-book/LIGHTBI_PROJECT_BOOK.md`
3. `docs/history/agent/plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md` — especially §23B.17 / CPR-0→CPR-8 contracts and semantic freeze rules
4. `docs/history/agent/walkthroughs/AGENT_CPR7_BROAD_RUNTIME_ACCEPTANCE_2026-09-12.md`
5. this handoff
6. exact current Product `git status`, `git diff`, and the three dirty files listed below
7. `/home/ubuntu/n8n2erpnext/erpnext2vi/README.md` before continuing Vietnamese semantic edits

The historical handoff `AGENT_HANDOFF_VISUAL_NARRATIVE_AUDIT_REMEDIATION_2026-09-11.md` is useful for provenance, but its old live SHA/worktree state is historical and must not override this handoff or current Git/runtime evidence.

## 2. Exact repository state at handoff

### 2.1 Product repository

Path:

`/home/ubuntu/n8n2erpnext/LightBI-dpr0-contract-freeze`

Branch:

`codex/dpr0-contract-freeze`

Current HEAD and remote branch HEAD:

`c398105081592080b2e27802a655ccbc3bb63959`

Commit subject:

`fix(i18n): refresh Vietnamese product language`

`origin/codex/dpr0-contract-freeze` is at the same commit.

Current worktree is **dirty by design**. Do not reset it.

Dirty files:

- `apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx`
- `apps/desktop/src/i18n/language-semantic-quality.test.ts`
- `apps/desktop/src/i18n/languages/vi.json`

Current dirty diff summary:

`3 files changed, 352 insertions(+), 316 deletions(-)`

`git diff --check` is clean.

The current dirty files are the unfinished second semantic-QA pass described in §11–§17 of this handoff.

### 2.2 Product commit immediately before the i18n commit

CPR-8 duplicate-presentation fix and currently deployed NEXT candidate:

`d778ce758b80fde7fbdfccb34efd73f6fc5f1b92`

Subject:

`fix(cpr8): suppress equivalent date presentation duplicates`

The only commit between `d778ce75` and current HEAD is:

`c3981050 fix(i18n): refresh Vietnamese product language`

### 2.3 What `c3981050` changed

The pushed `c3981050` commit changed 13 files and is already a substantial i18n migration/refresh:

- `apps/desktop/src/components/analysis/ChartPreviewRenderer.tsx`
- `apps/desktop/src/components/analysis/LogisticsDatasetSummary.tsx`
- `apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx`
- `apps/desktop/src/components/investigation/FocusSubjectComparisonCard.tsx`
- `apps/desktop/src/i18n/README.md`
- `apps/desktop/src/i18n/language-coverage-baseline.json`
- `apps/desktop/src/i18n/language-coverage.test.ts`
- `apps/desktop/src/i18n/language-registry.test.ts`
- `apps/desktop/src/i18n/language-semantic-quality.test.ts`
- `apps/desktop/src/i18n/languages/en.json`
- `apps/desktop/src/i18n/languages/vi.json`
- `apps/desktop/src/lib/chart-presentation-cpr6-interaction.test.tsx`
- `apps/desktop/src/pages/Settings.tsx`

Commit stat:

`13 files changed, 4411 insertions(+), 948 deletions(-)`

This is important: the successor must not assume localization still starts from the old 90-key English catalog. Current catalogs are already broad and synchronized.

### 2.4 Docs repository

Path:

`/home/ubuntu/n8n2erpnext/LightBI-bada-docs-20260903`

Branch:

`docs/ba-da-mode-future-20260903`

Docs base HEAD immediately before creating this handoff:

`81340b2b17e91bf603ea90f3305a7ba1a7788c50`

Docs worktree was clean before this handoff was created.

The handoff belongs under `docs/history/agent/handoffs/` per Library Rules and is operational continuity only; it does not redefine canonical architecture.

## 3. Live NEXT runtime state — exact deployed candidate

Public NEXT URL:

`https://lightbi-next.thaiduy.digital/app/`

Public NEXT Gateway service:

`lightbi-next-gateway.service`

Current gateway MainPID at handoff:

`3435769`

Service state:

- `ActiveState=active`
- `SubState=running`

Current live UI root from `/proc/<pid>/environ`:

`LIGHTBI_INTERNAL_WEB_ROOT=/home/ubuntu/services/lightbi-next-web/cpr8-chart-presentation-d778ce75`

Public index fingerprint:

`bc791ce82e300ab2fee96d10c3a14bcf6a8957c64ca5d6a2c3daddcd1b101581`

Public main JS asset:

`assets/index-Dms663YZ.js`

The immutable root, local NEXT gateway, and public NEXT were previously verified byte-for-byte to this same index SHA before the owner moved on to i18n work.

The runtime gateway binds the NEXT internal lane, not localhost. Historical CPR-8 inspection established:

- Core/API: 5272 on the NetBird address
- Gateway/UI: 5273 on the NetBird address
- Control Plane: 5274

Do not interpret a failed `curl 127.0.0.1:5273` as service failure; the gateway bind host is not loopback.

### 3.1 Current live candidate is older than current source

Public NEXT **does not contain** Product commit `c3981050` or the current dirty i18n changes.

Do not tell the owner that the newest Vietnamese wording is already live until a new exact committed SHA is built, immutably rotated to 5273, and fingerprint/browser verified.

### 3.2 Rollback model

CPR-8 uses immutable UI roots and systemd user drop-ins/EnvironmentFiles. Higher-precedence drop-ins override older roots. The previously active root before `d778ce75` was the earlier CPR-8 candidate based on `38680c7b`.

Do not copy over an existing immutable root. A successor deploy must:

1. commit the final Product state;
2. build the exact committed SHA;
3. copy build output to a new immutable root named with that SHA;
4. verify byte identity;
5. add a new higher-precedence EnvironmentFile/drop-in for `LIGHTBI_INTERNAL_WEB_ROOT`;
6. restart **only** `lightbi-next-gateway.service`;
7. verify PID, process env root, local 5273 fingerprint and public fingerprint;
8. browser-test the public candidate.

Production / 51xx remains untouched.

## 4. Hard scope boundary inherited from Chart Presentation Plane remediation

The owner explicitly froze Understanding/Data during the chart remediation:

> only chart/presentation work; do not touch the data-understanding part that is currently acceptable.

That remains a non-negotiable regression boundary for i18n too.

Do not modify:

- semantic binding;
- metric recognition;
- dimension recognition;
- normalization/dictionary/registry truth;
- canonical source boundaries or roles;
- evidence binding;
- trust/answerability;
- SQL generation;
- aggregation rules;
- formulas;
- joins;
- multi-source governance;
- MB semantic recovery authority.

For the same source/question before and after presentation/i18n work, truth-bearing IDs, governed totals, answerability and source evidence must remain contract-equivalent.

## 5. CPR-0 → CPR-8 source chronology

The chart-presentation remediation is no longer an ad-hoc patch series; each phase was source-closed separately.

### CPR-0 — freeze and failing proofs

Commit:

`ddff2f28d1a9b3318cf40dab6e10b39d154a9f4e`

Subject:

`test(cpr0): freeze chart presentation actuation debt`

Purpose:

- freeze Understanding/Data truth;
- encode no-op domain policy, weak MB actuation, one-chart collapse and related presentation debt as tests/diagnostics;
- no intended presentation behavior change.

### CPR-1 — official domain presentation policy actuation

Commit:

`9d4a0ce96af82b89d932b1e7ab2a95457a45f4c6`

Subject:

`fix(cpr1): actuate official domain visual policy`

Key result:

- one runtime-consumed official domain presentation policy;
- official chart pattern/story order became real runtime input instead of dead knowledge.

### CPR-2 — presentation capability inventory and request planner

Commit:

`155024691b5e692ddc3b3541ff9fe8cabddda6cc`

Subject:

`feat(cpr2): materialize role-aware presentation capabilities`

Key result:

- read-only Presentation Capability Inventory;
- role-aware bounded request planning replaced blind first-six support selection;
- governance explicitly cannot create metric/formula/join or mutate Understanding.

### CPR-3 — MB bounded presentation vote

Commit:

`4d20c257c2a11bfe09cdbb23b2338300c2cf8bca`

Subject:

`feat(cpr3): give micro brain bounded presentation vote`

Key result:

- MB can materially vote/rank presentation choices **inside the legal set**;
- deterministic governance remains hard-veto authority;
- MB cannot authorize metric/formula/join/data truth;
- A/B actuation tests prove presentation changes when MB advice changes while governed truth remains unchanged.

### CPR-4 — evidence-backed 1 / 3 / 5 story planning

Commit:

`cbfbf51654e93a7d77bc29dc0340b3861a0d7d6e`

Subject:

`feat(cpr4): plan evidence-backed 1 3 5 visual stories`

Key result:

- target story count/roles planned before execution;
- no silent generic `2 → 1` layout normalization;
- explicit degradation reasons;
- domain complements can be legal when evidence-backed;
- no junk padding allowed.

### CPR-5 — first-class compound/combo planning

Commit:

`d94ba2da0f3648b3e94986eda02042de22de7bfd`

Subject:

`feat(cpr5): plan governed compound visuals before execution`

Key result:

- combo recipes requested before execution from already-governed capabilities;
- source/grain/dimension/unit compatibility remains hard-gated;
- combo counts as one visual unit;
- Finance Profit+Margin and representative combos became source-driven oracles.

### CPR-6 — palette and drill UX

Product commit:

`3b832ab1c5da51b1078b886fa55864bdee9c8fd0`

Subject:

`feat(cpr6): close chart palette and drill UX`

Browser-proof commit:

`acbe152391c33057bf7e7c7bab38caa173af0cdb`

Subject:

`test(cpr6): prove browser drill to step2`

Key result:

- five chart palette presets through existing Display Preferences persistence;
- ordinary line/column/row/combo use coherent primary palette identity;
- chart helper communicates click-to-drill behavior;
- exact browser path proved chart mark → source evidence → selected-data Step 2 on a deterministic numeric fixture.

### CPR-7 — broad runtime acceptance and runtime debt closure

Product commit:

`38680c7b8601481124b1f6c085fe9f4f39bb4a0e`

Subject:

`fix(cpr7): close runtime chart presentation debts`

Docs evidence:

[CPR-7 Broad Runtime Acceptance](../walkthroughs/AGENT_CPR7_BROAD_RUNTIME_ACCEPTANCE_2026-09-12.md)

Docs commit that captured CPR-7 acceptance:

`81340b2b17e91bf603ea90f3305a7ba1a7788c50`

Key runtime debts closed there included:

- duplicate Revenue trend support;
- selected perspective → presentation-domain routing, allowing Finance presentation policy even when semantic primary domain differs;
- anti-padding for already-compound primary answers.

### CPR-8 — exact immutable NEXT candidate + late duplicate fix

Current deployed Product commit:

`d778ce758b80fde7fbdfccb34efd73f6fc5f1b92`

Subject:

`fix(cpr8): suppress equivalent date presentation duplicates`

This fix was necessary because public S02 revealed two output-equivalent Revenue trends whose date dimensions used different representations:

- primary: epoch-ms `time_period`, metric `sales_revenue`;
- support: ISO date `Date`, metric `Revenue`.

The presentation duplicate comparator now recognizes date-equivalent members for duplicate suppression while **not** loosening combo alignment. Numeric IDs are not globally treated as dates; normalization is guarded by date/time/period-like fields and anti-collapse checks.

Focused + release gates passed before `d778ce75` deployment.

## 6. CPR-7 broad runtime acceptance — authoritative evidence summary

Do not re-invent or replace the CPR-7 acceptance report. Read the linked walkthrough for exact distributions and raw artifact paths.

Final canonical Single run:

- 126 executable actions;
- 126/126 runtime PASS;
- 0 fail;
- 0 timeout;
- 0 real no-visual after fixing the stale detector to count direct-chart fallback;
- direct fallback cases were re-probed and all had a real bar chart.

Canonical planned→achieved count table recorded in the report:

- planned 1 → achieved 1: 42
- planned 3 → achieved 1: 54, with explicit degradation reasons
- planned 3 → achieved 3: 30
- natural broad-runtime planned/achieved 5: 0

The broad corpus did not naturally contain a layout-5 browser case. Do not fabricate one or claim it did. Layout-5 actuation is covered by the CPR-4 source-driven gate; the CPR-7 report explicitly records the natural browser-corpus limitation.

Controlled synthetic matrix:

- 14 oracle slots;
- 13 executable;
- S08 intentional coverage gap;
- 0 harness failure;
- 0 incomplete execution on the final clean run.

Important synthetic behaviors:

- S02 Revenue Trend: duplicate-support debt identified and addressed;
- S06 Operations Carrier Cost: primary grouped compound answer, no generic MB padding after fix;
- S09B Performance: first-class `combo_bar_line`;
- S10 Finance: Profit + Margin `combo_bar_line`, with selected Finance perspective correctly driving presentation policy even when semantic primary domain was Revenue.

Multi R10:

- 34/34 PASS;
- 7 Data Trust cases stayed on the correct trust surface;
- 0 horizontal overflow;
- 0 page errors;
- follow-up labels and answers remained distinct.

Six official domains:

- Revenue PASS;
- Finance PASS;
- Inventory PASS;
- Operations PASS;
- Customer PASS;
- Performance PASS;
- 6/6 total, 0 page errors.

MB/C0:

- MB A/B presentation actuation stayed alive;
- semantic/data freeze stayed green.

Full release at CPR-7/CPR-8 source closure included desktop build and governed regression; release marker was `release_1_0_suite=passed`.

## 7. CPR-8 public NEXT evidence before i18n work began

The exact immutable `d778ce75` candidate was built and deployed UI-only to 5273.

Build evidence:

- Vite transformed 3836 modules;
- immutable root contained 27 files;
- index SHA `bc791ce82e300ab2fee96d10c3a14bcf6a8957c64ca5d6a2c3daddcd1b101581`;
- main JS `assets/index-Dms663YZ.js`.

Public six-domain matrix on the deployed candidate:

- 6/6 PASS;
- 0 page errors;
- Revenue retained a justified 3-visual story;
- Operations stayed a single compound grouped answer after anti-padding;
- Performance used target combo.

Public synthetic matrix on the deployed candidate:

- 13 executable OK;
- 1 intentional S08 coverage gap;
- 0 fail;
- 0 incomplete;
- 0 page errors;
- 0 horizontal overflow.

S02 stability proof after the epoch-ms↔ISO duplicate fix:

- 3 independent clean browser contexts;
- each held for approximately 15 seconds after preview readiness;
- every run stayed `layout 1 / 1 chart`;
- 0 page errors;
- no old `1 → 3` duplicate-support transition.

### 7.1 One CPR-8 browser item still not closed at the moment owner switched to i18n

The public NEXT final interaction check:

`chart click → filtered source evidence → Investigate selected evidence → BA Step 2`

was about to be re-run on the exact public `d778ce75` candidate when the owner changed scope to i18n.

Important distinction:

- the flow already has a durable Playwright browser proof from CPR-6 (`acbe1523`), and component/integration gates are release-authoritative;
- the **last public CPR-8 candidate-specific click-through rerun** was not completed before switching to localization.

Do not falsely claim this exact public-candidate interaction rerun was completed. It is a small remaining CPR-8 verification item if owner UAT requires formal closure.

## 8. Current owner i18n request — exact wording and interpretation

Owner request immediately before this handoff:

> `ok giờ thêm " Nhấp vào để xem hoặc xuất" <- Việt / Anh . Sau đó chạy rà soát các text ngôn ngữ đang khoá cứng trong code mang ra file vi/en .json --> Chạy dịch lại toàn bộ tiếng Việt cho đúng ngữ cảnh hiện tại còn quá máy móc thiếu tự nhiên hãy làm giống repo erpnext2vi`

Required outcomes:

1. show the helper `Nhấp vào để xem hoặc xuất` in Vietnamese and `Click to view or export` in English;
2. audit user-facing text currently locked/hard-coded in TS/TSX;
3. ensure static UI copy is catalogued in `en.json` and `vi.json` rather than existing as untranslated one-off text;
4. re-review Vietnamese across the product for **current context**, not literal dictionary translation;
5. use the local `erpnext2vi` project as style/semantic reference;
6. keep technical vocabulary in English when that is clearer and established;
7. preserve source-aware/domain-aware translation instead of global Vietnamese search/replace.

## 9. Current LightBI i18n architecture

Main files:

- `apps/desktop/src/i18n/languages/en.json`
- `apps/desktop/src/i18n/languages/vi.json`
- `apps/desktop/src/i18n/language-registry.ts`
- `apps/desktop/src/lib/ui-language.ts`
- `apps/desktop/src/i18n/language-coverage.test.ts`
- `apps/desktop/src/i18n/language-semantic-quality.test.ts`
- `apps/desktop/src/i18n/language-coverage-baseline.json`
- `apps/desktop/src/i18n/README.md`

Current catalog size at handoff:

- English messages: 3224
- Vietnamese messages: 3224
- English patterns: 28
- Vietnamese patterns: 119

The two message key sets are currently equal; `language-semantic-quality.test.ts` asserts parity.

### 9.1 Current catalog model

Current architecture intentionally uses **stable English source strings as message keys**.

`translateCatalogMessage(language, source)` resolves an exact catalog message, then optional patterns, and falls back to the source.

`useUiLanguage()` exposes:

- `t(...)` for UI copy;
- `localize(...)` for deterministic/business text emitted elsewhere.

`UiTranslationBoundary` also localizes visible legacy/plugin surface text.

### 9.2 Important unresolved interpretation of “hard-coded text”

The owner said hard-coded language text should be moved into `vi/en.json`.

The current `c3981050` implementation greatly expands catalog coverage and drives the debt baseline to zero, but the existing architecture still uses English source strings in code, for example:

`t('Exportable evidence')`

That English literal doubles as the stable catalog key. Therefore:

- all static UI copy can be catalog-backed and translated;
- but human-readable English keys still physically appear in TS/TSX.

Do not claim “there is no hard-coded human language in code” unless the owner explicitly accepts source-string-as-key as compliant or the project is migrated to opaque/stable IDs such as `analysis.exportable_evidence`.

A full opaque-ID migration would be much larger and must not be performed casually because dynamic analysis/business text currently relies on source-string localization and reverse-to-English behavior.

For the immediate task, continue the current catalog-backed contract unless the owner explicitly requires opaque IDs.

## 10. Coverage debt status after `c3981050`

`apps/desktop/src/i18n/language-coverage-baseline.json` is intentionally empty now:

- `mixedVietnameseMessageSources`: 0
- `uncatalogedEnglishSources`: 0
- `uncatalogedVietnameseSources`: 0

Policy in the file remains:

`Existing debt may only shrink. Any new uncataloged or mixed-language presentation string fails DPR-0 coverage.`

This is a major improvement over the previous baseline, which allowed hundreds of uncataloged strings.

Do not reintroduce baseline debt to make tests pass. Fix the catalog/source instead.

## 11. “Click to view or export” — exact current state

The catalog entries already exist at current HEAD:

English:

`"Click to view or export": "Click to view or export"`

Vietnamese:

`"Click to view or export": "Nhấp vào để xem hoặc xuất"`

The dirty Product worktree adds the visible helper under the `Exportable evidence` heading in:

`apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx`

The new UI fragment is:

`{t('Click to view or export')}`

The owner-facing text is therefore implemented but **not committed and not deployed**.

Do not add a second competing wording or duplicate key.

## 12. Local `erpnext2vi` reference — required semantic style

Reference repository:

`/home/ubuntu/n8n2erpnext/erpnext2vi`

Required starting document:

`/home/ubuntu/n8n2erpnext/erpnext2vi/README.md`

The reference README defines the exact principles the owner wants LightBI to emulate:

- prioritize real business meaning over word-for-word translation;
- wording must sound natural when displayed, not merely be lexically “correct” in isolation;
- consistency must hold across runtime composition;
- use **A+B context rules**: core term consistency, but module/domain can override when the same English word means something different;
- never replace a Vietnamese word globally when the English source can have multiple meanings;
- keep familiar technical vocabulary in English when natural, e.g. API, Dashboard, Workflow, Sync, Log, Import, Export, Filter, Theme, Webhook, Queue, Cache, Role, Permission, Session, Token, SQL, OAuth, JSON, etc.;
- source-aware semantic validation is more important than machine translation coverage.

The LightBI i18n README at current HEAD has already been updated to document the same source-aware policy.

## 13. Machine-translation errors already identified and protected

The previous Vietnamese catalog contained obvious wrong-context translations. The semantic-quality gate now protects reviewed terminology.

Examples already identified:

| English source | Bad/machine-like old wording | Reviewed LightBI wording |
| --- | --- | --- |
| Margin | `Lề` | `Biên lợi nhuận` |
| Target | `Đích` | `Mục tiêu` |
| Actual | `Thật sự` | `Thực tế` |
| Lead | `Chỉ huy` | `Khách hàng tiềm năng` |
| Patient | `Kiên nhẫn` | `Bệnh nhân` |
| Quotation | `Trích dẫn` | `Báo giá` |
| Purchase Order | generic order wording | `Đơn mua hàng` |
| Sales Order | `Lệnh bán hàng` | `Đơn bán hàng` |
| Commission | `Nhiệm vụ` | `Hoa hồng` |
| Shift | `Sự thay đổi` | `Ca làm` |
| Planning | `quy hoạch` | `Lập kế hoạch` |
| Stock Value | `Giá trị cổ phiếu` | `Giá trị tồn kho` |
| Stage Name | `Tên sân khấu` | `Tên giai đoạn` |
| Parquet File | `tập tin sàn gỗ` | `Tệp Parquet` |
| Profitability Analysis | generic profit analysis | `Phân tích khả năng sinh lời` |
| Reorder Level | literal reorder wording | `Mức tồn tối thiểu` |
| Employee | `Người lao động` in generic context | `Nhân viên` |
| Employee ID | `ID nhân viên` | `Mã nhân viên` |
| Opportunity | generic `Cơ hội` | `Cơ hội kinh doanh` |
| Bar | `Biểu đồ cột` | `Biểu đồ thanh` |

Do not undo these reviewed meanings just because an external dictionary or a different ERP module uses another translation.

## 14. Current dirty semantic-quality test — do not discard

`apps/desktop/src/i18n/language-semantic-quality.test.ts` is currently modified but uncommitted.

The dirty pass extends the reviewed glossary with terms including:

- `Stage Name → Tên giai đoạn`
- `Manufacturing → Sản xuất`
- `Material → Vật tư`
- `Order ID → Mã đơn hàng`
- `Parquet File → Tệp Parquet`
- `Profitability Analysis → Phân tích khả năng sinh lời`
- `Opportunity → Cơ hội kinh doanh`
- `Bar → Biểu đồ thanh`

It also adds source-aware global checks for high-risk product vocabulary:

- Dashboard must remain `Dashboard` in Vietnamese product copy;
- Workspace should use `Khu làm việc`;
- Schema should remain `Schema`;
- Margin must contain `biên lợi nhuận`;
- Perspective should use `góc nhìn`;
- Confidence should use `tin cậy`;
- Business View should remain `Business View`.

It extends the known machine-translation forbidden list.

This test is not temporary junk; it is the regression guard for the owner-requested semantic QA.

## 15. Current dirty `vi.json` second-pass status

`apps/desktop/src/i18n/languages/vi.json` is currently modified across roughly 310 message values. No key-set mismatch was introduced.

The current dirty pass is deliberately improving naturalness/source semantics, for example:

- `Revenue and cost on one governed financial story` → wording based on an **already validated/verified analysis**, not literal “câu chuyện được quản trị”;
- `available business dimension` → `chiều phân tích hiện có`;
- `Unavailable` → `Chưa khả dụng`;
- Micro Brain descriptions replace awkward literal `thùy`/`tất định`/`truy hồi` prose with clearer user-facing wording such as `phần ngữ nghĩa`, `phần tư vấn trình bày`, `theo quy tắc cố định`, `truy xuất`;
- `Workspace` family moves toward `Khu làm việc`;
- Dashboard family keeps `Dashboard` instead of mechanically translating to `Bảng điều khiển`;
- `Business View` remains the product term `Business View`;
- `Click bar to view/export rows` uses natural action wording;
- governed/evidence UI text is moving away from repetitive `được quản trị` toward context-appropriate `đã được xác thực`, `phần tổng hợp đã được xác thực`, etc.;
- `drill-through` user copy moves toward `xem chi tiết` rather than exposing implementation jargon when possible;
- `Details and drivers` → `Chi tiết và yếu tố tác động`, avoiding causal overclaim implied by a literal “tác nhân”.

Current term scan on the dirty `vi.json` showed:

- `được quản trị`: 0
- `tường thuật`: 0
- `ứng viên`: 0
- `truy hồi`: 0
- `tất định`: 0
- `bề mặt`: 0
- `thẩm quyền`: 0
- `truy xuất`: 15 messages
- `đã được xác thực`: 39 messages
- `Dashboard`: 27 messages
- `Business View`: 18 messages
- `khả dụng`: 6 messages

These counts are descriptive, not targets. Do **not** global-replace remaining `khả dụng`, `truy xuất`, `đã được xác thực`, etc. Every edit must be driven by the English source and actual UI context.

## 16. Exact-English policy — do not over-Vietnamize

The current semantic QA intentionally allows reviewed technical/product terms to remain English.

Examples include:

- LightBI
- Micro Brain
- LightBI Secure Connection
- Dashboard / Dashboards
- Business View / Business Views
- Theme
- REST API
- GraphQL
- BigQuery
- DuckDB
- Excel
- MySQL
- PostgreSQL
- MariaDB
- SQLite
- Webhook
- Microsoft 365 Excel
- Schema
- Intelligence Pack
- Core / Core API
- product/company/sample proper names

The current dirty test also maintains explicit `intentionallyEnglish` expectations for key product vocabulary.

Do not “finish translation” by mechanically converting these back to awkward Vietnamese.

## 17. Focused i18n test state at this exact handoff

After the current three dirty files were present, the following command was run:

```bash
pnpm --dir apps/desktop exec vitest run \
  src/i18n/language-coverage.test.ts \
  src/i18n/language-registry.test.ts \
  src/i18n/language-semantic-quality.test.ts
```

Result:

- `language-semantic-quality.test.ts`: 7 tests PASS
- `language-registry.test.ts`: 9 tests PASS
- `language-coverage.test.ts`: 3 tests PASS
- total: **3 files / 19 tests PASS**
- duration: approximately 4 seconds

Notable coverage tests that passed:

- every static user-facing English string found by the current desktop AST coverage is catalogued;
- static Vietnamese visible at translation boundaries is catalogued;
- English/Vietnamese message key sets are equal;
- reviewed terminology is preserved;
- placeholder parity is preserved;
- known machine-translation artifacts are rejected;
- source-aware high-risk term rules are green.

This focused PASS does **not** mean the whole i18n task is finished. It only proves current catalog/guard integrity.

## 18. What is still unfinished in the i18n task

The owner asked for a full Vietnamese re-review, not just elimination of known absurd translations.

The successor still needs to:

1. review the remaining 3224 Vietnamese messages for natural current LightBI context, prioritizing user-visible high-frequency product surfaces first;
2. inspect remaining source-aware terms that can still be mechanically phrased even when tests pass;
3. verify that the new `Click to view or export` helper is visually appropriate in both English and Vietnamese;
4. decide whether any additional surfaces should show that helper, rather than blindly duplicating it;
5. audit dynamic `patterns` for unnatural Vietnamese output, not only exact messages;
6. validate that technical terms intentionally kept in English are consistent across all composed sentences;
7. run component/browser smoke tests in both languages after wording stabilizes;
8. run full release/semantic freeze before commit/deploy;
9. commit the dirty Product work only after review, then build/deploy an exact committed SHA if the owner wants to test it on NEXT.

### 18.1 Highest-priority wording families to review next

Continue source-aware review around these English concepts because they historically generated mechanical Vietnamese:

- governed / governance / governed evidence / governed metric;
- available / unavailable / availability;
- candidate / inferred candidate / semantic candidate;
- retrieval / relevance / semantic retrieval;
- narrative / story / explanation;
- deterministic / planner / rule-driven;
- authority / authorization / evidence authority;
- surface / workspace / view / perspective;
- domain / official support / inferred domain;
- driver / contribution / cause — preserve the no-causal-overclaim distinction;
- identity / canonical / source-bound / evidence-bound;
- native / runtime / backend / control plane / signed transport;
- focus / focus subject / selected subject;
- drill / drill-through / evidence drill;
- export / import / workbook / Pivot / Dashboard.

For each, inspect the English source and the rendered sentence. Never replace the Vietnamese token globally.

## 19. Recommended next execution sequence for successor

Follow this order; do not improvise by deploying first.

### Step A — re-anchor exact state

```bash
cd /home/ubuntu/n8n2erpnext/LightBI-dpr0-contract-freeze
git status --short
git rev-parse HEAD
git diff --check
git diff -- apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx
git diff -- apps/desktop/src/i18n/language-semantic-quality.test.ts
git diff -- apps/desktop/src/i18n/languages/vi.json
```

Expected HEAD:

`c398105081592080b2e27802a655ccbc3bb63959`

Expected dirty files: exactly the three listed in §2.1 unless another agent has legitimately continued the work.

If the state differs, inspect Git history/diff before acting. Do not restore to this handoff blindly.

### Step B — read localization policy

Read:

- `apps/desktop/src/i18n/README.md`
- `/home/ubuntu/n8n2erpnext/erpnext2vi/README.md`
- `apps/desktop/src/i18n/language-semantic-quality.test.ts`

### Step C — continue Vietnamese semantic review

Use English source as the identity key. Prioritize visible product surfaces and the high-risk families in §18.1.

Good pattern:

1. identify English msgid/source;
2. inspect where it is rendered;
3. decide domain/product context;
4. compare with `erpnext2vi` only where domain meaning matches;
5. edit the exact `vi.json` message;
6. if the term is dangerous/recurrent, add a source-aware semantic regression rule rather than a global text replacement.

### Step D — audit static copy coverage

Current AST coverage is green and debt baseline is zero. Keep it zero.

Do not add exceptions/baseline debt merely because a new string is inconvenient to catalog.

If the owner truly wants zero human-language source strings in TS/TSX rather than source-string catalog keys, stop and scope an explicit **message-ID migration** first. Do not partially mix ID keys and source-string keys without a contract.

### Step E — focused tests during editing

Run repeatedly:

```bash
pnpm --dir apps/desktop exec vitest run \
  src/i18n/language-coverage.test.ts \
  src/i18n/language-registry.test.ts \
  src/i18n/language-semantic-quality.test.ts
```

Also run component tests for every UI component whose structure changes.

### Step F — before Product commit

At minimum:

```bash
git diff --check
pnpm --dir apps/desktop exec tsc --noEmit
pnpm --dir apps/desktop exec vitest run \
  src/i18n/language-coverage.test.ts \
  src/i18n/language-registry.test.ts \
  src/i18n/language-semantic-quality.test.ts
```

Then run presentation/Investigation regression relevant to changed surfaces and C0 semantic freeze.

### Step G — full release gate

Before declaring source-close or deploying:

```bash
pnpm test:release-1.0
```

Require final marker:

`release_1_0_suite=passed`

Do not substitute focused i18n tests for the full release gate.

### Step H — commit/push Product

Only after review and gates:

- review staged diff;
- verify no Understanding/Data implementation files changed;
- commit with a narrow i18n/UI-copy subject;
- push `codex/dpr0-contract-freeze`.

### Step I — exact immutable NEXT deployment, if owner wants the new language pass live

Build **after commit**, from exact committed SHA. Do not deploy a dirty working tree.

Create a new immutable root; do not overwrite `cpr8-chart-presentation-d778ce75`.

Rotate only `lightbi-next-gateway.service` / 5273 by the established higher-precedence EnvironmentFile/drop-in method.

Verify:

- new MainPID;
- `LIGHTBI_INTERNAL_WEB_ROOT` points to the new root;
- local 5273 and public NEXT return the same index SHA/assets as the immutable root;
- public `/app/` loads;
- English and Vietnamese switch correctly;
- no page errors/overflow;
- representative chart + evidence/export copy is correct.

### Step J — public interaction + owner UAT

If formal CPR-8 closure is still required, finish the exact public-candidate interaction rerun:

`chart mark → investigation-drill-through → matched rows → Investigate selected evidence → deep-analysis-shell / selected-subject investigation`

Then let the owner perform visual/language UAT.

Do not start Native E3/E4 until explicit owner Web acceptance.

## 20. Validation gates that must remain green

Localization must not become an excuse to weaken engineering gates.

Keep green:

- English/Vietnamese catalog key parity;
- placeholder parity;
- zero uncataloged static UI debt under current AST coverage;
- semantic-quality glossary/source-aware rules;
- known machine-translation artifact rejection;
- TypeScript;
- presentation/Investigation component regressions for changed surfaces;
- C0 semantic freeze;
- governed product regression;
- full `test:release-1.0`;
- exact immutable build provenance before NEXT deployment.

## 21. Do-not-do list

Do not:

- reset or discard the three dirty Product files;
- assume public NEXT contains `c3981050`;
- deploy from a dirty tree;
- touch Production/51xx;
- start Native E3/E4 before owner Web acceptance;
- globally replace Vietnamese words across `vi.json` without checking English source;
- import all `erpnext2vi` translations blindly — ERPNext module context can differ from LightBI BI context;
- translate established technical terms merely to maximize Vietnamese percentage;
- add language-coverage debt back to the baseline;
- weaken semantic QA to make an awkward translation pass;
- modify Understanding/Data semantics, SQL, formula, join, evidence or metric authority as part of language work;
- claim the exact public CPR-8 C9 rerun is complete unless it is actually rerun on the final deployed candidate;
- call the i18n task finished merely because 19/19 focused tests pass.

## 22. Useful paths and artifacts

Product repo:

`/home/ubuntu/n8n2erpnext/LightBI-dpr0-contract-freeze`

Docs repo:

`/home/ubuntu/n8n2erpnext/LightBI-bada-docs-20260903`

ERPNext Vietnamese reference:

`/home/ubuntu/n8n2erpnext/erpnext2vi`

Current live immutable NEXT root:

`/home/ubuntu/services/lightbi-next-web/cpr8-chart-presentation-d778ce75`

Public NEXT:

`https://lightbi-next.thaiduy.digital/app/`

CPR-7 raw/audit artifacts still referenced by the durable walkthrough live mainly under:

- `/tmp/lightbi-chart-audit-20260910/`
- `/tmp/lightbi-chart-audit-20260912/`

Treat `/tmp` artifacts as reproducibility aids, not canonical truth; durable acceptance summary is the CPR-7 walkthrough.

## 23. Current Git commands that prove the stop state

Product:

```bash
cd /home/ubuntu/n8n2erpnext/LightBI-dpr0-contract-freeze
git --no-pager log --oneline -15
git status --short
git diff --stat
git diff --check
```

Expected top commits:

```text
c3981050 fix(i18n): refresh Vietnamese product language
d778ce75 fix(cpr8): suppress equivalent date presentation duplicates
38680c7b fix(cpr7): close runtime chart presentation debts
acbe1523 test(cpr6): prove browser drill to step2
3b832ab1 feat(cpr6): close chart palette and drill UX
d94ba2da feat(cpr5): plan governed compound visuals before execution
cbfbf516 feat(cpr4): plan evidence-backed 1 3 5 visual stories
4d20c257 feat(cpr3): give micro brain bounded presentation vote
15502469 feat(cpr2): materialize role-aware presentation capabilities
9d4a0ce9 fix(cpr1): actuate official domain visual policy
ddff2f28 test(cpr0): freeze chart presentation actuation debt
```

Expected dirty status at handoff:

```text
 M apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx
 M apps/desktop/src/i18n/language-semantic-quality.test.ts
 M apps/desktop/src/i18n/languages/vi.json
```

## 24. Why the current Product tree must not be reset to the live SHA

The live `d778ce75` candidate is the last verified chart-presentation deployment, but localization work continued afterward.

`c3981050` is pushed and contains the first major Vietnamese product-language refresh, including:

- expanded synchronized catalogs;
- empty i18n debt baseline;
- i18n README source-aware semantic policy;
- semantic-quality test infrastructure;
- multiple UI surfaces brought under translation coverage.

The dirty worktree then adds the owner's latest exact helper and a second semantic-QA pass.

Resetting to `d778ce75` would destroy both a committed i18n phase and unfinished reviewed language work.

## 25. Translation philosophy to preserve

The successor should optimize for **Vietnamese a real analyst/operator would expect to read**, not for literal bilingual symmetry.

Preferred characteristics:

- short UI labels are concise and idiomatic;
- business nouns use Vietnamese industry vocabulary;
- explanatory prose reads like product copy, not translated technical documentation;
- safety/evidence wording remains precise without sounding bureaucratic;
- causality boundaries remain explicit but natural;
- English technical product terms remain English when Vietnamese wording is less clear;
- the same English source is translated consistently unless domain context intentionally differs;
- domain context is determined from the English source and rendering location, never by replacing Vietnamese substrings globally.

This is the main lesson from `erpnext2vi` and the main owner expectation for LightBI.

## 26. Final stop-state summary

As of this handoff:

- Chart Presentation Plane CPR-0→CPR-7 is source-closed with broad runtime evidence.
- CPR-8 exact immutable NEXT candidate `d778ce75` is live and stable on public NEXT.
- S02 epoch-ms↔ISO duplicate trend blocker is fixed and public stability-proven 3/3.
- One final public-candidate C9 click-through rerun remains formally pending if exact CPR-8 closure is required.
- Product repository has advanced to pushed i18n commit `c3981050`.
- Product worktree has exactly three important uncommitted i18n/UI files; do not reset them.
- Current English/Vietnamese catalogs each contain 3224 messages.
- i18n coverage debt baseline is zero.
- current dirty semantic-QA pass is green at **3 files / 19 tests PASS**.
- `Click to view or export` / `Nhấp vào để xem hoặc xuất` exists in both catalogs and is wired into the dirty BusinessComparison evidence-export UI.
- Vietnamese semantic QA is **not finished**; a broad natural-language review remains the immediate task.
- Production/51xx is untouched.
- Native E3/E4 has not been authorized by owner Web acceptance.

The next session should resume at §19 Step A and continue the i18n semantic review from the current dirty worktree, not restart CPR chart work and not re-derive the localization architecture.
