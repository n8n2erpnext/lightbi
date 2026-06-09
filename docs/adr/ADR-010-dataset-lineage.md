# ADR-010 Dataset Lineage

Status:
Accepted

Context:
In many BI tools, datasets become "black boxes" over time. Users forget how a dataset was generated, where the original data came from, or what transformations were applied, leading to a loss of trust in the numbers.

Decision:
Every Curated Dataset stores lineage.
Users must always be able to see:
* source files
* source databases
* transformations applied
* recipe steps

Consequences:
* High auditability for compliance and debugging.
* Trust in the final curated data since its origins are entirely transparent.
* Explainability of the entire pipeline, from ingestion to dashboard representation.
