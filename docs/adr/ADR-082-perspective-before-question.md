# ADR 082: Perspective Before Question

## Status
Accepted

## Context
In early iterations, LightBI exposed automatically generated questions directly from the dataset. This reinforced the mental model of a traditional BI tool: "Here is your dataset; what queries do you want to run?"

However, the core product philosophy of LightBI requires users to express their *Business Understanding* before receiving insights. Jumping directly from Data to Questions bypasses the crucial context of *why* the user is analyzing the data.

## Decision
We establish the **Perspective Before Question** architecture:

1. **Global Perspective Selection**: The user must declare a business perspective (e.g., Operations, Revenue, Inventory) before generating questions. This is implemented as a global selector at the top of the workspace.
2. **Mandatory Context**: If no perspective is chosen, question discovery and business view exploration are locked.
3. **Hierarchy of Generation**: 
   - *Perspectives* define the boundaries of Business Understanding.
   - *Business Views* are constrained by the selected Perspective.
   - *Questions* are contextualized by the selected Business View and Perspective.
4. **Tab Responsibilities**:
   - `Explore`: Uses the Perspective to filter auto-generated questions.
   - `Investigate`: Uses the Perspective to display contextually relevant Business Views and Relationship Evidence.
   - `Ask`: Uses the Perspective and Business View as invisible metadata context for natural language questions.

## Consequences
- **Positive**: Cements the LightBI philosophy: `Data -> Trust -> Perspective -> Business View -> Question`.
- **Positive**: Guarantees that AI-generated questions and SQL generation have an explicit, user-declared business context to anchor upon.
- **Negative**: Adds a mandatory click before a user can see suggested questions.
