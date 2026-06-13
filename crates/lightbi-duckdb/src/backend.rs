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
        
        // Execute query FIRST to force schema sniffing for read_csv_auto
        let mut rows_result = stmt.query([]).map_err(|e| BackendError::ExecutionFailed(e.to_string()))?;

        // Inspect columns AFTER execution
        let stmt_ref = rows_result.as_ref().ok_or_else(|| BackendError::ExecutionFailed("Statement not available after execution".to_string()))?;
        let column_count = stmt_ref.column_count();
        let column_names: Vec<String> = stmt_ref.column_names().into_iter().map(|s| s.to_string()).collect();
        
        let mut columns = Vec::new();
        for name in &column_names {
            columns.push(ColumnDef {
                name: name.clone(),
                data_type: "string".to_string(), // we can infer better types later
            });
        }

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[tokio::test]
    async fn test_duckdb_backend_basic_select() {
        let backend = DuckDBBackend::new();
        let plan = ExecutionPlan {
            id: "test".to_string(),
            project_id: "p1".to_string(),
            recipe_id: "r1".to_string(),
            plan_name: "test".to_string(),
            dataset_scope: vec![],
            source_scope: vec![],
            strategy_type: lightbi_planner::model::StrategyType::Pushdown,
            steps: vec![lightbi_planner::model::ExecutionStep {
                step_order: 1,
                step_type: "SQL".to_string(),
                payload: "SELECT 1 AS a".to_string(),
            }],
        };

        let result = backend.execute_plan(&plan).await.unwrap();
        assert_eq!(result.columns.len(), 1);
        assert_eq!(result.columns[0].name, "a");
        assert_eq!(result.rows.len(), 1);
        assert_eq!(result.rows[0][0], serde_json::Value::Number(1.into()));
    }

    #[tokio::test]
    async fn test_duckdb_backend_invalid_sql() {
        let backend = DuckDBBackend::new();
        let plan = ExecutionPlan {
            id: "test".to_string(),
            project_id: "p1".to_string(),
            recipe_id: "r1".to_string(),
            plan_name: "test".to_string(),
            dataset_scope: vec![],
            source_scope: vec![],
            strategy_type: lightbi_planner::model::StrategyType::Pushdown,
            steps: vec![lightbi_planner::model::ExecutionStep {
                step_order: 1,
                step_type: "SQL".to_string(),
                payload: "SELECT * FROM non_existent_table".to_string(),
            }],
        };

        let result = backend.execute_plan(&plan).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_duckdb_backend_read_csv_auto() {
        let backend = DuckDBBackend::new();
        
        let mut temp_file = tempfile::NamedTempFile::new().unwrap();
        writeln!(temp_file, "id,name\n1,Alice\n2,Bob").unwrap();
        
        let sql = format!("SELECT * FROM read_csv_auto('{}')", temp_file.path().display());
        let plan = ExecutionPlan {
            id: "test".to_string(),
            project_id: "p1".to_string(),
            recipe_id: "r1".to_string(),
            plan_name: "test".to_string(),
            dataset_scope: vec![],
            source_scope: vec![],
            strategy_type: lightbi_planner::model::StrategyType::Pushdown,
            steps: vec![lightbi_planner::model::ExecutionStep {
                step_order: 1,
                step_type: "SQL".to_string(),
                payload: sql,
            }],
        };

        let result = backend.execute_plan(&plan).await.unwrap();
        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.columns[0].name, "id");
        assert_eq!(result.columns[1].name, "name");
        assert_eq!(result.rows.len(), 2);
    }
}

