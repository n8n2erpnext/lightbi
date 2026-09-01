//! Behavior-preserving server ownership split.

use super::*;

#[derive(Clone, Serialize, Deserialize)]
pub(super) struct CurrentSourceSession {
    pub(super) file_name: String,
    pub(super) file_path: String,
    pub(super) bytes_written: usize,
    pub(super) source_id: String,
    pub(super) dataset_id: String,
    pub(super) schema: Value,
    pub(super) uploaded_at: String,
    pub(super) date_column: Option<String>,
    pub(super) measure_column: Option<String>,
    pub(super) dimension_column: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectSourceFile {
    file_id: String,
    original_name: String,
    file_path: String,
    bytes_written: usize,
}

fn infer_columns(schema: &Value) -> (Option<String>, Option<String>, Option<String>) {
    let mut date_col = None;
    let mut measure_col = None;
    let mut dim_col = None;

    let date_candidates = [
        "order_date",
        "date",
        "posting_date",
        "created_at",
        "transaction_date",
    ];
    let measure_candidates = [
        "revenue",
        "amount",
        "total",
        "grand_total",
        "net_total",
        "sales",
    ];

    if let Some(fields) = schema.get("fields").and_then(|f| f.as_array()) {
        for f in fields {
            if let (Some(name), Some(dtype)) = (
                f.get("name").and_then(|n| n.as_str()),
                f.get("data_type").and_then(|d| d.as_str()),
            ) {
                let lower_name = name.to_lowercase();
                let lower_dtype = dtype.to_lowercase();
                let is_numeric = lower_dtype.contains("int")
                    || lower_dtype.contains("float")
                    || lower_dtype.contains("double")
                    || lower_dtype.contains("decimal")
                    || lower_dtype.contains("numeric");
                let is_string = lower_dtype.contains("varchar")
                    || lower_dtype.contains("string")
                    || lower_dtype.contains("text");
                let is_date = lower_dtype.contains("date") || lower_dtype.contains("timestamp");

                if date_col.is_none() && (is_date || date_candidates.contains(&lower_name.as_str()))
                {
                    date_col = Some(name.to_string());
                }
                if measure_col.is_none()
                    && is_numeric
                    && measure_candidates.contains(&lower_name.as_str())
                {
                    measure_col = Some(name.to_string());
                }
                if dim_col.is_none() && is_string && date_col.as_deref() != Some(name) {
                    dim_col = Some(name.to_string());
                }
            }
        }

        // Fallbacks
        if measure_col.is_none() {
            for f in fields {
                if let (Some(name), Some(dtype)) = (
                    f.get("name").and_then(|n| n.as_str()),
                    f.get("data_type").and_then(|d| d.as_str()),
                ) {
                    let lower_dtype = dtype.to_lowercase();
                    let is_numeric = lower_dtype.contains("int")
                        || lower_dtype.contains("float")
                        || lower_dtype.contains("double")
                        || lower_dtype.contains("decimal")
                        || lower_dtype.contains("numeric");
                    if is_numeric {
                        measure_col = Some(name.to_string());
                        break;
                    }
                }
            }
        }
        if dim_col.is_none() && date_col.is_none() {
            for f in fields {
                if let (Some(name), Some(dtype)) = (
                    f.get("name").and_then(|n| n.as_str()),
                    f.get("data_type").and_then(|d| d.as_str()),
                ) {
                    let lower_dtype = dtype.to_lowercase();
                    let is_string = lower_dtype.contains("varchar")
                        || lower_dtype.contains("string")
                        || lower_dtype.contains("text");
                    if is_string {
                        dim_col = Some(name.to_string());
                        break;
                    }
                }
            }
        }
    }
    (date_col, measure_col, dim_col)
}

pub(super) fn build_dynamic_sql(source: &CurrentSourceSession) -> String {
    let path = source.file_path.replace("'", "''");
    let sql = if let (Some(date_c), Some(measure_c)) = (&source.date_column, &source.measure_column)
    {
        format!("SELECT \"{}\" AS label, SUM(\"{}\") AS value FROM read_csv_auto('{}') GROUP BY \"{}\" ORDER BY \"{}\" ASC", date_c, measure_c, path, date_c, date_c)
    } else if let (Some(dim_c), Some(measure_c)) =
        (&source.dimension_column, &source.measure_column)
    {
        format!("SELECT \"{}\" AS label, SUM(\"{}\") AS value FROM read_csv_auto('{}') GROUP BY \"{}\" ORDER BY value DESC", dim_c, measure_c, path, dim_c)
    } else {
        format!("SELECT * FROM read_csv_auto('{}') LIMIT 100", path)
    };
    println!("[build_dynamic_sql] generated sql: {}", sql);
    sql
}

pub(super) async fn resolve_current_source(state: &Arc<AppState>) -> Option<CurrentSourceSession> {
    {
        let memory_cache = state.current_source.lock().await;
        if let Some(src) = &*memory_cache {
            println!(
                "[resolve_current_source] current source resolved from memory: {}",
                src.file_path
            );
            return Some(src.clone());
        }
    }

    let session_dir = state.context.project_path.join("session");
    let session_file = session_dir.join("current_source.json");

    println!(
        "[resolve_current_source] metadata read path: {:?}",
        session_file
    );
    if let Ok(content) = tokio::fs::read_to_string(&session_file).await {
        if let Ok(src) = serde_json::from_str::<CurrentSourceSession>(&content) {
            let file_exists = tokio::fs::metadata(&src.file_path).await.is_ok();
            println!(
                "[resolve_current_source] file existence check result: {}",
                file_exists
            );

            if file_exists {
                println!(
                    "[resolve_current_source] current source resolved from disk: {}",
                    src.file_path
                );
                *state.current_source.lock().await = Some(src.clone());
                return Some(src);
            } else {
                println!("[resolve_current_source] source file missing on disk");
            }
        }
    }

    println!("[resolve_current_source] current source resolved from none");
    None
}

pub(super) async fn resolve_dataset_source(
    state: &Arc<AppState>,
    dataset_id: &str,
) -> Option<CurrentSourceSession> {
    {
        let memory_cache = state.dataset_registry.lock().await;
        if let Some(src) = memory_cache.get(dataset_id) {
            println!(
                "[resolve_dataset_source] resolved from memory for {}: {}",
                dataset_id, src.file_path
            );
            return Some(src.clone());
        }
    }

    let session_dir = state.context.project_path.join("session").join("datasets");
    let session_file = session_dir.join(format!("{}.json", dataset_id));

    println!(
        "[resolve_dataset_source] metadata read path: {:?}",
        session_file
    );
    if let Ok(content) = tokio::fs::read_to_string(&session_file).await {
        if let Ok(src) = serde_json::from_str::<CurrentSourceSession>(&content) {
            let file_exists = tokio::fs::metadata(&src.file_path).await.is_ok();
            println!(
                "[resolve_dataset_source] file existence check result: {}",
                file_exists
            );

            if file_exists {
                println!(
                    "[resolve_dataset_source] resolved from disk for {}: {}",
                    dataset_id, src.file_path
                );
                state
                    .dataset_registry
                    .lock()
                    .await
                    .insert(dataset_id.to_string(), src.clone());
                return Some(src);
            } else {
                println!("[resolve_dataset_source] source file missing on disk");
            }
        }
    }

    println!(
        "[resolve_dataset_source] failed to resolve dataset: {}",
        dataset_id
    );
    None
}

pub(super) async fn get_current_source(State(state): State<Arc<AppState>>) -> Json<Value> {
    if let Some(src) = resolve_current_source(&state).await {
        Json(json!({
            "has_source": true,
            "file_name": src.file_name,
            "bytes_written": src.bytes_written,
            "source_id": src.source_id,
            "dataset_id": src.dataset_id,
            "schema": src.schema,
            "uploaded_at": src.uploaded_at,
            "date_column": src.date_column,
            "measure_column": src.measure_column,
            "dimension_column": src.dimension_column
        }))
    } else {
        Json(json!({ "has_source": false }))
    }
}

fn sanitize_project_file_name(name: &str) -> String {
    let stripped = name.replace("..", "").replace("/", "").replace("\\", "");
    if stripped.trim().is_empty() {
        "source-file".to_string()
    } else {
        stripped
    }
}

pub(super) async fn save_project_source_file(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Response {
    let files_dir = state.context.project_path.join("files");
    if let Err(error) = tokio::fs::create_dir_all(&files_dir).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("Failed to create project files directory: {error}") })),
        )
            .into_response();
    }

    while let Ok(Some(mut field)) = multipart.next_field().await {
        if field.name() != Some("file") {
            continue;
        }
        let original_name = field
            .file_name()
            .map(sanitize_project_file_name)
            .unwrap_or_else(|| "source-file".to_string());
        let file_id = format!("{}-{}", uuid::Uuid::new_v4(), original_name);
        let file_path = files_dir.join(&file_id);
        let mut file = match File::create(&file_path).await {
            Ok(file) => file,
            Err(error) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": format!("Failed to create project source file: {error}") })),
                )
                    .into_response();
            }
        };
        let mut bytes_written = 0usize;
        loop {
            match field.chunk().await {
                Ok(Some(chunk)) => {
                    bytes_written += chunk.len();
                    if let Err(error) = file.write_all(&chunk).await {
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(json!({ "error": format!("Failed to write project source file: {error}") })),
                        )
                            .into_response();
                    }
                }
                Ok(None) => break,
                Err(error) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({ "error": format!("Could not read upload stream: {error}") })),
                    )
                        .into_response();
                }
            }
        }
        if bytes_written == 0 {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "File is empty" })),
            )
                .into_response();
        }
        let saved = ProjectSourceFile {
            file_id,
            original_name,
            file_path: file_path.to_string_lossy().to_string(),
            bytes_written,
        };
        return (StatusCode::CREATED, Json(saved)).into_response();
    }

    (
        StatusCode::BAD_REQUEST,
        Json(json!({ "error": "No file provided in upload" })),
    )
        .into_response()
}



