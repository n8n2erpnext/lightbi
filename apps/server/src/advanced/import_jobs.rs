//! Advanced workspace internal module. Behavior is preserved from the pre-split facade.

use super::*;

pub(crate) async fn start_sql_import(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<ScriptRequest>,
) -> Result<Json<ImportStartResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    ensure_write_allowed(&session)?;
    if matches!(session.backend, ConnectionBackend::Mongo(_)) {
        return Err(ApiError::bad_request(
            "ADVANCED_SCRIPT_PROVIDER_UNSUPPORTED",
            "MongoDB SQL script import is not enabled.",
        ));
    }
    let statements = split_script_statements(&request.sql)?;
    let job_id = Uuid::new_v4().to_string();
    state.advanced.import_jobs.write().await.insert(
        job_id.clone(),
        ImportJob {
            status: ExportJobStatus::Running,
            statement_count: statements.len(),
            executed_statements: 0,
            skipped_statements: 0,
            error: None,
            abort_handle: None,
        },
    );
    let task_state = state.clone();
    let task_job_id = job_id.clone();
    let task_connection_id = connection_id.clone();
    let task = tokio::spawn(async move {
        let outcome = run_sql_import_job(
            session,
            task_connection_id,
            task_job_id.clone(),
            statements,
            task_state.clone(),
        )
        .await;
        let mut jobs = task_state.advanced.import_jobs.write().await;
        if let Some(job) = jobs.get_mut(&task_job_id) {
            if job.status == ExportJobStatus::Cancelled {
                return;
            }
            match outcome {
                Ok(()) => {
                    job.status = ExportJobStatus::Completed;
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
    if let Some(job) = state.advanced.import_jobs.write().await.get_mut(&job_id) {
        job.abort_handle = Some(task.abort_handle());
    }
    Ok(Json(ImportStartResponse { job_id }))
}

pub(crate) async fn start_csv_import(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<ImportStartResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    ensure_write_allowed(&session)?;
    if matches!(session.backend, ConnectionBackend::Mongo(_)) {
        return Err(ApiError::bad_request(
            "ADVANCED_IMPORT_PROVIDER_UNSUPPORTED",
            "CSV import targets relational database sessions only.",
        ));
    }
    let mut file_bytes = Vec::new();
    let mut schema = String::new();
    let mut table = String::new();
    let mut mapping = HashMap::<String, String>::new();
    let mut error_mode = ImportErrorMode::StopRollback;

    while let Some(field) = multipart.next_field().await.map_err(|error| {
        ApiError::bad_request(
            "ADVANCED_IMPORT_MULTIPART",
            format!("Could not read import form: {error}"),
        )
    })? {
        let name = field.name().unwrap_or_default().to_string();
        match name.as_str() {
            "file" => {
                file_bytes = field
                    .bytes()
                    .await
                    .map_err(|error| {
                        ApiError::bad_request(
                            "ADVANCED_IMPORT_FILE",
                            format!("Could not read CSV file: {error}"),
                        )
                    })?
                    .to_vec();
            }
            "schema" => schema = field.text().await.unwrap_or_default(),
            "table" => table = field.text().await.unwrap_or_default(),
            "mapping" => {
                let text = field.text().await.unwrap_or_default();
                mapping =
                    serde_json::from_str::<HashMap<String, String>>(&text).unwrap_or_default();
            }
            "errorMode" => {
                error_mode = match field.text().await.unwrap_or_default().as_str() {
                    "stop_commit" => ImportErrorMode::StopCommit,
                    "skip_continue" => ImportErrorMode::SkipContinue,
                    _ => ImportErrorMode::StopRollback,
                };
            }
            _ => {}
        }
    }
    if file_bytes.is_empty() || schema.trim().is_empty() || table.trim().is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_IMPORT_REQUIRED",
            "CSV import requires file, schema, and table.",
        ));
    }
    let rows = parse_csv_import_rows(&file_bytes, &mapping)?;
    let job_id = Uuid::new_v4().to_string();
    state.advanced.import_jobs.write().await.insert(
        job_id.clone(),
        ImportJob {
            status: ExportJobStatus::Running,
            statement_count: rows.len(),
            executed_statements: 0,
            skipped_statements: 0,
            error: None,
            abort_handle: None,
        },
    );
    let task_state = state.clone();
    let task_job_id = job_id.clone();
    let task_connection_id = connection_id.clone();
    let task = tokio::spawn(async move {
        let outcome = run_csv_import_job(
            session,
            task_connection_id,
            task_job_id.clone(),
            schema,
            table,
            rows,
            error_mode,
            task_state.clone(),
        )
        .await;
        let mut jobs = task_state.advanced.import_jobs.write().await;
        if let Some(job) = jobs.get_mut(&task_job_id) {
            if job.status == ExportJobStatus::Cancelled {
                return;
            }
            match outcome {
                Ok(message) => {
                    job.status = ExportJobStatus::Completed;
                    job.error = message;
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
    if let Some(job) = state.advanced.import_jobs.write().await.get_mut(&job_id) {
        job.abort_handle = Some(task.abort_handle());
    }
    Ok(Json(ImportStartResponse { job_id }))
}

pub(crate) async fn get_import_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<Json<ImportJobResponse>, ApiError> {
    let jobs = state.advanced.import_jobs.read().await;
    let job = jobs.get(&job_id).ok_or_else(|| {
        ApiError::bad_request("ADVANCED_IMPORT_NOT_FOUND", "Import job was not found.")
    })?;
    Ok(Json(import_job_response(&job_id, job)))
}

pub(crate) async fn cancel_import_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> StatusCode {
    let mut jobs = state.advanced.import_jobs.write().await;
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

fn import_job_response(job_id: &str, job: &ImportJob) -> ImportJobResponse {
    let status = match job.status {
        ExportJobStatus::Running => "running",
        ExportJobStatus::Completed => "completed",
        ExportJobStatus::Failed => "failed",
        ExportJobStatus::Cancelled => "cancelled",
    }
    .to_string();
    ImportJobResponse {
        job_id: job_id.to_string(),
        status,
        statement_count: job.statement_count,
        executed_statements: job.executed_statements,
        skipped_statements: job.skipped_statements,
        error: job.error.clone(),
    }
}

fn parse_csv_import_rows(
    file_bytes: &[u8],
    mapping: &HashMap<String, String>,
) -> Result<Vec<HashMap<String, Value>>, ApiError> {
    let mut reader = csv::ReaderBuilder::new()
        .flexible(true)
        .from_reader(file_bytes);
    let headers = reader
        .headers()
        .map_err(|error| {
            ApiError::bad_request(
                "ADVANCED_IMPORT_CSV_HEADERS",
                format!("Could not read CSV headers: {error}"),
            )
        })?
        .iter()
        .map(str::to_string)
        .collect::<Vec<_>>();
    let effective_mapping = if mapping.is_empty() {
        headers
            .iter()
            .map(|name| (name.clone(), name.clone()))
            .collect::<HashMap<_, _>>()
    } else {
        mapping.clone()
    };
    let mut rows = Vec::new();
    for record in reader.records() {
        let record = record.map_err(|error| {
            ApiError::bad_request(
                "ADVANCED_IMPORT_CSV_ROW",
                format!("Could not read CSV row: {error}"),
            )
        })?;
        let mut row = HashMap::new();
        for (target, source) in &effective_mapping {
            if target.trim().is_empty() || source.trim().is_empty() {
                continue;
            }
            if let Some(index) = headers.iter().position(|header| header == source) {
                let value = record.get(index).unwrap_or_default();
                row.insert(
                    target.clone(),
                    if value.trim().is_empty() {
                        Value::Null
                    } else {
                        Value::String(value.to_string())
                    },
                );
            }
        }
        if !row.is_empty() {
            rows.push(row);
        }
        if rows.len() > MAX_IMPORT_ROWS {
            return Err(ApiError::bad_request(
                "ADVANCED_IMPORT_ROW_LIMIT",
                "CSV import is limited to 100,000 rows per interactive job.",
            ));
        }
    }
    if rows.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_IMPORT_EMPTY",
            "CSV import did not contain mapped rows.",
        ));
    }
    Ok(rows)
}

async fn run_sql_import_job(
    session: ConnectionSession,
    connection_id: String,
    job_id: String,
    statements: Vec<String>,
    state: Arc<AppState>,
) -> Result<(), ApiError> {
    match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start PostgreSQL import transaction: {error}"
                ))
            })?;
            for statement in &statements {
                if let Err(error) = sqlx::query(AssertSqlSafe(statement.as_str()))
                    .execute(&mut *tx)
                    .await
                {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!(
                        "PostgreSQL import failed and was rolled back: {error}"
                    )));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit PostgreSQL import transaction: {error}"
                ))
            })?;
        }
        ConnectionBackend::MySql(pool) => {
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start MySQL/MariaDB import transaction: {error}"
                ))
            })?;
            for statement in &statements {
                if let Err(error) = sqlx::query(AssertSqlSafe(statement.as_str()))
                    .execute(&mut *tx)
                    .await
                {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!(
                        "MySQL/MariaDB import failed and was rolled back: {error}"
                    )));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit MySQL/MariaDB import transaction: {error}"
                ))
            })?;
        }
        ConnectionBackend::Sqlite(pool) => {
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start SQLite import transaction: {error}"
                ))
            })?;
            for statement in &statements {
                if let Err(error) = sqlx::query(AssertSqlSafe(statement.as_str()))
                    .execute(&mut *tx)
                    .await
                {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!(
                        "SQLite import failed and was rolled back: {error}"
                    )));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit SQLite import transaction: {error}"
                ))
            })?;
        }
        ConnectionBackend::Mongo(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_SCRIPT_PROVIDER_UNSUPPORTED",
                "MongoDB SQL script import is not enabled.",
            ))
        }
        ConnectionBackend::SqlServer(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_IMPORT_PROVIDER_UNSUPPORTED",
                "SQL Server import is not enabled for this read-only beta provider.",
            ))
        }
    }
    invalidate_mutation_caches(&state, &connection_id).await;
    Ok(())
}

