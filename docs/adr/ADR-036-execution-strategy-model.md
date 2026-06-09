# ADR-036 Execution Strategy Model

Status:
Accepted

Context:
Not all datasets should be queried identically. Executing a massive join on a 10TB Postgres database using local DuckDB memory is catastrophic. Conversely, making network calls for a 50KB CSV file every time a user drags a chart is horribly slow. 

Decision:
The Planner will utilize a **Strategy Engine** that assigns an execution pattern based on Source Capabilities and Dataset semantics.

Supported Strategies:
- **Pushdown Execution:** The Planner detects `supports_sql_execution = true` on the Source Connector and instructs the Runtime to send the aggregation directly to the source database.
- **Cache Execution:** The data is small or frequently accessed; the Planner instructs the Runtime to pull from the `cache/` DuckDB files.
- **Incremental Execution:** Only new rows are pulled and appended.
- **Materialized Execution:** The entire virtual dataset is flattened and saved locally.
- **Sampling Execution:** Used exclusively for the UI Visual Data Canvas to provide instant previews.

Consequences:
- Strategies remain runtime independent. They simply form the `ExecutionPlan` instruction set that any compatible backend can follow.