#[derive(Debug, Deserialize)]
pub(super) struct ResolveProjectSourceQuery {
    name: String,
}

pub(super) async fn resolve_project_source_file(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(request): axum::extract::Query<ResolveProjectSourceQuery>,
) -> Response {
    let original_name = sanitize_project_file_name(&request.name);
    if original_name == "source-file" && request.name.trim() != "source-file" {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid source file name" }))).into_response();
    }
    let files_dir = state.context.project_path.join("files");
    let mut entries = match tokio::fs::read_dir(&files_dir).await {
        Ok(entries) => entries,
        Err(_) => return (StatusCode::NOT_FOUND, Json(json!({ "error": "Persisted source file not found" }))).into_response(),
    };
    let suffix = format!("-{original_name}");
    let mut best: Option<(std::time::SystemTime, String, u64)> = None;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name().to_string_lossy().to_string();
        if name != original_name && !name.ends_with(&suffix) { continue; }
        let Ok(metadata) = entry.metadata().await else { continue; };
        if !metadata.is_file() { continue; }
        let modified = metadata.modified().unwrap_or(std::time::UNIX_EPOCH);
        if best.as_ref().map(|(time, _, _)| modified > *time).unwrap_or(true) {
            best = Some((modified, name, metadata.len()));
        }
    }
    let Some((_, file_id, bytes_written)) = best else {
        return (StatusCode::NOT_FOUND, Json(json!({ "error": "Persisted source file not found" }))).into_response();
    };
    let file_path = files_dir.join(&file_id);
    (StatusCode::OK, Json(ProjectSourceFile {
        file_id,
        original_name,
        file_path: file_path.to_string_lossy().to_string(),
        bytes_written: bytes_written as usize,
    })).into_response()
}