async fn run_csv_import_job(
    session: ConnectionSession,
    connection_id: String,
    job_id: String,
    schema: String,
    table: String,
    rows: Vec<HashMap<String, Value>>,
    error_mode: ImportErrorMode,
    state: Arc<AppState>,
) -> Result<Option<String>, ApiError> {
    match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let schemas = discover_postgres_schema(pool).await?;
            let table_node = schemas
                .iter()
                .find(|item| item.name == schema.trim())
                .and_then(|schema_node| {
                    schema_node
                        .tables
                        .iter()
                        .find(|item| item.name == table.trim())
                })
                .ok_or_else(|| ApiError::not_found("CSV import target table was not found."))?;
            validate_import_columns(table_node, &rows)?;
            if error_mode == ImportErrorMode::SkipContinue {
                let mut skipped = 0usize;
                for row in &rows {
                    match postgres_insert_values(pool, schema.trim(), table.trim(), row).await {
                        Ok(()) => increment_import_job(&state, &job_id).await?,
                        Err(_) => {
                            skipped += 1;
                            skip_import_job(&state, &job_id).await?;
                        }
                    }
                }
                invalidate_mutation_caches(&state, &connection_id).await;
                return Ok((skipped > 0).then(|| format!("Skipped {skipped} CSV row(s).")));
            }
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start PostgreSQL CSV import transaction: {error}"
                ))
            })?;
            for row in &rows {
                if let Err(error) =
                    postgres_insert_values_tx(&mut tx, schema.trim(), table.trim(), row).await
                {
                    if error_mode == ImportErrorMode::StopCommit {
                        tx.commit().await.ok();
                    } else {
                        tx.rollback().await.ok();
                    }
                    return Err(ApiError::database(format!(
                        "PostgreSQL CSV import failed: {error}"
                    )));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit PostgreSQL CSV import transaction: {error}"
                ))
            })?;
        }
        ConnectionBackend::MySql(pool) => {
            if schema.trim() != session.database {
                return Err(ApiError::bad_request(
                    "ADVANCED_IMPORT_SCHEMA_INVALID",
                    "MySQL/MariaDB CSV import must target the connected database.",
                ));
            }
            let schemas = discover_mysql_schema(pool, &session.database).await?;
            let table_node = schemas[0]
                .tables
                .iter()
                .find(|item| item.name == table.trim())
                .ok_or_else(|| ApiError::not_found("CSV import target table was not found."))?;
            validate_import_columns(table_node, &rows)?;
            if error_mode == ImportErrorMode::SkipContinue {
                let mut skipped = 0usize;
                for row in &rows {
                    match mysql_insert_values(pool, schema.trim(), table.trim(), row).await {
                        Ok(()) => increment_import_job(&state, &job_id).await?,
                        Err(_) => {
                            skipped += 1;
                            skip_import_job(&state, &job_id).await?;
                        }
                    }
                }
                invalidate_mutation_caches(&state, &connection_id).await;
                return Ok((skipped > 0).then(|| format!("Skipped {skipped} CSV row(s).")));
            }
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start MySQL/MariaDB CSV import transaction: {error}"
                ))
            })?;
            for row in &rows {
                if let Err(error) =
                    mysql_insert_values_tx(&mut tx, schema.trim(), table.trim(), row).await
                {
                    if error_mode == ImportErrorMode::StopCommit {
                        tx.commit().await.ok();
                    } else {
                        tx.rollback().await.ok();
                    }
                    return Err(ApiError::database(format!(
                        "MySQL/MariaDB CSV import failed: {error}"
                    )));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit MySQL/MariaDB CSV import transaction: {error}"
                ))
            })?;
        }
        ConnectionBackend::Sqlite(pool) => {
            if schema.trim() != "main" {
                return Err(ApiError::bad_request(
                    "ADVANCED_IMPORT_SCHEMA_INVALID",
                    "SQLite CSV import requires the main schema.",
                ));
            }
            let schemas = discover_sqlite_schema(pool).await?;
            let table_node = schemas[0]
                .tables
                .iter()
                .find(|item| item.name == table.trim())
                .ok_or_else(|| ApiError::not_found("CSV import target table was not found."))?;
            validate_import_columns(table_node, &rows)?;
            if error_mode == ImportErrorMode::SkipContinue {
                let mut skipped = 0usize;
                for row in &rows {
                    match sqlite_insert_values(pool, table.trim(), row).await {
                        Ok(()) => increment_import_job(&state, &job_id).await?,
                        Err(_) => {
                            skipped += 1;
                            skip_import_job(&state, &job_id).await?;
                        }
                    }
                }
                invalidate_mutation_caches(&state, &connection_id).await;
                return Ok((skipped > 0).then(|| format!("Skipped {skipped} CSV row(s).")));
            }
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start SQLite CSV import transaction: {error}"
                ))
            })?;
            for row in &rows {
                if let Err(error) = sqlite_insert_values_tx(&mut tx, table.trim(), row).await {
                    if error_mode == ImportErrorMode::StopCommit {
                        tx.commit().await.ok();
                    } else {
                        tx.rollback().await.ok();
                    }
                    return Err(ApiError::database(format!(
                        "SQLite CSV import failed: {error}"
                    )));
                }
                increment_import_job(&state, &job_id).await?;
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit SQLite CSV import transaction: {error}"
                ))
            })?;
        }
        ConnectionBackend::Mongo(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_IMPORT_PROVIDER_UNSUPPORTED",
                "CSV import targets relational database sessions only.",
            ))
        }
        ConnectionBackend::SqlServer(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_IMPORT_PROVIDER_UNSUPPORTED",
                "SQL Server import is not enabled for this read-only beta provider.",
            ))
        }
    }
    invalidate_mutation_caches(&state, &connection_id).await;
    Ok(None)
}

