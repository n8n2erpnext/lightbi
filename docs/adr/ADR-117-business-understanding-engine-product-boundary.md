# ADR-117: Business Understanding Engine Product Boundary

**Date:** 2026-06-28  
**Status:** Accepted

## Context

LightBI has converged on a product identity that is broader than a dashboard builder and more disciplined than an AI-first analyst.

The product direction is:

```text
Raw Data
-> Import
-> Understand
-> Clean / Standardize as non-destructive overlay
-> Trust Score
-> Dashboard / KPI / Insight
-> AI Report, optional
```

LightBI is a **Business Understanding Engine**. It turns raw or semi-clean data into trusted, explainable information that people can use for decisions.

LightBI must not be positioned as only:

- a BI tool;
- an AI dashboard;
- an ETL tool;
- a chat-with-database interface.

The core value is **understanding**:

```text
Raw Data
-> Trusted Information
-> Better Decisions
```

## Decision

LightBI will keep one shared understanding core and expose it through two primary product surfaces:

1. **Simple Mode**
   - The BA / decision workspace.
   - For users who do not know SQL, DAX, Power BI, pivot tables, or data modeling.
   - It imports data, understands what is inside, evaluates trust, mines insights, recommends charts, and prepares decision briefs.

2. **Advanced Mode**
   - The DA / power-user workspace.
   - It should compete with TablePro-level data workspace capability: SQL, Mongo, files, online sheets, grid pro, import/export, schema/structure inspection, writeback review, and plugin-driven providers.
   - Its differentiator is that results can flow back into LightBI's Simple Mode for trust scoring, BA decision briefing, charting, and dashboards.

AI is not a primary mode of truth. AI is an optional final layer that reads LightBI-generated artifacts and writes reports or explanations.

## Product Boundary Rules

### 1. AI does not read raw data directly

AI may read:

- dataset understanding artifacts;
- trust scores and score breakdowns;
- chart/KPI/result summaries;
- structured insights;
- caveats and evidence pointers;
- dashboard state;
- export/report artifacts.

AI must not be responsible for:

- raw data profiling;
- KPI computation;
- query execution;
- trust scoring;
- data cleaning;
- source mutation.

Rule:

```text
AI reads LightBI understanding.
AI does not invent understanding from raw data.
```

### 2. Clean and standardize are non-destructive

LightBI must not silently modify the user's original files, online sheets, or databases.

Allowed:

- mapping overlays;
- canonical aliases;
- inferred data types;
- normalized runtime views;
- presentation formatting;
- reviewable SQL or import/export artifacts;
- reversible user-approved mappings.

Not allowed:

- silent source overwrite;
- automatic destructive cleanup;
- hidden type coercion that changes user data;
- pretending dirty data is clean.

### 3. Dashboard and charts are outputs, not the product center

Charts, dashboards, and KPI cards exist to communicate what LightBI understood.

They must remain tied to:

- source lineage;
- trust score;
- insight evidence;
- data caveats;
- refresh/runtime provenance.

LightBI does not sell charts. LightBI sells understanding.

### 4. Advanced Mode remains strategically important

Advanced Mode should not be reduced or deprioritized because of the Business Understanding Engine direction.

Instead:

```text
TablePro-level Advanced workspace
+ Simple Mode Business Understanding Engine
= LightBI differentiation
```

Advanced Mode must stay connected to the shared core:

- Advanced can open Simple-understood sources without re-profiling from scratch.
- Advanced result buffers can become temporary Simple datasets.
- Advanced filters/queries can feed `Analyze in Simple` / `Create Decision Brief`.
- Saved charts from Advanced must carry real result artifacts, not mock data.

### 5. Plugin-first system expansion

Core should not absorb every enterprise system directly.

Core owns:

- understanding;
- trust and decision readiness;
- BA insight and chart recommendation;
- shared Simple/Advanced result contracts;
- safety policies;
- common built-in providers.

Plugins own provider-specific connection, schema, query, import/export, DDL, and diagnostics behavior.

## Editions Boundary

Edition boundaries are product packaging rules, not runtime truth rules.

- **Basic / Open Source**
  - Local-first file and online-link understanding.
  - Clean/standardize overlays.
  - Trust score, dashboard, charts, insights, export.
  - Community plugin SDK.
  - No account required.

- **Pro / Lifetime**
  - Basic plus database connectors, Advanced Mode, AI Report, project history/backup, cloud drive backup targets, and advanced plugin SDK.

- **Ultra / Team**
  - Pro plus team project package, shared folder workflow, scheduled reports, enterprise templates, white-label reports, batch processing, team/premium plugins, and offline team workspace.

## Consequences

### Positive

- Simple Mode becomes the product differentiator.
- Advanced Mode can compete with TablePro while still feeding LightBI's BA engine.
- AI remains useful without becoming an untrusted source of truth.
- The system can support dirty data and clean ERP exports using the same pipeline.

### Negative

- Some BI/dashboard features must wait until the understanding artifact is strong enough.
- Some AI features must wait until structured report inputs exist.
- Provider expansion must go through plugin contracts instead of quick UI-only dropdowns.

## Invariant

Every major feature must answer at least one of these questions:

1. Does it help LightBI understand data better?
2. Does it make trust/readiness more truthful?
3. Does it turn understood data into better decisions?
4. Does it let Advanced results return to the Simple BA loop?
5. Does it extend source coverage without weakening the core?

If the answer is no, it is not core LightBI work.
