# LightBI

<p align="center">
  <strong>Evidence-governed business analysis for real operational data.</strong>
</p>

<p align="center">
  <a href="https://lightbi.thaiduy.digital">Live demo</a> ·
  <a href="https://github.com/n8n2erpnext/lightbi/releases">Download Beta</a> ·
  <a href="README.vi.md">Tiếng Việt</a>
</p>

<p align="center">
  <img alt="LightBI Beta" src="https://img.shields.io/badge/status-public_beta-f2b705">
  <img alt="Desktop" src="https://img.shields.io/badge/desktop-Windows-2563eb">
  <img alt="Local first" src="https://img.shields.io/badge/analysis-local--first-059669">
  <img alt="Languages" src="https://img.shields.io/badge/UI-English%20%7C%20Vietnamese-7c3aed">
</p>

![LightBI home](assets/screenshots/lightbi-home.png)

LightBI turns spreadsheets, delimited files, online sheets, and databases into a governed business-analysis workflow. It profiles the physical source, resolves business meaning with traceable evidence, proposes safe questions, executes against the bound source, and keeps limitations visible from chart to dashboard.

It is built for the files people actually use: multi-sheet workbooks, inconsistent headers, mixed languages, operational exports, and related ERP reports that must not be joined by guesswork.

## Why LightBI

- **Understand before charting.** Physical profiling, semantic candidates, grain checks, readiness, and provenance run before an analysis is offered.
- **Governed execution.** Questions, metrics, dimensions, source identity, and runtime continuity stay bound through execution.
- **Deep BA, not a chart caption.** Findings follow a structured investigation frame: what happened, where, who, when, magnitude, unusual patterns, next checks, actions, and unknowns.
- **Drill into a subset.** Select a chart point, filter the supporting rows, and run the same Deep BA framework on that selected scope.
- **Safe multi-source analysis.** LightBI keeps sources separate unless relationship, role, period, identity, and duplication evidence support a governed route.
- **Local-first desktop runtime.** Local files are analyzed with embedded DuckDB; source data does not need to be uploaded to a remote analytics service.
- **From evidence to delivery.** Create dashboards, export Deep BA to PNG/PDF, export drill rows to CSV/Excel, and prepare cleaned data for downstream BI tools.

## Product tour

### Multi-sheet workbooks stay explicit

Every sheet is inspected independently. Users can analyze one sheet, select several sheets, or review the complete workbook without silently appending incompatible tables.

![LightBI sheet selection](assets/screenshots/lightbi-sheet-selection.png)

### Canonical understanding stays visible

LightBI shows the inferred data form, supported business domains, resolved signals, ready analyses, quality findings, and unresolved limitations before decision use.

![LightBI understanding](assets/screenshots/lightbi-understanding.png)

## Core workflow

```mermaid
flowchart LR
  A["Files · online sheets · databases"] --> B["Physical profiling"]
  B --> C["Semantic + grain evidence"]
  C --> D["Governed perspectives and questions"]
  D --> E["Bound DuckDB execution"]
  E --> F["Charts + BA decision brief"]
  F --> G["Subset Deep BA"]
  F --> H["Dashboard + governed exports"]
```

The canonical source boundary carries source identity, fingerprint, inspection/profile generation, row scope, semantic evidence, grain evidence, and runtime binding. Metric preflight and execution fail closed when required evidence or continuity is missing.

## Supported sources

| Source | Beta support |
|---|---|
| Excel `.xlsx` / `.xls` | Multi-sheet inspection and explicit sheet selection |
| CSV / TSV / text | Physical parsing, profiling, and local execution |
| JSON | Structured local inspection |
| Google Sheets / public online files | Online-first intake through the same canonical boundary |
| PostgreSQL, MySQL, MariaDB, SQLite, MongoDB | Advanced workspace; Easy Mode handoff requires complete results |
| Related ERP exports | Governed role/period analysis; no speculative joins |

## BA capabilities

- Revenue, sales performance, quantity, price, discount, mix, and profitability views
- Inventory position, movement, aging, concentration, stockout/overstock signals, and inbound/outbound imbalance
- Logistics volume, routes, hubs, carriers, status, service level, lead time, exceptions, and delivery cost signals
- Finance and accounting evidence including revenue, cost, gross profit, margin, receivable/payable, and period comparison
- Customer, employee, owner, branch, territory, product, material, warehouse, and other evidence-backed segmentation
- Progressive Deep BA with evidence rows, confidence, caveats, follow-up questions, and action candidates
- Single-source, filtered-subset, multi-period, and governed multi-source analysis

## Architecture

LightBI is a TypeScript + Rust monorepo:

```text
apps/desktop/          React 19 desktop and web QA interface
apps/server/           Embedded/standalone Axum backend and Advanced APIs
packages/              Shared UI, runtime, schemas, and query contracts
crates/                Rust domain, runtime, DuckDB, export, and Tauri crates
sample-corpus/         Sanitized governed semantic regression corpus
scripts/               Reproducible native build helpers
```

See [Architecture](docs/ARCHITECTURE.md), [Privacy model](docs/PRIVACY.md), and [Beta notes](docs/BETA.md).

## Run locally

### Requirements

- Node.js 22+
- pnpm 11.4+
- Rust stable (native desktop only)

```bash
pnpm install --frozen-lockfile
pnpm --filter @lightbi/desktop dev
```

Open `http://localhost:5173`.

### Validate

```bash
pnpm --filter @lightbi/desktop build
pnpm --filter @lightbi/desktop test
```

Some extended acceptance suites use private operational fixtures that are deliberately not published. The tracked `sample-corpus` contains sanitized fixtures for the public semantic and governance regression gates.

## Desktop Beta

Tagged releases are built on GitHub Actions using a Windows runner. The release contains:

- a per-machine NSIS installer;
- SHA-256 checksums;
- the exact source tag used to build the artifact.

Download the latest installer from [GitHub Releases](https://github.com/n8n2erpnext/lightbi/releases).

## Beta boundaries

- LightBI produces evidence-bound analytical findings, not autonomous business decisions.
- Causal language is withheld unless the available evidence supports it.
- Dashboards and investigation sessions are currently optimized for an active desktop session.
- Database Easy Mode requires a complete governed handoff; bounded/paginated results remain blocked for decision use.
- The public Beta targets Windows first. Web access is provided for evaluation.

## Security and privacy

Please read [SECURITY.md](SECURITY.md) before reporting a vulnerability. The local-first boundary and credential handling model are described in [docs/PRIVACY.md](docs/PRIVACY.md).

## Contributing

Small, evidence-backed contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Changes to semantic mappings, grain policy, metric authorization, or source continuity require tests that demonstrate both the intended match and an adversarial non-match.

---

LightBI is in public Beta. Expect active iteration, explicit limitations, and frequent evidence-driven improvements.
