//! Behavior-preserving server ownership split.

use super::*;

pub(super) async fn get_chart(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    let source = resolve_current_source(&state).await;
    let sql_payload = source
        .as_ref()
        .map(build_dynamic_sql)
        .unwrap_or_else(|| "SELECT * FROM read_csv_auto('sales.csv') LIMIT 100".to_string());

    // 1. Create a dummy ExecutionPlan that reads the CSV
    let plan = ExecutionPlan {
        id: "plan-1".to_string(),
        project_id: "project-1".to_string(),
        recipe_id: "recipe-1".to_string(),
        plan_name: "Read CSV".to_string(),
        dataset_scope: vec!["dataset-csv-1".to_string()],
        source_scope: vec!["csv-source".to_string()],
        strategy_type: StrategyType::Pushdown,
        steps: vec![ExecutionStep {
            step_order: 1,
            step_type: "ExecuteSQL".to_string(),
            payload: sql_payload.clone(),
        }],
    };

    // 2. Execute it via DuckDB backend manually for this milestone
    let backend = DuckDBBackend::new();
    let result_set = match backend.execute_plan(&plan).await {
        Ok(rs) => rs,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Chart query failed", "details": format!("{:?}", e), "generated_sql": sql_payload}))).into_response()
    };

    let mut theme_metadata = serde_json::Map::new();
    let title_suffix = source
        .as_ref()
        .and_then(|s| s.measure_column.clone())
        .unwrap_or_else(|| "Data".to_string());
    theme_metadata.insert(
        "title".to_string(),
        serde_json::json!(format!("{} Trend", title_suffix)),
    );

    let x_col = result_set
        .columns
        .get(0)
        .map(|s| s.name.clone())
        .unwrap_or_else(|| "label".to_string());
    let y_col = result_set
        .columns
        .get(1)
        .map(|s| s.name.clone())
        .unwrap_or_else(|| "value".to_string());

    theme_metadata.insert(
        "data".to_string(),
        serde_json::json!(result_set
            .rows
            .iter()
            .map(|r| {
                let mut map = std::collections::HashMap::new();
                map.insert(x_col.clone(), r[0].clone());
                map.insert(
                    y_col.clone(),
                    if r.len() > 1 {
                        r[1].clone()
                    } else {
                        Value::Null
                    },
                );
                map
            })
            .collect::<Vec<_>>()),
    );
    theme_metadata.insert("xAxis".to_string(), serde_json::json!(x_col));
    theme_metadata.insert("yAxis".to_string(), serde_json::json!(vec![y_col]));

    let payload = ChartPayload {
        id: id.clone(),
        payload_version: PayloadVersion::V1,
        chart_type: if id == "kpi" {
            "kpi".to_string()
        } else {
            "line".to_string()
        },
        mappings: std::collections::HashMap::new(),
        theme_metadata: serde_json::Value::Object(theme_metadata),
    };

    (StatusCode::OK, Json(payload)).into_response()
}

pub(super) async fn download_export(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    let source = resolve_current_source(&state).await;
    let sql_payload = source
        .as_ref()
        .map(build_dynamic_sql)
        .unwrap_or_else(|| "SELECT * FROM read_csv_auto('sales.csv') LIMIT 100".to_string());

    // Generate an Excel file for the same data
    let plan = ExecutionPlan {
        id: "plan-1".to_string(),
        project_id: "project-1".to_string(),
        recipe_id: "recipe-1".to_string(),
        plan_name: "Read CSV".to_string(),
        dataset_scope: vec!["dataset-csv-1".to_string()],
        source_scope: vec!["csv-source".to_string()],
        strategy_type: StrategyType::Pushdown,
        steps: vec![ExecutionStep {
            step_order: 1,
            step_type: "ExecuteSQL".to_string(),
            payload: sql_payload.clone(),
        }],
    };

    let backend = DuckDBBackend::new();
    let result_set = match backend.execute_plan(&plan).await {
        Ok(rs) => rs,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Export query failed", "details": format!("{:?}", e), "generated_sql": sql_payload}))).into_response()
    };

    let export_path = lightbi_work_file(format!("export-{id}.xlsx"));
    let export_path_text = export_path.to_string_lossy().to_string();
    if let Err(e) = ExcelGenerator::generate_from_resultset(&result_set, &export_path_text) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Excel generation failed", "details": format!("{:?}", e)})),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(
            json!({ "status": "success", "download_url": format!("file://{}", export_path_text) }),
        ),
    )
        .into_response()
}

