//! Advanced workspace internal module. Behavior is preserved from the pre-split facade.

use super::*;

pub(crate) async fn start_export(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<ExportRequest>,
) -> Result<Json<ExportStartResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    if matches!(session.backend, ConnectionBackend::Mongo(_)) {
        return Err(ApiError::bad_request(
            "ADVANCED_EXPORT_MONGO_UNSUPPORTED",
            "MongoDB export still uses the document query path.",
        ));
    }
    let sql = normalized_read_query(&request.sql)?;
    let format = request.format.trim().to_ascii_lowercase();
    if !["csv", "json", "sql", "xlsx"].contains(&format.as_str()) {
        return Err(ApiError::bad_request(
            "ADVANCED_EXPORT_FORMAT",
            "Backend streaming export supports CSV, JSON, SQL, and XLSX.",
        ));
    }
    let filter_tree = request.filter_tree.or_else(|| {
        let filters = request.filters.unwrap_or_default();
        if filters.is_empty() {
            None
        } else {
            Some(QueryFilterGroup {
                combinator: FilterCombinator::And,
                children: filters
                    .into_iter()
                    .map(QueryFilterNode::Condition)
                    .collect(),
            })
        }
    });
    let job_id = Uuid::new_v4().to_string();
    let safe_name = request
        .file_name
        .unwrap_or_else(|| "lightbi-export".to_string())
        .replace(['/', '\\'], "_");
    let file_name = format!("{safe_name}.full.{format}");
    let content_type = match format.as_str() {
        "json" => "application/json;charset=utf-8",
        "sql" => "application/sql;charset=utf-8",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        _ => "text/csv;charset=utf-8",
    }
    .to_string();
    state.advanced.export_jobs.write().await.insert(
        job_id.clone(),
        ExportJob {
            status: ExportJobStatus::Running,
            format: format.clone(),
            rows: 0,
            file_name,
            content_type,
            data: None,
            error: None,
            abort_handle: None,
        },
    );

    let task_state = state.clone();
    let task_job_id = job_id.clone();
    let task = tokio::spawn(async move {
        let outcome = run_export_job(
            session,
            task_job_id.clone(),
            sql,
            format,
            request.table_name,
            request.sort,
            filter_tree,
            task_state.clone(),
        )
        .await;
        let mut jobs = task_state.advanced.export_jobs.write().await;
        if let Some(job) = jobs.get_mut(&task_job_id) {
            if job.status == ExportJobStatus::Cancelled {
                return;
            }
            match outcome {
                Ok(data) => {
                    job.status = ExportJobStatus::Completed;
                    job.data = Some(data);
                    job.abort_handle = None;
                }
                Err(error) => {
                    job.status = ExportJobStatus::Failed;
                    job.error = Some(error.message);
                    job.abort_handle = None;
                }
            }
        }
    });
    if let Some(job) = state.advanced.export_jobs.write().await.get_mut(&job_id) {
        job.abort_handle = Some(task.abort_handle());
    }
    Ok(Json(ExportStartResponse { job_id }))
}

pub(crate) async fn get_export_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<Json<ExportJobResponse>, ApiError> {
    let jobs = state.advanced.export_jobs.read().await;
    let job = jobs.get(&job_id).ok_or_else(|| {
        ApiError::bad_request("ADVANCED_EXPORT_NOT_FOUND", "Export job was not found.")
    })?;
    Ok(Json(export_job_response(&job_id, job)))
}

pub(crate) async fn download_export_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<Response, ApiError> {
    let jobs = state.advanced.export_jobs.read().await;
    let job = jobs.get(&job_id).ok_or_else(|| {
        ApiError::bad_request("ADVANCED_EXPORT_NOT_FOUND", "Export job was not found.")
    })?;
    if job.status != ExportJobStatus::Completed {
        return Err(ApiError::bad_request(
            "ADVANCED_EXPORT_NOT_READY",
            "Export job is not complete yet.",
        ));
    }
    let data = job.data.clone().unwrap_or_default();
    let mut response = data.into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&job.content_type)
            .unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")),
    );
    response.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!(
            "attachment; filename=\"{}\"",
            job.file_name.replace('"', "")
        ))
        .unwrap_or_else(|_| HeaderValue::from_static("attachment")),
    );
    Ok(response)
}

