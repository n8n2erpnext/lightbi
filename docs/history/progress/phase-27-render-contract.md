# LightBI Phase 27 - Frontend Rendering Contract Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-053 (Rendering Contract Architecture)**: Established the absolute boundary between the backend and the frontend. The frontend is not allowed to consume internal backend domain objects. It must consume specifically modeled UI-safe `Payloads`.
- **ADR-054 (Frontend Asset Model)**: Mandated that `Payloads` are strongly typed and versioned. We utilized the `ts-rs` crate to automatically generate TypeScript bindings from the Rust Structs.

## Rust Implementation (`lightbi-render-contract`)
- Created `crates/lightbi-render-contract` to serve as the API boundary layer.
- Modeled `PayloadVersion`.
- Modeled UI-safe presentation structs: `DashboardPayload`, `WidgetPayload`, `ChartPayload`, `InsightPayload`, and `ExportPayload`.
- Implemented `#[derive(TS)]` on all payloads to enable automatic code generation for the frontend.
- Added a `generate_ts` test to automatically build the `.ts` interface files.

## Extensibility & Persistence
- There are no database migrations for this phase, as payloads are transient API wrappers generated dynamically at request-time.

## Next Steps
- We will configure the workspace to automatically pipe the generated TypeScript bindings into `packages/core-types` so the frontend application can build upon them.
