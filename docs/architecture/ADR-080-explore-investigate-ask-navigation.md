# ADR 080: Explore, Investigate, Ask Navigation

## Status
Accepted

## Context
LightBI's core value proposition is serving as a Business Understanding Engine, rather than just another BI tool. Previously, the analysis tabs were named using developer-centric terminology: `Auto`, `Advanced`, and `AI`. 

These terms failed to convey the analytical intent of the user and created confusion (e.g., what is the difference between Advanced and AI for an SME?).

## Decision
We establish the official LightBI navigation language to reflect the user's intent:

1. **Explore**: *Dataset First*. "What is inside this data?" This mode focuses on discovering fields, data distributions, top values, and suggested questions directly from the raw data.
2. **Investigate**: *Business View First*. "What business process is happening?" This mode focuses on analyzing relationship evidence and confirmed business views (e.g., logistics journeys, profitability).
3. **Ask**: *Question First*. "What do you want to know?" This mode provides a natural language interface for users to directly ask business questions (e.g., "Which route has the highest delay?").

## Consequences
- **Positive**: Navigation language aligns with the mental model of business users (SMEs).
- **Positive**: Eliminates developer jargon from the core analytical experience.
- **Negative**: N/A.
