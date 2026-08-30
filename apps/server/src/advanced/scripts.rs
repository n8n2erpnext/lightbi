//! Advanced workspace internal module. Behavior is preserved from the pre-split facade.

use super::*;

pub(super) fn split_script_statements(sql: &str) -> Result<Vec<String>, ApiError> {
    let statements = sql
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_string)
        .collect::<Vec<_>>();
    if statements.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_SCRIPT_EMPTY",
            "Enter SQL statements before review.",
        ));
    }
    if statements.len() > 5000 {
        return Err(ApiError::bad_request(
            "ADVANCED_SCRIPT_TOO_LARGE",
            "A script can include at most 5,000 statements.",
        ));
    }
    for statement in &statements {
        let first = statement
            .split_whitespace()
            .next()
            .unwrap_or_default()
            .to_ascii_uppercase();
        let allowed = matches!(
            first.as_str(),
            "CREATE" | "ALTER" | "DROP" | "TRUNCATE" | "INSERT" | "UPDATE" | "DELETE"
        );
        if !allowed {
            return Err(ApiError::bad_request(
                "ADVANCED_SCRIPT_STATEMENT_UNSUPPORTED",
                "Script commit only permits CREATE, ALTER, DROP, TRUNCATE, INSERT, UPDATE, or DELETE statements.",
            ));
        }
    }
    Ok(statements)
}

pub(crate) async fn preview_script(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<ScriptRequest>,
) -> Result<Json<ScriptPreviewResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    if matches!(
        session.backend,
        ConnectionBackend::Mongo(_) | ConnectionBackend::SqlServer(_)
    ) {
        return Err(ApiError::bad_request(
            "ADVANCED_SCRIPT_PROVIDER_UNSUPPORTED",
            "SQL script commit is not enabled for this read-only provider.",
        ));
    }
    let statements = split_script_statements(&request.sql)?;
    Ok(Json(ScriptPreviewResponse {
        statement_count: statements.len(),
        statements: statements
            .iter()
            .map(|statement| format!("{statement};"))
            .collect(),
        can_commit: session.safe_mode != "read_only",
    }))
}

pub(crate) async fn commit_script(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<ScriptRequest>,
) -> Result<Json<ScriptCommitResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    ensure_write_allowed(&session)?;
    let statements = split_script_statements(&request.sql)?;
    let executed = match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start PostgreSQL script transaction: {error}"
                ))
            })?;
            for statement in &statements {
                if let Err(error) = sqlx::query(AssertSqlSafe(statement.as_str()))
                    .execute(&mut *tx)
                    .await
                {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!(
                        "PostgreSQL script failed and was rolled back: {error}"
                    )));
                }
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit PostgreSQL script transaction: {error}"
                ))
            })?;
            statements.len()
        }
        ConnectionBackend::MySql(pool) => {
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start MySQL/MariaDB script transaction: {error}"
                ))
            })?;
            for statement in &statements {
                if let Err(error) = sqlx::query(AssertSqlSafe(statement.as_str()))
                    .execute(&mut *tx)
                    .await
                {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!(
                        "MySQL/MariaDB script failed and was rolled back: {error}"
                    )));
                }
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit MySQL/MariaDB script transaction: {error}"
                ))
            })?;
            statements.len()
        }
        ConnectionBackend::Sqlite(pool) => {
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start SQLite script transaction: {error}"
                ))
            })?;
            for statement in &statements {
                if let Err(error) = sqlx::query(AssertSqlSafe(statement.as_str()))
                    .execute(&mut *tx)
                    .await
                {
                    tx.rollback().await.ok();
                    return Err(ApiError::database(format!(
                        "SQLite script failed and was rolled back: {error}"
                    )));
                }
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit SQLite script transaction: {error}"
                ))
            })?;
            statements.len()
        }
        ConnectionBackend::Mongo(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_SCRIPT_PROVIDER_UNSUPPORTED",
                "MongoDB SQL script commit is not enabled.",
            ))
        }
        ConnectionBackend::SqlServer(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_SCRIPT_PROVIDER_UNSUPPORTED",
                "SQL Server is read-only in this beta provider.",
            ))
        }
    };
    invalidate_mutation_caches(&state, &connection_id).await;
    Ok(Json(ScriptCommitResponse {
        executed_statements: executed,
    }))
}
