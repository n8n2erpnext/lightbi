# Implementation Plan: Global Display Preferences

## 1. Feature Direction
This feature introduces a global, unified system for formatting data values (numbers, currency, dates, times) across LightBI. The goal is to provide a highly customizable presentation layer without corrupting the underlying semantic or execution data.

## 2. Core Principles
1. **No Raw Data Mutation**: Raw datasets remain perfectly intact.
2. **No Semantic Mutation**: Canonical row projections remain standard JS primitives.
3. **No SQL Mutation**: The SQL generator and executor (`safe-sql-preview.ts`, `local-duckdb-executor.ts`) will never embed formatting (like commas or currency symbols).
4. **Presentation Only**: Formatting is applied strictly at the React render layer just before pixels hit the screen.

## 3. Architectural Design

### 3.1 Where Settings State Lives
The global display preferences will live in a **Zustand Store** (e.g., `apps/desktop/src/stores/display-preferences-store.ts`). This allows any React component to instantly subscribe to preference changes (like switching to Accounting mode) and instantly re-render without prop-drilling.

### 3.2 Where the Formatter Engine Lives
A pure utility module (e.g., `apps/desktop/src/lib/display-formatter.ts`) will house the actual formatting logic. It will export functions like `formatValue(val, semanticType, preferences)` utilizing JavaScript's native `Intl.NumberFormat` and `Intl.DateTimeFormat` APIs.

### 3.3 Semantic Field Identification
To know *how* to format a value, the formatter needs to know *what* it is. This relies on the `dataset-understanding` contract. We will extend column metadata to include basic semantic types:
- `plain_number`
- `currency`
- `date`
- `time`
- `datetime`

## 4. Rollout Strategy

### 4.1 Screen Priority
1. **Phase 1: Investigation Table (Highest Priority)** - The raw data table is the easiest place to validate formatting correctness across hundreds of rows.
2. **Phase 2: Chart Labels/Tooltips** - Integrating the formatter into the charting library (Recharts/Echarts).
3. **Phase 3: Home Summaries & Dashboards** - Applying formatting to KPI cards and overview metrics.

### 4.2 Scope Boundaries (MVP vs Full i18n)
- **Included in MVP**: Formatting the *data values* inside tables and charts according to locale (e.g., `1.000,50` vs `1,000.50`).
- **Excluded in MVP**: Translating application UI strings (Buttons, Menus) and Right-to-Left (RTL) layouts for `ar-SA`. The app UI remains English LTR, while Arabic data renders as Arabic numbers/dates.

## 5. Next Steps
The next coding phase will strictly focus on building the Zustand store, the `display-formatter.ts` engine, and wiring it purely into the Investigation Table.
