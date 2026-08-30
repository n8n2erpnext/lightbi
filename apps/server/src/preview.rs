//! Behavior-preserving server ownership split.

use super::*;

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
enum LogicalOperation {
    Scan {
        #[serde(default)]
        columns: Vec<String>,
    },
    #[serde(alias = "limit")]
    Limit {
        rows: usize,
    },
    #[serde(alias = "group_by")]
    GroupBy {
        dimensions: Vec<String>,
        measures: Vec<String>,
    },
    Trend {
        #[serde(alias = "timeDimension")]
        time_dimension: String,
        measures: Vec<String>,
    },
    Distribution {
        dimension: String,
    },
    Relationship {
        measures: Vec<String>,
    },
}

#[derive(Deserialize, Debug, Clone)]
struct ExpectedOutput {
    shape: String,
    dimensions: Vec<String>,
    measures: Vec<String>,
}

#[derive(Deserialize, Debug, Clone)]
struct RuntimePlanPreview {
    status: String,
    #[serde(alias = "logicalOperations")]
    logical_operations: Vec<LogicalOperation>,
    #[serde(alias = "requiredColumns")]
    required_columns: Vec<String>,
    #[serde(alias = "expectedOutput")]
    expected_output: ExpectedOutput,
}

#[derive(Deserialize, Debug)]
pub(super) struct PreviewExecuteRequest {
    dataset_id: String,
    #[serde(alias = "runtimePlan")]
    runtime_plan: RuntimePlanPreview,
    limit: Option<usize>,
}

#[derive(Serialize, Debug)]
struct PreviewExecuteResponse {
    status: String,
    columns: Vec<String>,
    rows: Vec<serde_json::Value>,
    row_count: usize,
    max_rows: usize,
    warnings: Vec<String>,
    blocked_reasons: Vec<String>,
    error_message: Option<String>,
}

fn compile_preview_sql(
    plan: &RuntimePlanPreview,
    file_path: &str,
    limit: usize,
) -> Result<String, String> {
    if plan.status != "ready" {
        return Err("Plan is blocked".to_string());
    }

    let safe_path = file_path.replace("'", "''");
    let mut select_clause = String::new();
    let mut group_by_clause = String::new();
    let mut order_by_clause = String::new();
    let mut where_clause = String::new();
    let mut has_main_op = false;

    let quote_ident = |ident: &str| -> String { format!("\"{}\"", ident.replace("\"", "\"\"")) };

    for op in &plan.logical_operations {
        match op {
            LogicalOperation::Scan { .. } | LogicalOperation::Limit { .. } => {}
            LogicalOperation::GroupBy {
                dimensions,
                measures,
            } => {
                if has_main_op {
                    continue;
                }
                has_main_op = true;
                let dims = dimensions
                    .iter()
                    .map(|d| quote_ident(d))
                    .collect::<Vec<_>>()
                    .join(", ");
                let meas = measures
                    .iter()
                    .map(|m| {
                        format!(
                            "COUNT({}) AS {}",
                            quote_ident(m),
                            quote_ident(&format!("{}_count", m))
                        )
                    })
                    .collect::<Vec<_>>()
                    .join(", ");
                select_clause = if dims.is_empty() {
                    meas
                } else if measures.is_empty() {
                    dims.clone()
                } else {
                    format!("{}, {}", dims, meas)
                };
                if !dims.is_empty() {
                    group_by_clause = format!("GROUP BY {}", dims);
                }
            }
            LogicalOperation::Trend {
                time_dimension,
                measures,
            } => {
                if has_main_op {
                    continue;
                }
                has_main_op = true;
                let t_dim = quote_ident(time_dimension);
                let meas = measures
                    .iter()
                    .map(|m| {
                        format!(
                            "COUNT({}) AS {}",
                            quote_ident(m),
                            quote_ident(&format!("{}_count", m))
                        )
                    })
                    .collect::<Vec<_>>()
                    .join(", ");
                select_clause = format!("{}, {}", t_dim, meas);
                group_by_clause = format!("GROUP BY {}", t_dim);
                order_by_clause = format!("ORDER BY {}", t_dim);
            }
            LogicalOperation::Distribution { dimension } => {
                if has_main_op {
                    continue;
                }
                has_main_op = true;
                let d_dim = quote_ident(dimension);
                select_clause = format!("{}, COUNT(*) AS \"row_count\"", d_dim);
                group_by_clause = format!("GROUP BY {}", d_dim);
            }
            LogicalOperation::Relationship { measures } => {
                if has_main_op {
                    continue;
                }
                has_main_op = true;
                let m_idents = measures.iter().map(|m| quote_ident(m)).collect::<Vec<_>>();
                select_clause = m_idents.join(", ");
                where_clause = format!(
                    "WHERE {}",
                    m_idents
                        .iter()
                        .map(|m| format!("{} IS NOT NULL", m))
                        .collect::<Vec<_>>()
                        .join(" AND ")
                );
            }
        }
    }

    if select_clause.is_empty() {
        return Err("Unsupported operation or no dimensions/measures specified".to_string());
    }

    let mut sql = format!(
        "SELECT {} FROM read_csv_auto('{}')",
        select_clause, safe_path
    );
    if !where_clause.is_empty() {
        sql.push_str(&format!(" {}", where_clause));
    }
    if !group_by_clause.is_empty() {
        sql.push_str(&format!(" {}", group_by_clause));
    }
    if !order_by_clause.is_empty() {
        sql.push_str(&format!(" {}", order_by_clause));
    }
    sql.push_str(&format!(" LIMIT {}", limit));

    Ok(sql)
}