pub(super) async fn download_project_source_file(
    State(state): State<Arc<AppState>>,
    Path(file_id): Path<String>,
) -> Response {
    if file_id.contains('/') || file_id.contains('\\') || file_id.contains("..") {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid project source file id" })),
        )
            .into_response();
    }

    let file_path = state.context.project_path.join("files").join(&file_id);
    match tokio::fs::metadata(&file_path).await {
        Ok(metadata) if metadata.is_file() => {}
        _ => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "error": "Project source file was not found at the saved path.",
                    "file_path": file_path.to_string_lossy()
                })),
            )
                .into_response();
        }
    }

    match tokio::fs::read(&file_path).await {
        Ok(bytes) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                header::CONTENT_TYPE,
                HeaderValue::from_static("application/octet-stream"),
            );
            if let Ok(value) =
                HeaderValue::from_str(&format!("attachment; filename=\"{}\"", file_id))
            {
                headers.insert(header::CONTENT_DISPOSITION, value);
            }
            (StatusCode::OK, headers, bytes).into_response()
        }
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("Could not read project source file: {error}") })),
        )
            .into_response(),
    }
}

pub(super) async fn import_csv(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;

    println!("[import-csv] request received");
    let files_dir = state.context.project_path.join("files");
    if let Err(e) = tokio::fs::create_dir_all(&files_dir).await {
        println!("[import-csv] error: failed to create directory: {:?}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Failed to create upload directory"})),
        )
            .into_response();
    }

    let mut saved_file_path = None;
    let mut original_filename = String::new();
    let mut bytes_written = 0;

    println!("[import-csv] multipart acquired");

    loop {
        match multipart.next_field().await {
            Ok(Some(mut field)) => {
                println!("[import-csv] field received: {:?}", field.name());
                if let Some(name) = field.name() {
                    if name == "file" {
                        if let Some(fname) = field.file_name() {
                            original_filename = fname.to_string();
                            println!("[import-csv] filename: {}", original_filename);
                            if let Some(content_type) = field.content_type() {
                                println!("[import-csv] content-type: {}", content_type);
                            }
                            let sanitized =
                                fname.replace("..", "").replace("/", "").replace("\\", "");

                            if !sanitized.to_lowercase().ends_with(".csv") {
                                println!("[import-csv] error: non-csv file");
                                return (
                                    StatusCode::BAD_REQUEST,
                                    Json(json!({ "error": "Only .csv files are allowed." })),
                                )
                                    .into_response();
                            }

                            let file_path = files_dir.join(&sanitized);

                            match File::create(&file_path).await {
                                Ok(mut file) => {
                                    loop {
                                        match field.chunk().await {
                                            Ok(Some(chunk)) => {
                                                println!(
                                                    "[import-csv] chunk received bytes: {}",
                                                    chunk.len()
                                                );
                                                if let Err(e) = file.write_all(&chunk).await {
                                                    println!("[import-csv] error: file save failure: {:?}", e);
                                                    return (
                                                        StatusCode::INTERNAL_SERVER_ERROR,
                                                        Json(
                                                            json!({ "error": "File save failure" }),
                                                        ),
                                                    )
                                                        .into_response();
                                                }
                                                bytes_written += chunk.len();
                                            }
                                            Ok(None) => {
                                                println!(
                                                    "[import-csv] write complete, total bytes: {}",
                                                    bytes_written
                                                );
                                                break;
                                            }
                                            Err(e) => {
                                                println!(
                                                    "[import-csv] error: chunk read error: {:?}",
                                                    e
                                                );
                                                return (
                                                    StatusCode::BAD_REQUEST,
                                                    Json(json!({ "error": "Upload stream error" })),
                                                )
                                                    .into_response();
                                            }
                                        }
                                    }
                                    saved_file_path = Some(file_path);
                                }
                                Err(e) => {
                                    println!("[import-csv] error: file creation failure: {:?}", e);
                                    return (
                                        StatusCode::INTERNAL_SERVER_ERROR,
                                        Json(json!({ "error": "Failed to create file on disk" })),
                                    )
                                        .into_response();
                                }
                            }
                        }
                    }
                }
            }
            Ok(None) => break, // No more fields
            Err(e) => {
                println!("[import-csv] error: multipart read error: {:?}", e);
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": "Invalid multipart request" })),
                )
                    .into_response();
            }
        }
    }

    if bytes_written == 0 {
        println!("[import-csv] error: empty file");
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "File is empty" })),
        )
            .into_response();
    }

    if let Some(path) = saved_file_path {
        let abs_path = path.to_string_lossy().to_string();

        let connector = state.context.source_registry.get_connector("csv").unwrap();
        let mut settings = std::collections::HashMap::new();
        settings.insert("file_path".to_string(), abs_path.clone());

        println!("[import-csv] schema discovery start");
        match connector.discover_schema("default", &settings).await {
            Ok(schema_str) => {
                println!("[import-csv] schema discovery end");
                let schema_json: Value = serde_json::from_str(&schema_str).unwrap_or(json!({}));

                // Update global state shortcut for Milestone 3
                *state.latest_csv_path.lock().await = Some(abs_path.clone());

                let dataset_id = format!("ds-{}", uuid::Uuid::new_v4());
                let source_id = format!("src-{}", uuid::Uuid::new_v4());

                let uploaded_at = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis()
                    .to_string();

                let (date_column, measure_column, dimension_column) = infer_columns(&schema_json);
                println!("[import-csv] selected date_column: {:?}", date_column);
                println!("[import-csv] selected measure_column: {:?}", measure_column);
                println!(
                    "[import-csv] selected dimension_column: {:?}",
                    dimension_column
                );

                let session = CurrentSourceSession {
                    file_name: original_filename.clone(),
                    file_path: abs_path.clone(),
                    bytes_written,
                    source_id: source_id.clone(),
                    dataset_id: dataset_id.clone(),
                    schema: schema_json.clone(),
                    uploaded_at,
                    date_column: date_column.clone(),
                    measure_column: measure_column.clone(),
                    dimension_column: dimension_column.clone(),
                };

                *state.current_source.lock().await = Some(session.clone());
                state
                    .dataset_registry
                    .lock()
                    .await
                    .insert(dataset_id.clone(), session.clone());

                let session_dir = state.context.project_path.join("session");
                let _ = tokio::fs::create_dir_all(&session_dir).await;

                let datasets_dir = session_dir.join("datasets");
                let _ = tokio::fs::create_dir_all(&datasets_dir).await;
                let dataset_file = datasets_dir.join(format!("{}.json", dataset_id));
                let session_file = session_dir.join("current_source.json");

                println!("[import-csv] metadata write path: {:?}", dataset_file);
                if let Ok(json_str) = serde_json::to_string_pretty(&session) {
                    let _ = tokio::fs::write(&dataset_file, &json_str).await;
                    let _ = tokio::fs::write(&session_file, &json_str).await;
                }

                println!("[import-csv] response sent");
                (
                    StatusCode::OK,
                    Json(json!({
                        "status": "success",
                        "source_id": source_id,
                        "dataset_id": dataset_id,
                        "file_name": original_filename,
                        "file_path": abs_path,
                        "schema": schema_json,
                        "bytes_written": bytes_written,
                        "date_column": date_column,
                        "measure_column": measure_column,
                        "dimension_column": dimension_column
                    })),
                )
                    .into_response()
            }
            Err(e) => {
                println!("[import-csv] error: schema discovery failure: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": format!("Schema discovery failed: {:?}", e) })),
                )
                    .into_response()
            }
        }
    } else {
        println!("[import-csv] error: missing file");
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "No file provided in upload" })),
        )
            .into_response()
    }
}
