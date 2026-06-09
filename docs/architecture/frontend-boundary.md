# Frontend Boundary Model

The Frontend Boundary defines exactly what LightBI permits the UI to do.

## The Rule: Render, Do Not Interpret

The frontend application is exclusively a rendering engine. 
- It is NOT permitted to group datasets.
- It is NOT permitted to sort insights.
- It is NOT permitted to construct Database queries.

The backend performs all analytical interpretation. It packages this interpretation into a strongly-typed, versioned `Payload` (e.g. `DashboardPayload`). The frontend's only job is to receive this payload and translate the JSON configuration into pixels on the screen using a library like Apache ECharts or Recharts.

This boundary guarantees that if we deploy a Desktop app (Tauri) and a Web App (React) they will both behave identically, because 0% of the analytical logic lives in the UI code.
