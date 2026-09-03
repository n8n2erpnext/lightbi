# Focus Subject Analysis — experimental design

Status: draft / owner-approved experiment
Date: 2026-09-03
Scope: Optional pre-analysis focus context for existing LightBI perspective/question flow.
Supersedes: none
Superseded by: none
Primary sources: [ADR-082](../adr/ADR-082-perspective-before-question.md), [ADR-088](../adr/ADR-088-signal-driven-perspective-generation.md), [Question Context](../architecture/question-context.md), [Project Book](../project-book/LIGHTBI_PROJECT_BOOK.md)

## 1. Purpose

LightBI already answers the question "What can this dataset reliably analyze?" through canonical understanding, evidence-backed perspectives, questions, governed plans, charts and Deep BA.

The experiment adds one optional user declaration before perspective execution:

> "What specific entity in this dataset do I want the analysis to revolve around?"

This is **Focus Subject**, not a destructive dataset filter.

## 2. Non-negotiable compatibility rule

When no Focus Subject is selected, every existing LightBI flow must behave exactly as the frozen NEXT/R1-P13 baseline.

Existing Perspective/Question selection, chart generation, Deep BA, chart-click Step 2, History, export, Advanced/Easy continuity and runtime governance retain their current authority.

The experiment is additive only. It must not create a second BA engine or replace existing perspective/question generation.
## 3. Core semantics

A Focus Subject is an evidence-backed entity value selected from the already-understood source, for example employee `24128 — Thái Đăng Duy`, SKU `A123`, branch `HCM01`, warehouse `WH-02`, or customer `C00128`.

The selection creates analysis context while preserving the comparison population. It MUST NOT translate into `WHERE entity = focusValue` for the primary analysis population.

The initial context shape is conceptually:

```text
focusSubject = { field, value, displayLabel, sourceIdentity, evidence }
comparisonPopulation = full governed source
```

The same selected perspective/question remains authoritative. Focus Subject changes the question's context, not its identity or execution authority.

## 4. Focus-first analytical behavior

When a Focus Subject exists, analytical presentation should revolve around it where the selected plan has compatible evidence:

- subject value versus population average;
- subject position/rank/percentile where meaningful;
- subject versus Top N and Bottom N;
- metric deltas and contributing drivers;
- nearest/similar peers only when evidence supports a defensible cohort;
- distribution/chart context with the subject highlighted rather than removing the population.

Unsupported comparisons must remain absent or explicitly unavailable. Focus must never manufacture a metric, peer group, entity identity or causal explanation.
## 5. UX contract

The existing question/perspective step remains intact. A new optional layer appears nearby:

`Choose a focus (optional)` → search/select an evidence-backed entity → continue with the existing perspective/question choices.

The control should expose useful display context when available, for example `24128 — Thái Đăng Duy`, without requiring the user to know raw column names.

The first experiment supports one Focus Subject at a time. Comparison cohort selection remains automatic/full-population initially; advanced cohort selection such as same tenure, same region or same role is a later additive extension.

Chart-click Deep BA Step 2 remains valid. Pre-analysis Focus Subject and post-chart selected-data scope must share compatible context vocabulary but remain distinct lifecycles so one cannot leak into the other.

## 6. Candidate eligibility

Focus candidates must be derived from current understanding evidence. Prefer entity/dimension fields that have stable, low-ambiguity values and useful labels.

Numeric measures such as revenue, score, amount or quantity are not Focus Subjects merely because they contain distinct values.

Candidate inference may combine identifier-like fields with label/name fields when evidence supports the pairing, but the experiment must not depend on a domain-specific employee schema.

## 7. Experimental branch and roadmap freeze

Road-to-1.0 execution is temporarily frozen at public NEXT R1-P13 baseline `827ac888350193c7aac6c3a577b7411378e4a1c8` while this experiment is evaluated.

Implementation must live on a separate branch/worktree derived from that exact NEXT baseline. It must not mutate `main`, CURRENT, Production, or the frozen R1-P13 branch.

The experiment cannot merge back merely because tests pass. Owner UX acceptance is required.
## 8. Merge-back acceptance gate

Before any merge into the Road-to-1.0 NEXT lane, the experiment must prove all of the following:

1. no-focus output is regression-equivalent to the frozen baseline;
2. Focus Subject selection never removes the governed comparison population;
3. subject identity and display label are deterministic from source evidence;
4. subject/average/Top-N/Bottom-N comparisons are deterministic and evidence-bound;
5. existing chart-click Step 2 remains isolated and correct;
6. full release-authoritative tests remain green;
7. a real owner dataset proves the intended workflow, including employee `24128` in the 2,200-row management-ranking workbook;
8. owner UAT accepts the interaction and analytical usefulness.

If the experiment fails these gates, discard or continue the branch without modifying the frozen R1-P13 roadmap baseline.

## 9. Initial non-goals

- no arbitrary multi-filter builder;
- no replacement of Quick Filters or chart drill-through;
- no multi-subject comparison UI in the first pass;
- no causal claims from correlation;
- no account/user identity coupling to dataset subjects;
- no new server/control-plane authority;
- no Production deployment or role rotation.