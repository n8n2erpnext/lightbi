# Milestone 4: Guided Home Experience & Conversational Entry Point

## Status: Completed

## Objective
Transform the Home page from a traditional BI starting screen into a guided, conversational workspace. The experience is designed to abstract away all technical BI terminology (Data Sources, Connectors, Dashboards) and guide users naturally toward answering their questions. The Home page itself acts as the onboarding experience.

## Implementation Details

### Conversational Entry Point (Plus Menu)
- The explicit "Import Data" button has been removed.
- Introduced a unified `[ + ]` menu embedded within the search bar area.
- This menu exposes guided data actions:
  - Upload (CSV, Excel)
  - Connect (Database, ERPNext)
  - Examples (Sample Sales Data, Inventory, Survey)
- The user is completely shielded from dataset management navigation. Everything happens in-place on the Home page.

### Progressive Onboarding States
The Home component handles three primary UX states to replace documentation with in-app guidance:

#### State 1: Fresh Launch (No Data)
- Displays a time-aware greeting ("Good morning 👋").
- Presents action-oriented business cards ("Analyze a sales report", "Understand inventory", "Build a dashboard"). No technical terms like "Dataset" or "Connector" are visible.
- Clicking any card immediately guides the user to select a data source.

#### State 2: Guided Intervention
- If a user selects an action without data, the system smoothly intervenes inline:
- Example: "To analyze a sales report, I need some data first. Choose a source:"
- Offers direct file upload options contextually.

#### State 3: Dataset Attached
- Displays a compact Dataset Summary Card showing schema context.
- Overrides static prompts with dynamic, short business-oriented suggestions (e.g., "Revenue Trend", "Top Customer") inferred from the schema.
- The execution pipeline instantly processes selected questions to render Charts and Insights without navigating to a dashboard page.

#### State 4: Post-Analysis
- After rendering a chart, the Home page continuously guides the user by appending a "What should I do next?" section at the bottom.
- Offers next-step explorations like "Compare by Customer", "Compare by Month", or "Create Dashboard".

### Content Architecture (Phase 4.2)
- Extracted all hardcoded business copy, suggestions, and rotating prompts from `Home.tsx` into a dedicated `content/home-guidance.ts` module.
- Prepared the Home UI for future internationalization (i18n) and localization by decoupling text from rendering logic.
- Enforced clean object structures without embedded JSX in the content configuration.

