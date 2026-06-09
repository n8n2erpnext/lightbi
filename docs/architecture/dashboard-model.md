# Dashboard Architecture Model

In LightBI, a Dashboard is not a "screen of queries." It is a structural workspace that aggregates pointers to existing analytical assets.

## Architectural Flow

```mermaid
graph TD
    subgraph Analytical Assets
        C[Chart Definition]
        IN[Insight Definition]
        EA[Export Widget Definition]
    end

    subgraph Dashboard Workspace
        DW[Dashboard Widget: Chart] -->|Points to| C
        DW2[Dashboard Widget: Insight] -->|Points to| IN
        DW3[Dashboard Widget: Export] -->|Points to| EA
        
        DB[Dashboard Definition] -->|Contains| DW
        DB -->|Contains| DW2
        DB -->|Contains| DW3
    end

    subgraph User Experience
        P[Perspective: Sales] -->|Owns| DB
    end
```

## Why decouple Dashboards from Assets?
In many traditional BI tools, creating a chart *inside* a dashboard locks that chart to that dashboard. By forcing Dashboards to only contain pointers (`asset_id`), we allow the exact same Revenue Chart to be placed on the Executive Dashboard, the Sales Dashboard, and the Marketing Dashboard simultaneously. If the Revenue Chart's definition is updated, all three dashboards instantly reflect the change.