pub(crate) async fn cancel_export_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> StatusCode {
    let mut jobs = state.advanced.export_jobs.write().await;
    if let Some(job) = jobs.get_mut(&job_id) {
        if let Some(handle) = job.abort_handle.take() {
            handle.abort();
        }
        job.status = ExportJobStatus::Cancelled;
        StatusCode::ACCEPTED
    } else {
        StatusCode::NO_CONTENT
    }
}

fn export_job_response(job_id: &str, job: &ExportJob) -> ExportJobResponse {
    let status = match job.status {
        ExportJobStatus::Running => "running",
        ExportJobStatus::Completed => "completed",
        ExportJobStatus::Failed => "failed",
        ExportJobStatus::Cancelled => "cancelled",
    }
    .to_string();
    ExportJobResponse {
        job_id: job_id.to_string(),
        status,
        format: job.format.clone(),
        rows: job.rows,
        file_name: job.file_name.clone(),
        error: job.error.clone(),
    }
}

async fn run_export_job(
    session: ConnectionSession,
    job_id: String,
    sql: String,
    format: String,
    table_name: Option<String>,
    sort: Option<QuerySortRequest>,
    filter_tree: Option<QueryFilterGroup>,
    state: Arc<AppState>,
) -> Result<Vec<u8>, ApiError> {
    let mut offset = 0;
    let mut total_rows = 0;
    let mut output = Vec::<u8>::new();
    let mut first_json_row = true;
    let mut columns = Vec::<QueryColumn>::new();
    let mut xlsx_rows = Vec::<Vec<Value>>::new();
    let target_table = table_name.unwrap_or_else(|| "lightbi_export".to_string());

    if format == "json" {
        output.extend_from_slice(b"[\n");
    }

    for page_index in 0..=MAX_EXPORT_ROWS / EXPORT_PAGE_SIZE {
        let page = match session.backend.clone() {
            ConnectionBackend::Postgres(pool) => {
                run_postgres_query(
                    pool,
                    format!("export:{job_id}:{page_index}"),
                    sql.clone(),
                    EXPORT_PAGE_SIZE,
                    offset,
                    sort.clone(),
                    filter_tree.clone(),
                )
                .await?
            }
            ConnectionBackend::MySql(pool) => {
                run_mysql_query(
                    pool,
                    format!("export:{job_id}:{page_index}"),
                    sql.clone(),
                    EXPORT_PAGE_SIZE,
                    offset,
                    sort.clone(),
                    filter_tree.clone(),
                )
                .await?
            }
            ConnectionBackend::Sqlite(pool) => {
                run_sqlite_query(
                    pool,
                    format!("export:{job_id}:{page_index}"),
                    sql.clone(),
                    EXPORT_PAGE_SIZE,
                    offset,
                    sort.clone(),
                    filter_tree.clone(),
                )
                .await?
            }
            ConnectionBackend::SqlServer(connection) => {
                run_sql_server_query(
                    connection,
                    format!("export:{job_id}:{page_index}"),
                    sql.clone(),
                    EXPORT_PAGE_SIZE,
                    offset,
                    sort.clone(),
                    filter_tree.clone(),
                )
                .await?
            }
            ConnectionBackend::Mongo(_) => {
                return Err(ApiError::bad_request(
                    "ADVANCED_EXPORT_MONGO_UNSUPPORTED",
                    "MongoDB export still uses the document query path.",
                ))
            }
        };
        if page_index == 0 {
            columns = page.columns;
            if format == "csv" {
                output.extend_from_slice(
                    csv_line(columns.iter().map(|column| column.name.as_str())).as_bytes(),
                );
            }
        }
        if page.rows.is_empty() {
            break;
        }
        if total_rows + page.rows.len() > MAX_EXPORT_ROWS {
            return Err(ApiError::bad_request(
                "ADVANCED_EXPORT_ROW_LIMIT",
                "Backend export is limited to 250,000 rows per interactive job.",
            ));
        }
        match format.as_str() {
            "json" => {
                for row in &page.rows {
                    if !first_json_row {
                        output.extend_from_slice(b",\n");
                    }
                    first_json_row = false;
                    let object = serde_json::Map::from_iter(columns.iter().enumerate().map(
                        |(index, column)| {
                            (
                                column.name.clone(),
                                row.get(index).cloned().unwrap_or(Value::Null),
                            )
                        },
                    ));
                    output.extend_from_slice(
                        serde_json::to_string(&Value::Object(object))
                            .unwrap_or_else(|_| "{}".to_string())
                            .as_bytes(),
                    );
                }
            }
            "sql" => {
                let names = columns
                    .iter()
                    .map(|column| quote_sql_identifier(&column.name))
                    .collect::<Vec<_>>()
                    .join(", ");
                let table = quote_sql_identifier(&target_table);
                for row in &page.rows {
                    let values = row
                        .iter()
                        .map(sql_literal_json)
                        .collect::<Vec<_>>()
                        .join(", ");
                    output.extend_from_slice(
                        format!("INSERT INTO {table} ({names}) VALUES ({values});\n").as_bytes(),
                    );
                }
            }
            "xlsx" => {
                xlsx_rows.extend(page.rows.iter().cloned());
            }
            _ => {
                for row in &page.rows {
                    output.extend_from_slice(csv_line(row.iter().map(json_export_cell)).as_bytes());
                }
            }
        }
        total_rows += page.rows.len();
        if let Some(job) = state.advanced.export_jobs.write().await.get_mut(&job_id) {
            if job.status == ExportJobStatus::Cancelled {
                return Err(ApiError::bad_request(
                    "ADVANCED_EXPORT_CANCELLED",
                    "Export job was cancelled.",
                ));
            }
            job.rows = total_rows;
        }
        if !page.page.has_more {
            break;
        }
        offset += page.rows.len();
    }

    if format == "json" {
        output.extend_from_slice(b"\n]\n");
    }
    if format == "xlsx" {
        let path = crate::lightbi_work_file(format!("lightbi-advanced-export-{job_id}.xlsx"))
            .to_string_lossy()
            .to_string();
        let result_set = ResultSet {
            columns: columns
                .iter()
                .map(|column| ColumnDef {
                    name: column.name.clone(),
                    data_type: column.native_type.clone(),
                })
                .collect(),
            rows: xlsx_rows,
            statistics: HashMap::new(),
            metadata: ExecutionMetadata {
                rows_processed: total_rows as u64,
                execution_time_ms: 0,
                backend_name: "advanced".to_string(),
            },
        };
        ExcelGenerator::generate_from_resultset(&result_set, &path).map_err(|error| {
            ApiError::database(format!("Could not generate XLSX export: {error}"))
        })?;
        let bytes = tokio::fs::read(&path)
            .await
            .map_err(|error| ApiError::database(format!("Could not read XLSX export: {error}")))?;
        let _ = tokio::fs::remove_file(&path).await;
        return Ok(bytes);
    }
    Ok(output)
}

fn csv_line<T: AsRef<str>>(cells: impl IntoIterator<Item = T>) -> String {
    let mut line = cells
        .into_iter()
        .map(|cell| csv_cell(cell.as_ref()))
        .collect::<Vec<_>>()
        .join(",");
    line.push('\n');
    line
}

fn csv_cell(value: &str) -> String {
    let hardened = if value.starts_with(['=', '+', '-', '@']) {
        format!("'{value}")
    } else {
        value.to_string()
    };
    if hardened.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", hardened.replace('"', "\"\""))
    } else {
        hardened
    }
}

fn json_export_cell(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(text) => text.clone(),
        Value::Bool(true) => "true".to_string(),
        Value::Bool(false) => "false".to_string(),
        Value::Number(number) => number.to_string(),
        other => other.to_string(),
    }
}

fn sql_literal_json(value: &Value) -> String {
    match value {
        Value::Null => "NULL".to_string(),
        Value::Bool(value) => if *value { "TRUE" } else { "FALSE" }.to_string(),
        Value::Number(number) => number.to_string(),
        Value::String(text) => format!("'{}'", text.replace('\'', "''")),
        other => format!("'{}'", other.to_string().replace('\'', "''")),
    }
}
