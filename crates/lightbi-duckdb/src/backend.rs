use async_trait::async_trait;
use duckdb::{Connection, types::ValueRef};
use std::collections::HashMap;
use lightbi_planner::model::ExecutionPlan;
use lightbi_runtime_backend::contract::{ExecutionBackend, BackendError};
use lightbi_runtime_backend::model::{ResultSet, ColumnDef, ExecutionMetadata};

pub struct DuckDBBackend {}

impl DuckDBBackend {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl ExecutionBackend for DuckDBBackend {
    fn name(&self) -> &str {
        "DuckDB"
    }

    async fn validate_plan(&self, _plan: &ExecutionPlan) -> Result<(), BackendError> {
        Ok(())
    }

    async fn estimate_cost(&self, _plan: &ExecutionPlan) -> Result<u64, BackendError> {
        Ok(100)
    }

    async fn execute_plan(&self, plan: &ExecutionPlan) -> Result<ResultSet, BackendError> {
        // For Milestone 1, we assume the last step's payload contains raw SQL
        let sql = if let Some(step) = plan.steps.last() {
            step.payload.clone()
        } else {
            return Err(BackendError::PlanRejected("Empty execution plan".to_string()));
        };

        // Open in-memory duckdb connection
        let conn = Connection::open_in_memory().map_err(|e| BackendError::ExecutionFailed(e.to_string()))?;
        
        // Execute query
        let start_time = std::time::Instant::now();
        let mut stmt = conn.prepare(&sql).map_err(|e| BackendError::ExecutionFailed(e.to_string()))?;
        
        let column_count = stmt.column_count();
        let column_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
        let mut columns = Vec::new();
        for name in &column_names {
            columns.push(ColumnDef {
                name: name.clone(),
                data_type: "string".to_string(), // we can infer better types later
            });
        }

        let mut rows_result = stmt.query([]).map_err(|e| BackendError::ExecutionFailed(e.to_string()))?;
        let mut rows = Vec::new();

        while let Some(row) = rows_result.next().map_err(|e| BackendError::ExecutionFailed(e.to_string()))? {
            let mut row_values = Vec::new();
            for i in 0..column_count {
                let val_ref = row.get_ref(i).map_err(|e| BackendError::ExecutionFailed(e.to_string()))?;
                let json_val = match val_ref {
                    ValueRef::Null => serde_json::Value::Null,
                    ValueRef::Boolean(b) => serde_json::Value::Bool(b),
                    ValueRef::TinyInt(i) => serde_json::Value::Number(i.into()),
                    ValueRef::SmallInt(i) => serde_json::Value::Number(i.into()),
                    ValueRef::Int(i) => serde_json::Value::Number(i.into()),
                    ValueRef::BigInt(i) => serde_json::Value::Number(i.into()),
                    ValueRef::HugeInt(i) => serde_json::Value::Number((i as i64).into()), // hugeint might lose precision in json number
                    ValueRef::Float(f) => serde_json::Number::from_f64(f.into()).map(serde_json::Value::Number).unwrap_or(serde_json::Value::Null),
                    ValueRef::Double(f) => serde_json::Number::from_f64(f).map(serde_json::Value::Number).unwrap_or(serde_json::Value::Null),
                    ValueRef::Text(t) => serde_json::Value::String(String::from_utf8_lossy(t).to_string()),
                    _ => serde_json::Value::String(format!("{:?}", val_ref)), // fallback
                };
                row_values.push(json_val);
            }
            rows.push(row_values);
        }

        let rows_processed = rows.len() as u64;

        Ok(ResultSet {
            columns,
            rows,
            statistics: HashMap::new(),
            metadata: ExecutionMetadata {
                rows_processed,
                execution_time_ms: start_time.elapsed().as_millis() as u64,
                backend_name: self.name().to_string(),
            }
        })
    }
}
