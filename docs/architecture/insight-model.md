# Insight Architecture Model

In LightBI, an `Insight` is an analytical asset that sits alongside a `DataView`. While a DataView dictates how to draw a chart, an Insight dictates how to explain the data.

## Architectural Flow

```mermaid
graph TD
    subgraph Sourced Assets
        RD[Runtime Dataset]
        DV[Data View]
    end

    subgraph Analytical Layer
        RD -->|Analyzed By| Engine[Insight Engine]
        DV -->|Analyzed By| Engine
        
        Engine -->|Produces| IN[Insight]
        IN --> Reg[Insight Registry]
    end

    subgraph Presentation
        IN --> Text[Dashboard Text Widget]
        IN --> Alert[Notification Alert]
        IN --> AI[LLM Summarization Context]
    end
```

## Why decoupled from charts?
Insights do not care how they are rendered. A `Trend Insight` that identifies a 15% drop in revenue can be displayed as a red arrow next to a KPI, a text paragraph in a weekly email, or fed into an LLM context window to answer user questions. By making Insights first-class assets, they become universally reusable.
