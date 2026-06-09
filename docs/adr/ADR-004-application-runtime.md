# ADR-004 Application Runtime Layer

Status:
Accepted

Context:
As LightBI transitions into a robust local-first platform, UI components should not tightly couple with or own the domain state. Doing so leads to fragmented state, difficulties in testing, and complicates future integrations with the Rust backend. A dedicated layer is required to bridge the gap between the React frontend and the core domain objects.

Decision:
We introduce the Application Runtime layer as a dedicated subsystem (`packages/runtime`), functioning exclusively as the Frontend Runtime Adapter. React components will no longer directly own domain state or mock data. The Application Runtime becomes the single source of truth for active project state, active dashboards/charts, workspace preferences, and UI navigation state in the frontend.

Importantly, this Zustand store is NOT the permanent business runtime. It acts purely to bridge the React UI and the domain model during Phase 3, and will later delegate durable operations to the Rust core through Tauri commands. It must not become the source of truth for persisted data, nor contain data processing, connector execution, persistence logic, or query execution.

Consequences:
* Cleaner, more decoupled architecture where React UI consumes runtime state and Zustand owns frontend application state only.
* Prepares the frontend for future Tauri integration (the runtime store will act as the intermediary adapter to Rust commands).
* Rust core will unambiguously own durable project state and business logic in future phases.
* Easier unit testing of the UI state logic without rendering components.
