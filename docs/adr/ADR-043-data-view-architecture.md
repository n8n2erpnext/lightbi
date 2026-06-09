# ADR-043 Data View Architecture

Status:
Accepted

Context:
If a Line Chart component directly parses a raw `RuntimeDataset`, the rendering logic becomes horribly entangled with semantic mapping logic. We need an intermediary layer that defines the "shape" of the data.

Decision:
We establish the **Data View Layer**.
- A `DataView` wraps a `RuntimeDataset`.
- It defines explicit Roles for columns (e.g., "X-Axis: Time Dimension", "Y-Axis: Revenue Measure").
- The Data View governs grouping and sorting. It explicitly does NOT contain UI styling, colors, or chart types.

Consequences:
- Rule: `RuntimeDataset -> Data View -> Chart`.
- A single `DataView` can be plugged into a Line Chart or an Area Chart transparently because the "shape" is guaranteed to be compatible.
