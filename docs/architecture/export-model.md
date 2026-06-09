# Export Architecture Model

In LightBI, generating a file (like a CSV or PDF) is not a casual frontend action. It is a governed orchestration managed by the `ExportService`.

## Architectural Flow

```mermaid
graph TD
    subgraph Assets
        RD[Runtime Dataset]
        DV[Data View]
        IN[Insight]
    end

    subgraph Export Orchestration
        User[User Request] -->|Triggers| ES[Export Service]
        ES -->|Reads| RD
        ES -->|Reads| DV
        ES -->|Reads| IN
        
        ES -->|Writes to Disk| File[Physical File]
        ES -->|Registers| EA[Export Artifact]
    end

    subgraph Governance
        EA -->|Tracked by| ER[Export Registry]
    end
```

## Why Centralize Exports?
If a user clicks "Download CSV" on a chart, and the chart generates the CSV directly, the application has no record of that action. By forcing all exports through the `ExportService`, we guarantee that every file leaving the system is recorded, versioned, and perfectly traceable back to its source data.
