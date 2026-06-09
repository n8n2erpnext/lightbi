# Visualization Contract Model

The Visualization Contract is a type-safety mechanism for the Front-End. It prevents users from breaking the UI by mapping incompatible data to specific chart types.

## The Contract

When a `DataView` is created, it asserts a `ViewType` (e.g., `TimeSeries`, `Category`, `Pivot`).

The `VisualizationContract` hardcodes the exact list of UI components that are permitted to consume that ViewType.

### Examples

- **TimeSeries View**: Can ONLY be consumed by `LineChart`, `AreaChart`, or `Table`. It requires exactly 1 Date/Time dimension.
- **Category View**: Can ONLY be consumed by `BarChart`, `PieChart`, or `Table`. It requires a categorical dimension.
- **KPI View**: Can ONLY be consumed by a `BigNumberCard`. It requires exactly 1 Measure and 0 Dimensions.

## The Validator
The `ViewValidator` intercepts requests to create a DataView. If the user tries to create a `TimeSeries` view but fails to provide a Date/Time dimension, the validator rejects the request, preventing the frontend from throwing a React/Vue exception.
