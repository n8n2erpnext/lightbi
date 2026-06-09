# Milestone 2: Question First Landing Experience

## Goal
Demonstrate the Question → Template → Chart → Insight pipeline in a seamless user experience, proving the "Question First" analytical philosophy of LightBI.

## Summary of Work
Replaced the traditional dashboard-centric landing page with a calm, analytical workspace centered around a natural language prompt ("What do you want to understand today?"). When a user asks a question, the application visually walks them through the core LightBI pipeline, rendering a deterministic template match, generated chart, and text-based insight.

### Added Files
- `apps/desktop/src/pages/Home.tsx`: The new Question-First landing page containing the search interface, suggested questions, and the visual pipeline rendering logic.
- `docs/progress/milestone-2-question-first.md`: This progress documentation file.

### Modified Files
- `apps/desktop/src/routes/index.tsx`: Re-routed `/` to point to `Home`, and moved the existing `Dashboards` component to `/dashboards`.
- `apps/desktop/src/components/layout/AppLayout.tsx`: Added the `Home` link to the primary navigation sidebar.
- `apps/server/src/main.rs`: 
  - Added `QuestionTemplateRegistry` initialization and registered a mock `trend-template`.
  - Added the `POST /api/question/ask` endpoint to orchestrate the pipeline from text question to final payloads.
- `crates/lightbi-question/src/classifier.rs`: Updated the mock `classify` method to return a deterministic `TemplateCandidate` instead of `None`, allowing the pipeline to proceed without AI.

### Removed Files
- None.

## Architectural Shortcuts & Known Limitations
- **No AI / Deterministic Classifier**: The `QuestionClassifier` currently bypasses AI logic entirely and forcefully returns a high-confidence match for a specific `trend-template` regardless of the user's input.
- **Execution Hardcoding**: The `ask_question` backend endpoint currently bypasses dynamic query generation. It forcefully constructs a hardcoded ExecutionPlan that reads from `sales.csv`, mirroring the exact logic used in Milestone 1's chart generation.
- **Mock Insight Generation**: The `InsightPayload` returned by the server contains hardcoded text referencing the user's question, rather than dynamically analyzing the ResultSet.
- **UI Constraints**: Explicitly adopted Frappe Insights style for the landing page without introducing new structural patterns. Blue accents were deliberately removed in favor of gray/zinc palettes, and charts/cards enforce neutral styling to emphasize the analytics, not the interface itself.

## UI Decisions & Notes
- **App Shell & Layout**: The main interface is built upon a left-aligned, fixed sidebar against a `bg-white` and `bg-gray-50` backdrop with thin gray borders, avoiding heavy shadow layers or bright accents.
- **Question First Workflow**: The home screen centers immediately on the prompt "What do you want to understand today?".
- **Pipeline Rendering**: The pipeline sequence (Question → Template → Chart → Insight) is presented as a minimal horizontal card sequence rather than vibrant individual blocks.
- **Color Discipline**: Avoided using primary colors (like blue) for main actions, adopting `gray-900` or `black` instead. Accent colors (specifically `emerald-600`) are isolated strictly for metric status reporting (such as confidence scores).
- **Typography & Cards**: Used an Inter-like standard sans font, removing any gradients or colorful card backgrounds. All UI elements utilize transparent or subtle gray borders by default.

## Stabilization Pass Notes
- **Color Consistency**: Stripped out remaining `bg-blue-600` primary and `text-blue-600` secondary styles from nested pages (`Dashboards`, `DashboardBuilder`, `Charts`, `ChartBuilder`, `Datasets`, `DataSources`), ensuring a globally locked gray/zinc palette.
- **Analytical Layout Density**: Refactored `DashboardBuilder` and `Dashboards` to mirror the compact, dense layout of Frappe Insights. Reduced padding, tightened typographic hierarchy (e.g. `text-[13px]`, `text-[11px] uppercase`), softened shadows, and standardized on white backgrounds with thin gray borders to enforce an analytical workspace feel rather than a SaaS marketing look.
- **Crash Fixes**: Addressed "Maximum update depth exceeded" infinite loops in React 18 strict mode on `/charts`, `/datasets`, and `/datasources`. The root cause was `useAppRuntime(s => Object.values(s.items))` recreating arrays on every render. Fixed by selecting the object first (`useAppRuntime(s => s.items)`) and mapping it in the component body.
- **Crash Fixes**: Addressed "Maximum update depth exceeded" infinite loops in React 18 strict mode on `/charts`, `/datasets`, and `/datasources`. The root cause was `useAppRuntime(s => Object.values(s.items))` recreating arrays on every render. Fixed by selecting the object first (`useAppRuntime(s => s.items)`) and mapping it in the component body.
- **Error Boundaries**: Implemented a `<RouteError />` fallback at the root level of `react-router-dom` using LightBI's neutral design, preventing raw stack traces from crashing the entire app shell during unforeseen errors.
- **UI Baseline Lock**: The visual rules (colors, density, typography, and forbidden patterns) established during this stabilization pass have been permanently documented in `docs/design/ui-baseline.md` to prevent future drift.
- Backend compiled successfully (`cargo check -p lightbi-server`).
- Frontend built successfully (`npm run build`).
- Running the application locally demonstrated the pipeline UI correctly rendering the Question, Template, Chart, and Insight components in sequence.