fn validate_import_columns(
    table: &TableNode,
    rows: &[HashMap<String, Value>],
) -> Result<(), ApiError> {
    if !table.writable || table.kind != "base_table" {
        return Err(ApiError::bad_request(
            "ADVANCED_IMPORT_TABLE_READ_ONLY",
            "CSV import target must be a writable base table.",
        ));
    }
    let allowed = table
        .columns
        .iter()
        .map(|column| column.name.as_str())
        .collect::<Vec<_>>();
    for column in rows.first().into_iter().flat_map(|row| row.keys()) {
        if !allowed.iter().any(|allowed| allowed == column) {
            return Err(ApiError::bad_request(
                "ADVANCED_IMPORT_COLUMN_INVALID",
                format!("CSV import target column {column} does not exist."),
            ));
        }
    }
    Ok(())
}

async fn increment_import_job(state: &Arc<AppState>, job_id: &str) -> Result<(), ApiError> {
    if let Some(job) = state.advanced.import_jobs.write().await.get_mut(job_id) {
        if job.status == ExportJobStatus::Cancelled {
            return Err(ApiError::bad_request(
                "ADVANCED_IMPORT_CANCELLED",
                "Import job was cancelled.",
            ));
        }
        job.executed_statements += 1;
    }
    Ok(())
}

