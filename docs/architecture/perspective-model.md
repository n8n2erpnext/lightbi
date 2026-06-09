# Perspective Model Architecture

The Perspective Layer dictates how data is interpreted before any analytical generation occurs. The same dataset implies vastly different things depending on the user's role.

## Architectural Flow

```mermaid
graph TD
    subgraph Input
        Q[User Question]
        U[User Session/Role]
    end

    subgraph Perspective Resolution
        U --> PR[Perspective Registry]
        PR -->|Yields| P[Active Perspective]
        
        P -->|Filters| D[Dataset Scope]
        P -->|Filters| S[Semantic Scope]
    end

    subgraph Analytical Output
        Q --> CR[Context Resolver]
        P --> CR
        D --> CR
        S --> CR
        
        CR -->|Yields| QC[Question Context]
        QC -->|Consumed By| RE[Recipe Engine]
    end
```

## Core Enforcement
- **No Direct Querying**: The application strictly prohibits jumping straight from a `Question` to a `Recipe`.
- **Role Scoping**: A `Branch Manager` Perspective inherits the core `Sales` logic but aggressively filters the `Dataset Scope` down to their specific branch.
