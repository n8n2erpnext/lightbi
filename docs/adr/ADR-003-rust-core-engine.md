# ADR-003 Rust Core Engine

Status:
Accepted

Context:
As a local-first desktop application, LightBI needs to perform heavy data processing, query execution, and secure credential storage natively. JavaScript/TypeScript in a typical Electron or Tauri frontend is not sufficient for heavy data lifting (e.g., DuckDB integration) and secure system-level operations.

Decision:
Business logic lives entirely in Rust. React is strictly for the UI layer. 
Rust owns the following responsibilities:
* Project management
* Datasource management
* Dataset processing
* Connector execution
* Persistence
* Synchronization
* Credential storage

Consequences:
* Better performance for data crunching.
* Better multi-platform support leveraging Rust and Tauri.
* Cleaner separation of concerns between presentation and business logic.
* Long-term maintainability.