async fn skip_import_job(state: &Arc<AppState>, job_id: &str) -> Result<(), ApiError> {
    if let Some(job) = state.advanced.import_jobs.write().await.get_mut(job_id) {
        if job.status == ExportJobStatus::Cancelled {
            return Err(ApiError::bad_request(
                "ADVANCED_IMPORT_CANCELLED",
                "Import job was cancelled.",
            ));
        }
        job.skipped_statements += 1;
    }
    Ok(())
}

async fn postgres_insert_values(
    pool: &PgPool,
    schema: &str,
    table: &str,
    row: &HashMap<String, Value>,
) -> Result<(), sqlx::Error> {
    let mut builder = postgres_insert_builder(schema, table, row);
    builder.build().execute(pool).await.map(|_| ())
}

async fn postgres_insert_values_tx(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    schema: &str,
    table: &str,
    row: &HashMap<String, Value>,
) -> Result<(), sqlx::Error> {
    let mut builder = postgres_insert_builder(schema, table, row);
    builder.build().execute(&mut **tx).await.map(|_| ())
}

fn postgres_insert_builder<'a>(
    schema: &'a str,
    table: &'a str,
    row: &'a HashMap<String, Value>,
) -> QueryBuilder<Postgres> {
    let columns = sorted_keys(row);
    let mut builder = QueryBuilder::<Postgres>::new(format!(
        "INSERT INTO {}.{} (",
        quote_pg_identifier(schema),
        quote_pg_identifier(table)
    ));
    for (index, column) in columns.iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        builder.push(quote_pg_identifier(column));
    }
    builder.push(") VALUES (");
    for (index, column) in columns.iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        postgres_push_import_value(&mut builder, &row[column]);
    }
    builder.push(")");
    builder
}

