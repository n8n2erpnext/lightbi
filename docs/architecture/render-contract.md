# Rendering Contract Architecture Model

The Rendering Contract establishes the absolute boundary between the Rust backend (analytical core) and the TypeScript frontend (presentation layer).

## Architectural Flow

```mermaid
graph TD
    subgraph Backend Analytical Core
        DB[Dashboard Definition]
        C[Chart Definition]
    end

    subgraph Rendering Contract Boundary
        DB -->|Maps to| DPayload[Dashboard Payload]
        C -->|Maps to| CPayload[Chart Payload]
        
        DPayload --> TS[TypeScript Interface Generator]
    end

    subgraph Frontend Application
        TS -->|Enforces Types| React[React/Vue Component]
        React -->|Renders| View[User View]
    end
```

## Why a Contract?
If a React component directly reads the raw `ChartDefinition` from the database, the frontend and backend become tightly coupled. A change to the backend planner might inadvertently break the UI. By creating explicit UI-Safe `Payloads` and generating TypeScript types from them, the frontend is perfectly protected from backend refactoring.
