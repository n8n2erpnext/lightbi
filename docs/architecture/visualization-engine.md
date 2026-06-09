# Visualization Engine Model

The Visualization Engine is the strict enforcer of rendering contracts. It guarantees that the configuration a user creates will actually produce a valid chart.

## The Validator

The `ChartValidator` intercepts requests to create a `ChartDefinition`. It cross-references the requested `ChartType` against the `DataView` it is trying to consume.

If a user tries to map a `BarChart` configuration to a `TimeSeries` Data View, the `ChartValidator` will throw a `ChartValidationError::IncompatibleView`. 

This strict backend validation means the frontend rendering engine (e.g., Apache ECharts or Recharts) will *never* receive malformed configuration, eliminating the dreaded "White Screen of Death" caused by JavaScript charting libraries panicking on bad data shapes.
