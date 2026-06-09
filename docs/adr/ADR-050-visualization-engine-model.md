# ADR-050 Visualization Engine Model

Status:
Accepted

Context:
A Line Chart needs specific configurations (X-Axis, Y-Axis, Color Mapping) that a KPI Card does not need. The backend needs to know exactly what configuration shape is valid for what type of chart.

Decision:
We establish the **Visualization Engine Model**.
- We define explicit `ChartType` definitions: `Line`, `Bar`, `Area`, `Pie`, `Table`, `KPI`.
- A `ChartDefinition` holds explicit `ChartMappings` detailing how `DataView` roles map to visual properties.
- The backend `ChartValidator` checks this configuration against the `VisualizationContract` established in the `lightbi-view` crate to ensure absolute rendering safety.

Consequences:
- The frontend will never receive a corrupted or invalid chart configuration from the backend. The backend enforces structural integrity before the configuration is ever saved to the database.
