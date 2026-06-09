# Export Artifact Model

The `ExportArtifact` is the permanent record of a generated file within a LightBI Project.

## Structure
An artifact contains:
1. `file_path`: Where the physical file lives (e.g., `exports/project_id/report_v1.pdf`).
2. `artifact_type`: `CSV`, `PDF`, `Excel`, `PNG`, or `ProjectBundle`.
3. `lineage`: An array of `ArtifactLineage` references detailing exactly which assets were used to generate this file.

## Lineage Traceability
If an executive asks, "Where did this PDF number come from?", the LightBI user can look up the `ExportArtifact` in the `ExportRegistry`. The `lineage` array will point to the exact `DataView`, which points to the `RuntimeDataset`, which points to the `Recipe`, which points to the source `Dataset`, which points to the `Postgres Database`. 

Absolute, unbreakable traceability.
