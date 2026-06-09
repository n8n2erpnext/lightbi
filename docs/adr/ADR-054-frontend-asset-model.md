# ADR-054 Frontend Asset Model

Status:
Accepted

Context:
When the frontend fetches a Dashboard, it should receive a self-contained payload. It shouldn't have to make 20 separate API requests to piece together what a Chart should look like.

Decision:
We establish the **Frontend Asset Model**.
- A `DashboardPayload` contains a list of nested `WidgetPayload`s.
- These payloads are completely dehydrated. They do not contain physical data (e.g., millions of database rows). They only contain rendering metadata (Grid X/Y, Chart Type, Mappings).
- We utilize `ts-rs` to automatically generate TypeScript bindings from the Rust Structs.

Consequences:
- The frontend developers will never need to "guess" the API shape or manually maintain TypeScript types. When the Rust contract changes, the TypeScript types automatically update.