pub(super) async fn execute_preview(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PreviewExecuteRequest>,
) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    let warnings = vec![];
    let mut blocked_reasons = vec![];

    if payload.runtime_plan.status != "ready" {
        blocked_reasons.push("Plan is not ready.".to_string());
        return (
            StatusCode::OK,
            Json(PreviewExecuteResponse {
                status: "blocked".to_string(),
                columns: vec![],
                rows: vec![],
                row_count: 0,
                max_rows: 0,
                warnings,
                blocked_reasons,
                error_message: None,
            }),
        )
            .into_response();
    }

    let limit = payload.limit.unwrap_or(100).min(100);

    let dataset_id = &payload.dataset_id;
    if dataset_id.is_empty() {
        blocked_reasons.push("dataset_id is missing or empty.".to_string());
        return (
            StatusCode::BAD_REQUEST,
            Json(PreviewExecuteResponse {
                status: "blocked".to_string(),
                columns: vec![],
                rows: vec![],
                row_count: 0,
                max_rows: limit,
                warnings,
                blocked_reasons,
                error_message: None,
            }),
        )
            .into_response();
    }

    let source = resolve_dataset_source(&state, dataset_id).await;
    let file_path = match source {
        Some(s) if s.file_path.to_lowercase().ends_with(".csv") => s.file_path,
        Some(_) => {
            blocked_reasons.push("Only CSV source is supported in DU-8.".to_string());
            return (
                StatusCode::OK,
                Json(PreviewExecuteResponse {
                    status: "blocked".to_string(),
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                    max_rows: limit,
                    warnings,
                    blocked_reasons,
                    error_message: None,
                }),
            )
                .into_response();
        }
        None => {
            blocked_reasons.push(format!(
                "No active dataset source available for dataset_id: {}",
                dataset_id
            ));
            return (
                StatusCode::NOT_FOUND,
                Json(PreviewExecuteResponse {
                    status: "blocked".to_string(),
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                    max_rows: limit,
                    warnings,
                    blocked_reasons,
                    error_message: None,
                }),
            )
                .into_response();
        }
    };

    let sql = match compile_preview_sql(&payload.runtime_plan, &file_path, limit) {
        Ok(s) => s,
        Err(e) => {
            blocked_reasons.push(e);
            return (
                StatusCode::OK,
                Json(PreviewExecuteResponse {
                    status: "blocked".to_string(),
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                    max_rows: limit,
                    warnings,
                    blocked_reasons,
                    error_message: None,
                }),
            )
                .into_response();
        }
    };

    // Execute plan
    let plan = ExecutionPlan {
        id: "preview-1".to_string(),
        project_id: "project-1".to_string(),
        recipe_id: "recipe-1".to_string(),
        plan_name: "Preview".to_string(),
        dataset_scope: vec![],
        source_scope: vec![],
        strategy_type: StrategyType::Pushdown,
        steps: vec![ExecutionStep {
            step_order: 1,
            step_type: "ExecuteSQL".to_string(),
            payload: sql.clone(),
        }],
    };

    let backend = DuckDBBackend::new();
    let result_set = match backend.execute_plan(&plan).await {
        Ok(rs) => rs,
        Err(e) => {
            return (
                StatusCode::OK,
                Json(PreviewExecuteResponse {
                    status: "failed".to_string(),
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                    max_rows: limit,
                    warnings,
                    blocked_reasons,
                    error_message: Some(format!("DuckDB Error: {:?}", e)),
                }),
            )
                .into_response();
        }
    };

    let columns: Vec<String> = result_set.columns.iter().map(|c| c.name.clone()).collect();
    let mut rows_objs = Vec::new();
    for row in &result_set.rows {
        let mut obj = serde_json::Map::new();
        for (i, col_name) in columns.iter().enumerate() {
            obj.insert(col_name.clone(), row[i].clone());
        }
        rows_objs.push(serde_json::Value::Object(obj));
    }
    let row_count = rows_objs.len();

    (
        StatusCode::OK,
        Json(PreviewExecuteResponse {
            status: "executed".to_string(),
            columns,
            rows: rows_objs,
            row_count,
            max_rows: limit,
            warnings,
            blocked_reasons,
            error_message: None,
        }),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_plan() -> RuntimePlanPreview {
        RuntimePlanPreview {
            status: "ready".to_string(),
            logical_operations: vec![],
            required_columns: vec![],
            expected_output: ExpectedOutput {
                shape: "table".to_string(),
                dimensions: vec![],
                measures: vec![],
            },
        }
    }

    #[test]
    fn test_compile_blocked_plan() {
        let mut plan = dummy_plan();
        plan.status = "blocked".to_string();
        assert!(compile_preview_sql(&plan, "test.csv", 100).is_err());
    }

    #[test]
    fn test_compile_group_by() {
        let mut plan = dummy_plan();
        plan.logical_operations.push(LogicalOperation::GroupBy {
            dimensions: vec!["category".to_string()],
            measures: vec!["revenue".to_string()],
        });
        let sql = compile_preview_sql(&plan, "test.csv", 100).unwrap();
        assert_eq!(sql, "SELECT \"category\", COUNT(\"revenue\") AS \"revenue_count\" FROM read_csv_auto('test.csv') GROUP BY \"category\" LIMIT 100");
    }

    #[test]
    fn test_compile_trend() {
        let mut plan = dummy_plan();
        plan.logical_operations.push(LogicalOperation::Trend {
            time_dimension: "order_date".to_string(),
            measures: vec!["amount".to_string()],
        });
        let sql = compile_preview_sql(&plan, "data's.csv", 50).unwrap();
        assert_eq!(sql, "SELECT \"order_date\", COUNT(\"amount\") AS \"amount_count\" FROM read_csv_auto('data''s.csv') GROUP BY \"order_date\" ORDER BY \"order_date\" LIMIT 50");
    }

    #[test]
    fn test_compile_distribution() {
        let mut plan = dummy_plan();
        plan.logical_operations
            .push(LogicalOperation::Distribution {
                dimension: "status".to_string(),
            });
        let sql = compile_preview_sql(&plan, "test.csv", 100).unwrap();
        assert_eq!(sql, "SELECT \"status\", COUNT(*) AS \"row_count\" FROM read_csv_auto('test.csv') GROUP BY \"status\" LIMIT 100");
    }

    #[test]
    fn test_compile_relationship() {
        let mut plan = dummy_plan();
        plan.logical_operations
            .push(LogicalOperation::Relationship {
                measures: vec!["x".to_string(), "y".to_string()],
            });
        let sql = compile_preview_sql(&plan, "test.csv", 10).unwrap();
        assert_eq!(sql, "SELECT \"x\", \"y\" FROM read_csv_auto('test.csv') WHERE \"x\" IS NOT NULL AND \"y\" IS NOT NULL LIMIT 10");
    }

    #[test]
    fn test_compile_unsafe_quotes() {
        let mut plan = dummy_plan();
        plan.logical_operations.push(LogicalOperation::GroupBy {
            dimensions: vec!["\"unsafe\"".to_string()],
            measures: vec![],
        });
        let sql = compile_preview_sql(&plan, "test.csv", 100).unwrap();
        assert_eq!(sql, "SELECT \"\"\"unsafe\"\"\" FROM read_csv_auto('test.csv') GROUP BY \"\"\"unsafe\"\"\" LIMIT 100");
    }
}