### Guided Workspace Redesign (Phase 4.3)
- Expanded the layout (`max-w-6xl`) to utilize desktop width and feel less like a sparse dashboard.
- Redesigned the Data Status card into a compact horizontal panel, preventing dataset metadata from dominating the view.
- Established "Suggested Actions" as the primary workflow layer when data is loaded, replacing technical feature lists with meaningful outcomes (e.g., "Build executive summary" instead of "Monthly Performance").
- Visually demoted "Quick Start" to "Explore more workflows" once data is loaded. This prevents it from competing with Suggested Actions, treating it as a secondary path rather than primary onboarding.
- Enhanced the "Recent Insights" placeholder sidebar to act as true workspace memory (with timestamps and descriptions), rather than floating cards, to anchor future persisted insight histories.
- Implemented "Audience-Aware Hero Chips" under the main input. Transitioned from static suggestions to dynamic audience pools with comprehensive coverage of 18 specific business personas and domains (e.g., retail, logistics, HR, ecommerce). Introduced a subtle algorithm that rotates exactly one chip at a time (pausing on input focus), making the workspace feel alive without distracting the user. The architecture is prepared for future routing based on logged-in user profile, project type, or detected schema.
- Defined the "Persona Selection Contract" (`selectHeroSuggestionPool`). Added robust metadata (signals and match priorities) to the 18 persona pools. The Home page now dynamically and deterministically routes users to the most relevant prompt pool based on detected data schema columns, while safely falling back to the default pool when no strong signals match. This lays the technical foundation for future full-fledged logged-in personalization.
- Applied "Category Dot Styling" to Hero Chips. Mapped prompt strings into structured `{ text, category }` objects and introduced a `heroChipCategoryStyles` mapping. Each chip now displays a subtle, category-specific colored dot (with a matching background tint on hover). This avoids the heavy visual noise of full colored pills (which often imply workflow status) while providing clear visual grouping hints for the different personas. Unknown categories gracefully fall back to a neutral general styling.
- Introduced "Dataset Capability Detection with Explanation Microcopy". Created `detectDatasetCapabilities` to deterministically infer what kinds of analysis are possible (e.g. Revenue Analysis, Sales Trends) based on column naming conventions. This engine returns structured evidence mapping capabilities to the specific columns that triggered them. Added a "Detected Opportunities" section with chips that use native tooltips to display a plain-English description of the capability along with the column evidence (e.g., "Detected from: revenue, total_amount"). This visually communicates to users that LightBI understands their data before any questions are asked, building trust without overwhelming them with raw schemas.
- Implemented the "Suggested Action Preview Contract". "Suggested Actions" are now capability-aware, dynamically updating to offer highly relevant domain actions. Clicking an action no longer blindly triggers the analysis. Instead, it expands an inline preview panel detailing the specific question LightBI will run, the columns it intends to use, and the expected output. This sets explicit expectations and provides transparency before execution.
- Redesigned the "Add Data (+)" Menu into a strict 2-Level Navigation structure. The top level now only shows 4 human-centric categories: "My Computer", "Online Data", "Systems", and "Sample Data". All technical integration options (like PostgreSQL, Excel, APIs) are hidden within animated drill-down submenus. This design reduces cognitive load and makes the menu instantly scannable, while utilizing specific product-aligned icons (e.g., Table for Google Sheets, Code for APIs).
- Established the "Data Intake Contract" via `data-intake.ts`. Every Add Data menu selection now normalizes into a structured `DataIntakeRequest` containing a `sourceKind`, `sourceType`, and an explicit `nextStep`. This maintains a human-centric UI while providing deterministic, technical metadata to the underlying data import pipeline without hardcoding business logic in the view layer.
- Implemented the "Unified Data Intake Drawer" to replace intrusive inline alerts and connection panels. Designed as a top-down sliding overlay with a subtle backdrop blur, it serves as a focused orchestrator for specialized configuration steps (`GoogleSheetsStep`, `DatabaseStep`, `ApiStep`, `WarehouseStep`). This modular architecture cleanly scopes future complexities (such as OAuth or test connection checks) entirely outside of the core `Home` component.
- Implemented the "Dataset Intake Summary Layer" as an intermediary step between source connection and analysis. The new `DatasetSummaryStep` surfaces dataset metadata (rows, columns), detected measures, detected dimensions, and semantic opportunities directly after connection configuration. It dynamically reuses existing capability detection logic to reinforce the product philosophy that "LightBI understands your data" before moving to query building.
- Implemented "State-Aware Home Behavior". Abstracted all state-conditional text into a new `homeStates` structure within `home-guidance.ts`. The UI hierarchy now explicitly adapts to three core states: No Data (prioritizes onboarding actions and empty states), Data Loaded (prioritizes schema-aware smart suggestions), and Analysis Ready (prioritizes contextual follow-up explorations).
- Ensured the overarching paradigm explicitly shifts from Dataset → Dashboard to Goal → Data → Answer.

### 3. Inline Link Intake & Question-First Architecture
- Strictly separated the state into `analysisIntent` ("What do you want to understand?") and `dataAttachment` ("What data should LightBI use?"). This enforces the Question-First architecture, ensuring that pasting a URL never overwrites the user's primary analysis intent.
- **Source Preflight Architecture**: Implemented a strict 4-boundary pipeline in `source-preflight.ts`:
  1. **SourceCandidate** – URL recognized as a valid format. `createSourceCandidate()` validates URL structure (e.g. must be `docs.google.com/spreadsheets/d/{non-empty-id}/...`). Returns `invalid_format` or `unsupported` for non-conforming URLs. A candidate is NOT a dataset.
  2. **Source Preflight** – User explicitly clicks "Check source" to trigger `runSourcePreflight()`. The mock preflight is deterministic: `public-demo` → accessible, `private`/`denied` → access_denied, `empty` → no_data, all other URLs → not_found.
  3. **Dataset Reference** – Only if preflight returns `status: "accessible"` does the UI offer "Use this dataset".
  4. **currentDataset** – Set **only** after user explicitly clicks "Use this dataset". `currentDataset.status` must equal `"ready"` for capability detection, suggestions, and analysis to be enabled.
- **No Fake Metadata**: All frontend code that previously generated fake rows, columns, or capabilities from URL patterns has been removed.
- **Architectural Rule**: `createSourceCandidate()` alone NEVER creates a dataset. Only `runSourcePreflight()` returning `accessible` + user confirmation creates `currentDataset`.

### Architecture Continuity
- Built entirely upon the existing `resolve_current_source` and `CurrentSourceSession` capabilities implemented in Milestone 3.
- No new LLMs, AI agents, or backend routes were added. The conversational feel is achieved purely through stateful progressive disclosure on the frontend.
