# LightBI Product Direction and Pricing Strategy

**Version:** Draft v1.0  
**Date:** 2026-06-28  
**Purpose:** Product vision, packaging, and development guideline.

## Vision

LightBI is not only a BI tool and not an AI dashboard.

LightBI is a **Business Understanding Engine** that turns raw data into trusted information for human decisions.

AI is optional and appears at the end of the pipeline as a reporting and explanation assistant. AI does not own data analysis or truth.

## Core Pipeline

```text
Raw Data
-> Import
-> Understand
-> Clean / Standardize as overlay
-> Trust Score
-> Dashboard / KPI / Insight
-> AI Report, optional
```

## Core Philosophy

LightBI owns:

- data import;
- structure understanding;
- semantic understanding;
- non-destructive cleaning and standardization overlays;
- data quality and trust scoring;
- KPI and insight computation;
- visualization and dashboard artifacts;
- decision briefing.

AI owns:

- report writing;
- dashboard explanation;
- weekly/monthly summaries;
- markdown/PDF/email/chat summaries;
- language polishing from structured LightBI artifacts.

AI does not own:

- raw data reading;
- KPI computation;
- trust scoring;
- query execution;
- data cleaning;
- source mutation.

## Product Modes

### Simple Mode

Audience:

- anyone who has data;
- non-technical users;
- operators, owners, managers, teachers, students, freelancers, researchers, and SME teams.

Workflow:

```text
Import
-> LightBI understands data
-> Trust score
-> Insight
-> Chart / Dashboard
-> Decision brief
-> Optional AI report
```

Simple Mode must not require:

- SQL;
- DAX;
- Power BI;
- Pivot;
- database knowledge.

### Advanced Mode

Audience:

- BA;
- DA;
- power users;
- technical operators.

Advanced Mode should compete with TablePro-level data workspace capabilities:

- SQL and Mongo workspace;
- local files and online sheets;
- database connectors;
- grid pro interactions;
- advanced filtering;
- import/export;
- schema and structure inspection;
- writeback review;
- custom KPI, formulas, calculated fields;
- visualization control;
- plugin-driven providers.

LightBI differentiates because Advanced results can flow back to Simple Mode:

```text
Advanced query/filter/edit/import
-> result buffer
-> Analyze in Simple
-> Trust / Insight / Chart / BA Decision Brief
```

## Product Editions

### Basic / Open Source

Goal:

Make data understandable for everyone.

Includes:

- local-first use;
- CSV, Excel, JSON, TSV, TXT;
- online file links;
- clean and standardize overlays;
- trust score;
- dashboard;
- charts;
- insight;
- export;
- community plugin SDK.

Does not include:

- database connectors;
- AI report;
- project history;
- cloud backup.

Rules:

- no account required;
- no server required;
- user owns data.

### Pro / Lifetime

Goal:

Professional users and solo power users.

Includes Basic plus:

- database connectors;
- PostgreSQL;
- MySQL;
- SQL Server, when plugin-ready;
- MariaDB;
- SQLite;
- Advanced Mode;
- AI Report;
- project history;
- project backup;
- Google Drive backup;
- OneDrive backup;
- iCloud backup;
- advanced plugin SDK.

Suggested price:

```text
49-59 USD lifetime
```

Rule:

No subscription for Pro.

### Ultra / Team

Goal:

Small businesses and small teams.

Includes Pro plus:

- 5 users;
- team project package;
- shared folder workflow;
- scheduled report generation;
- enterprise templates;
- white-label report;
- batch processing;
- team plugin;
- premium plugin;
- offline team workspace.

Suggested price:

```text
149 USD / year / 5 users
```

Does not initially require:

- server;
- realtime collaboration.

Future cloud infrastructure may add:

- user management;
- permissions;
- shared dashboards;
- audit log;
- cloud workspace.

## Local-First Rule

LightBI prioritizes:

```text
Local
-> User owns data
-> Optional cloud backup
```

Cloud is optional and used for:

- backup;
- project sync;
- history;
- team workspace when available.

Cloud must not become required for basic understanding.

## Plugin Strategy

Plugin is the long-term system expansion strategy.

Examples:

- ERPNext;
- Odoo;
- SAP;
- Oracle;
- MISA;
- KiotViet;
- Shopee;
- Haravan;
- Google Analytics;
- Facebook Ads;
- SQL Server;
- BigQuery;
- Snowflake;
- DynamoDB.

Community and premium providers should extend LightBI without bloating core.

## Positioning

LightBI is not positioned as:

- AI Dashboard;
- classic BI Tool;
- ETL;
- Chat with Database.

LightBI is positioned as:

```text
Business Understanding Engine
```

Core value:

```text
Raw Data
-> Trusted Information
-> Better Decisions
```

LightBI does not sell charts, dashboards, or AI. LightBI sells understanding.
