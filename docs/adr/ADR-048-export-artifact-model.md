# ADR-048 Export Artifact Model

Status:
Accepted

Context:
Once an Export Job completes, the physical file (PDF, CSV, PNG) needs to be stored and tracked. Relying entirely on the user's "Downloads" folder removes LightBI's ability to govern versioning and retention.

Decision:
We establish the **Export Artifact Model**.
- The `ExportRegistry` retains an `ExportArtifact` which points to the localized file.
- The artifact permanently records its `ArtifactLineage` (the exact Dataset, View, Insight, and Timestamp).
- Supported formats: Excel, CSV, PDF, PNG, Project Bundle.

Consequences:
- Users can revisit their LightBI project and see a "History of Exports" allowing them to redownload a report from exactly 3 weeks ago without re-running any databases.
