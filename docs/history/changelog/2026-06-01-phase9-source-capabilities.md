# Development Log: Phase 9 - Source Capability Architecture

**Date:** 2026-06-01
**Phase:** Phase 9 Source Capability Architecture

## Summary
Defined a universal capability model for all data sources in LightBI. Because the application interacts with vastly different backend systems (from local static CSVs to highly functional Postgres databases), the engine requires a strict schema to prevent hardcoded optimization paths.

## Architecture Decisions
- **ADR-017 (Source Capability Model):** Dictated that every datasource explicitly declares what it can do (`supportsPushdownAggregation`, `supportsFileWatch`, etc.). The Planner must blindly trust these capability flags rather than hardcoding connector-specific behavior.
- **ADR-018 (Connector Contract):** Formalized that all future connectors must adhere to a strict structure (`metadata`, `schema`, `capabilities`, `health`). The absolute rule is that connectors contain no business logic, no chart logic, and no planning logic.

## Schema Decisions
- Created `packages/core-types/src/capabilities.ts`.
- Introduced `SourceCapabilities` to formally catalog feature flags like `supportsRefresh`, `supportsSchemaDiscovery`, and `supportsIncrementalSync`.
- Introduced `ConnectorContract` housing `ConnectorMetadata`, `ConnectorSchema`, and `ConnectorHealth`.

## Execution and AI Boundary
- AI cannot override capabilities. The AI reads these capabilities to constrain its generated recipes, but the connector remains the definitive source of truth.
- As per the architectural directive, no actual connectors or execution logic were built.