pub(super) async fn ask_question(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    let question = payload
        .get("question")
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown question");

    // 1. Resolve Question to Template
    let resolver = &state.context.template_resolver;
    let (template, _params) = resolver.resolve(question).unwrap();

    let source = resolve_current_source(&state).await;
    let sql_payload = source
        .as_ref()
        .map(build_dynamic_sql)
        .unwrap_or_else(|| "SELECT * FROM read_csv_auto('sales.csv') LIMIT 100".to_string());

    // 2. Mock Execution Plan
    let plan = ExecutionPlan {
        id: "plan-1".to_string(),
        project_id: "project-1".to_string(),
        recipe_id: "recipe-1".to_string(),
        plan_name: "Read CSV".to_string(),
        dataset_scope: vec!["dataset-csv-1".to_string()],
        source_scope: vec!["csv-source".to_string()],
        strategy_type: StrategyType::Pushdown,
        steps: vec![ExecutionStep {
            step_order: 1,
            step_type: "ExecuteSQL".to_string(),
            payload: sql_payload.clone(),
        }],
    };

    let backend = DuckDBBackend::new();
    let result_set = match backend.execute_plan(&plan).await {
        Ok(rs) => rs,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Question query failed", "details": format!("{:?}", e), "generated_sql": sql_payload}))).into_response()
    };

    // 3. Generate ChartPayload
    let mut theme_metadata = serde_json::Map::new();
    let title_suffix = source
        .as_ref()
        .and_then(|s| s.measure_column.clone())
        .unwrap_or_else(|| "Data".to_string());
    theme_metadata.insert(
        "title".to_string(),
        serde_json::json!(format!("{} Trend", title_suffix)),
    );

    let x_col = result_set
        .columns
        .get(0)
        .map(|s| s.name.clone())
        .unwrap_or_else(|| "label".to_string());
    let y_col = result_set
        .columns
        .get(1)
        .map(|s| s.name.clone())
        .unwrap_or_else(|| "value".to_string());

    theme_metadata.insert(
        "data".to_string(),
        serde_json::json!(result_set
            .rows
            .iter()
            .map(|r| {
                let mut map = std::collections::HashMap::new();
                map.insert(x_col.clone(), r[0].clone());
                map.insert(
                    y_col.clone(),
                    if r.len() > 1 {
                        r[1].clone()
                    } else {
                        Value::Null
                    },
                );
                map
            })
            .collect::<Vec<_>>()),
    );
    theme_metadata.insert("xAxis".to_string(), serde_json::json!(x_col));
    theme_metadata.insert("yAxis".to_string(), serde_json::json!(vec![y_col]));

    let chart_payload = ChartPayload {
        id: "chart-1".to_string(),
        payload_version: PayloadVersion::V1,
        chart_type: "line".to_string(),
        mappings: std::collections::HashMap::new(),
        theme_metadata: serde_json::Value::Object(theme_metadata),
    };

    // 4. Generate InsightPayload
    let measure_name = source
        .as_ref()
        .and_then(|s| s.measure_column.clone())
        .unwrap_or_else(|| "metric".to_string());
    let dim_name = source
        .as_ref()
        .and_then(|s| s.date_column.clone().or(s.dimension_column.clone()))
        .unwrap_or_else(|| "category".to_string());

    let insight_payload = InsightPayload {
        id: "insight-1".to_string(),
        insight_type: "trend_observation".to_string(),
        observation_text: format!(
            "Based on your question '{}', we observed the trend of {} across {}.",
            question, measure_name, dim_name
        ),
        confidence: 0.95,
        payload_version: PayloadVersion::V1,
    };

    // Return the full visual pipeline payload
    (
        StatusCode::OK,
        Json(json!({
            "template": {
                "id": template.id.clone(),
                "name": template.template_name.clone(),
                "type": format!("{:?}", template.template_type)
            },
            "chart": chart_payload,
            "insight": insight_payload
        })),
    )
        .into_response()
}