fn postgres_push_import_value(builder: &mut QueryBuilder<Postgres>, value: &Value) {
    match value {
        Value::Null => {
            builder.push("NULL");
        }
        Value::String(value) => {
            builder.push_bind(value.clone());
        }
        Value::Bool(value) => {
            builder.push_bind(*value);
        }
        Value::Number(value) if value.is_i64() => {
            builder.push_bind(value.as_i64().unwrap_or_default());
        }
        Value::Number(value) if value.is_u64() => {
            builder.push_bind(
                value
                    .as_u64()
                    .and_then(|item| i64::try_from(item).ok())
                    .unwrap_or(i64::MAX),
            );
        }
        Value::Number(value) => {
            builder.push_bind(value.as_f64().unwrap_or_default());
        }
        other => {
            builder.push_bind(other.to_string());
        }
    };
}

async fn mysql_insert_values(
    pool: &MySqlPool,
    schema: &str,
    table: &str,
    row: &HashMap<String, Value>,
) -> Result<(), sqlx::Error> {
    let mut builder = mysql_insert_builder(schema, table, row);
    builder.build().execute(pool).await.map(|_| ())
}

async fn mysql_insert_values_tx(
    tx: &mut sqlx::Transaction<'_, MySql>,
    schema: &str,
    table: &str,
    row: &HashMap<String, Value>,
) -> Result<(), sqlx::Error> {
    let mut builder = mysql_insert_builder(schema, table, row);
    builder.build().execute(&mut **tx).await.map(|_| ())
}

fn mysql_insert_builder<'a>(
    schema: &'a str,
    table: &'a str,
    row: &'a HashMap<String, Value>,
) -> QueryBuilder<MySql> {
    let columns = sorted_keys(row);
    let mut builder = QueryBuilder::<MySql>::new(format!(
        "INSERT INTO {}.{} (",
        quote_mysql_identifier(schema),
        quote_mysql_identifier(table)
    ));
    for (index, column) in columns.iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        builder.push(quote_mysql_identifier(column));
    }
    builder.push(") VALUES (");
    for (index, column) in columns.iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        mysql_push_value(&mut builder, &row[column]);
    }
    builder.push(")");
    builder
}

async fn sqlite_insert_values(
    pool: &SqlitePool,
    table: &str,
    row: &HashMap<String, Value>,
) -> Result<(), sqlx::Error> {
    let mut builder = sqlite_insert_builder(table, row);
    builder.build().execute(pool).await.map(|_| ())
}

async fn sqlite_insert_values_tx(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    table: &str,
    row: &HashMap<String, Value>,
) -> Result<(), sqlx::Error> {
    let mut builder = sqlite_insert_builder(table, row);
    builder.build().execute(&mut **tx).await.map(|_| ())
}

fn sqlite_insert_builder<'a>(
    table: &'a str,
    row: &'a HashMap<String, Value>,
) -> QueryBuilder<Sqlite> {
    let columns = sorted_keys(row);
    let mut builder =
        QueryBuilder::<Sqlite>::new(format!("INSERT INTO {} (", quote_sql_identifier(table)));
    for (index, column) in columns.iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        builder.push(quote_sql_identifier(column));
    }
    builder.push(") VALUES (");
    for (index, column) in columns.iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        sqlite_push_value(&mut builder, &row[column]);
    }
    builder.push(")");
    builder
}
