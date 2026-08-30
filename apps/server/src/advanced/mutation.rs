//! Advanced workspace internal module. Behavior is preserved from the pre-split facade.

use super::*;

pub(super) fn validate_mutation_request(
    table: &TableNode,
    request: &MutationRequest,
) -> Result<Vec<String>, ApiError> {
    if !table.writable || table.kind != "base_table" {
        return Err(ApiError::bad_request(
            "ADVANCED_MUTATION_TABLE_READ_ONLY",
            "Only writable base tables can be updated.",
        ));
    }
    if request.rows.is_empty() || request.rows.len() > 100 {
        return Err(ApiError::bad_request(
            "ADVANCED_MUTATION_ROW_LIMIT",
            "A mutation must contain between 1 and 100 rows.",
        ));
    }
    let primary_keys = table
        .columns
        .iter()
        .filter(|column| column.primary_key)
        .map(|column| column.name.clone())
        .collect::<Vec<_>>();
    if primary_keys.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_MUTATION_KEY_REQUIRED",
            "The table has no primary key and cannot be updated safely.",
        ));
    }
    for row in &request.rows {
        match row.action {
            MutationAction::Insert => {
                if row.changes.is_empty() || row.changes.len() > 100 {
                    return Err(ApiError::bad_request(
                        "ADVANCED_MUTATION_CHANGE_LIMIT",
                        "Inserted rows must contain between 1 and 100 columns.",
                    ));
                }
            }
            MutationAction::Update => {
                if row.changes.is_empty() || row.changes.len() > 50 {
                    return Err(ApiError::bad_request(
                        "ADVANCED_MUTATION_CHANGE_LIMIT",
                        "Each row must change between 1 and 50 columns.",
                    ));
                }
                if row.key.len() != primary_keys.len()
                    || primary_keys.iter().any(|key| !row.key.contains_key(key))
                {
                    return Err(ApiError::bad_request("ADVANCED_MUTATION_KEY_INCOMPLETE", "Every primary-key column is required and extra key columns are not allowed."));
                }
            }
            MutationAction::Delete => {
                if row.key.len() != primary_keys.len()
                    || primary_keys.iter().any(|key| !row.key.contains_key(key))
                {
                    return Err(ApiError::bad_request("ADVANCED_MUTATION_KEY_INCOMPLETE", "Every primary-key column is required and extra key columns are not allowed."));
                }
            }
        }
        for column in row.changes.keys() {
            if row.action == MutationAction::Update && primary_keys.contains(column) {
                return Err(ApiError::bad_request(
                    "ADVANCED_MUTATION_PRIMARY_KEY",
                    "Primary-key columns cannot be edited in this phase.",
                ));
            }
            if !table
                .columns
                .iter()
                .any(|candidate| &candidate.name == column)
            {
                return Err(ApiError::bad_request(
                    "ADVANCED_MUTATION_COLUMN_INVALID",
                    "A changed column is not present in the table.",
                ));
            }
            if row.action == MutationAction::Update && !row.expected.contains_key(column) {
                return Err(ApiError::bad_request(
                    "ADVANCED_MUTATION_EXPECTED_REQUIRED",
                    "Every changed column requires its expected original value.",
                ));
            }
        }
    }
    Ok(primary_keys)
}

pub(super) fn sorted_keys(values: &HashMap<String, Value>) -> Vec<String> {
    let mut keys = values.keys().cloned().collect::<Vec<_>>();
    keys.sort();
    keys
}

fn mutation_scalar(value: &Value) -> String {
    match value {
        Value::String(value) => value.clone(),
        other => other.to_string(),
    }
}

fn postgres_cast_type(column: &ColumnNode) -> Result<&'static str, ApiError> {
    match column.native_type.to_ascii_lowercase().as_str() {
        "smallint" => Ok("smallint"),
        "integer" => Ok("integer"),
        "bigint" => Ok("bigint"),
        "decimal" => Ok("decimal"),
        "numeric" => Ok("numeric"),
        "real" => Ok("real"),
        "double precision" => Ok("double precision"),
        "smallserial" => Ok("smallint"),
        "serial" => Ok("integer"),
        "bigserial" => Ok("bigint"),
        "boolean" => Ok("boolean"),
        "text" => Ok("text"),
        "character" => Ok("character"),
        "character varying" => Ok("character varying"),
        "date" => Ok("date"),
        "time without time zone" => Ok("time without time zone"),
        "time with time zone" => Ok("time with time zone"),
        "timestamp without time zone" => Ok("timestamp without time zone"),
        "timestamp with time zone" => Ok("timestamp with time zone"),
        "uuid" => Ok("uuid"),
        "json" => Ok("json"),
        "jsonb" => Ok("jsonb"),
        _ => Err(ApiError::bad_request(
            "ADVANCED_MUTATION_TYPE_UNSUPPORTED",
            "A changed or key column uses a PostgreSQL type that is not enabled for safe source commit.",
        )),
    }
}

fn mutation_column<'a>(table: &'a TableNode, name: &str) -> Result<&'a ColumnNode, ApiError> {
    table
        .columns
        .iter()
        .find(|column| column.name == name)
        .ok_or_else(|| {
            ApiError::bad_request(
                "ADVANCED_MUTATION_COLUMN_INVALID",
                "A mutation column is not present in the table.",
            )
        })
}

pub(super) fn sqlite_push_value(builder: &mut QueryBuilder<Sqlite>, value: &Value) {
    match value {
        Value::Null => {
            builder.push("NULL");
        }
        Value::Bool(value) => {
            builder.push_bind(*value);
        }
        Value::Number(value) if value.is_i64() => {
            builder.push_bind(value.as_i64().unwrap_or_default());
        }
        Value::Number(value) if value.is_u64() => {
            builder.push_bind(value.as_u64().unwrap_or_default() as i64);
        }
        Value::Number(value) => {
            builder.push_bind(value.as_f64().unwrap_or_default());
        }
        Value::String(value) => {
            builder.push_bind(value.clone());
        }
        other => {
            builder.push_bind(other.to_string());
        }
    };
}

fn sqlite_push_condition(builder: &mut QueryBuilder<Sqlite>, column: &str, value: &Value) {
    builder.push(quote_sql_identifier(column));
    if value.is_null() {
        builder.push(" IS NULL");
    } else {
        builder.push(" = ");
        sqlite_push_value(builder, value);
    }
}

pub(super) fn sqlite_mutation_builder<'a>(
    request: &'a MutationRequest,
    row: &'a RowMutationRequest,
) -> QueryBuilder<Sqlite> {
    if row.action == MutationAction::Insert {
        let columns = sorted_keys(&row.changes);
        let mut builder = QueryBuilder::<Sqlite>::new(format!(
            "INSERT INTO {} (",
            quote_sql_identifier(&request.table)
        ));
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
            sqlite_push_value(&mut builder, &row.changes[column]);
        }
        builder.push(")");
        return builder;
    }
    if row.action == MutationAction::Delete {
        let mut builder = QueryBuilder::<Sqlite>::new(format!(
            "DELETE FROM {} WHERE ",
            quote_sql_identifier(&request.table)
        ));
        for (index, column) in sorted_keys(&row.key).iter().enumerate() {
            if index > 0 {
                builder.push(" AND ");
            }
            sqlite_push_condition(&mut builder, column, &row.key[column]);
        }
        return builder;
    }
    let mut builder = QueryBuilder::<Sqlite>::new(format!(
        "UPDATE {} SET ",
        quote_sql_identifier(&request.table)
    ));
    for (index, column) in sorted_keys(&row.changes).iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        builder.push(quote_sql_identifier(column)).push(" = ");
        sqlite_push_value(&mut builder, &row.changes[column]);
    }
    builder.push(" WHERE ");
    let mut condition_index = 0;
    for column in sorted_keys(&row.key) {
        if condition_index > 0 {
            builder.push(" AND ");
        }
        sqlite_push_condition(&mut builder, &column, &row.key[&column]);
        condition_index += 1;
    }
    for column in sorted_keys(&row.changes) {
        builder.push(" AND ");
        sqlite_push_condition(&mut builder, &column, &row.expected[&column]);
    }
    builder
}

fn postgres_push_value(
    builder: &mut QueryBuilder<Postgres>,
    column: &ColumnNode,
    value: &Value,
) -> Result<(), ApiError> {
    if value.is_null() {
        builder.push("NULL");
    } else {
        let cast_type = postgres_cast_type(column)?;
        builder
            .push("CAST(")
            .push_bind(mutation_scalar(value))
            .push(" AS ")
            .push(cast_type)
            .push(")");
    }
    Ok(())
}

fn postgres_push_condition(
    builder: &mut QueryBuilder<Postgres>,
    table: &TableNode,
    column: &str,
    value: &Value,
) -> Result<(), ApiError> {
    builder.push(quote_sql_identifier(column));
    if value.is_null() {
        builder.push(" IS NULL");
    } else {
        builder.push(" = ");
        postgres_push_value(builder, mutation_column(table, column)?, value)?;
    }
    Ok(())
}

pub(super) fn postgres_mutation_builder<'a>(
    request: &'a MutationRequest,
    row: &'a RowMutationRequest,
    table: &TableNode,
) -> Result<QueryBuilder<Postgres>, ApiError> {
    if row.action == MutationAction::Insert {
        let columns = sorted_keys(&row.changes);
        let mut builder = QueryBuilder::<Postgres>::new(format!(
            "INSERT INTO {}.{} (",
            quote_sql_identifier(&request.schema),
            quote_sql_identifier(&request.table)
        ));
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
            postgres_push_value(
                &mut builder,
                mutation_column(table, column)?,
                &row.changes[column],
            )?;
        }
        builder.push(")");
        return Ok(builder);
    }
    if row.action == MutationAction::Delete {
        let mut builder = QueryBuilder::<Postgres>::new(format!(
            "DELETE FROM {}.{} WHERE ",
            quote_sql_identifier(&request.schema),
            quote_sql_identifier(&request.table)
        ));
        for (index, column) in sorted_keys(&row.key).iter().enumerate() {
            if index > 0 {
                builder.push(" AND ");
            }
            postgres_push_condition(&mut builder, table, column, &row.key[column])?;
        }
        return Ok(builder);
    }
    let mut builder = QueryBuilder::<Postgres>::new(format!(
        "UPDATE {}.{} SET ",
        quote_sql_identifier(&request.schema),
        quote_sql_identifier(&request.table)
    ));
    for (index, column) in sorted_keys(&row.changes).iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        builder.push(quote_sql_identifier(column)).push(" = ");
        postgres_push_value(
            &mut builder,
            mutation_column(table, column)?,
            &row.changes[column],
        )?;
    }
    builder.push(" WHERE ");
    for (index, column) in sorted_keys(&row.key).iter().enumerate() {
        if index > 0 {
            builder.push(" AND ");
        }
        postgres_push_condition(&mut builder, table, column, &row.key[column])?;
    }
    for column in sorted_keys(&row.changes) {
        builder.push(" AND ");
        postgres_push_condition(&mut builder, table, &column, &row.expected[&column])?;
    }
    Ok(builder)
}

pub(super) fn mysql_push_value(builder: &mut QueryBuilder<MySql>, value: &Value) {
    match value {
        Value::Null => {
            builder.push("NULL");
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
        Value::String(value) => {
            builder.push_bind(value.clone());
        }
        other => {
            builder.push_bind(other.to_string());
        }
    };
}

fn mysql_push_condition(builder: &mut QueryBuilder<MySql>, column: &str, value: &Value) {
    builder.push(quote_mysql_identifier(column));
    if value.is_null() {
        builder.push(" IS NULL");
    } else {
        builder.push(" = ");
        mysql_push_value(builder, value);
    }
}

pub(super) fn mysql_mutation_builder<'a>(
    request: &'a MutationRequest,
    row: &'a RowMutationRequest,
) -> QueryBuilder<MySql> {
    if row.action == MutationAction::Insert {
        let columns = sorted_keys(&row.changes);
        let mut builder = QueryBuilder::<MySql>::new(format!(
            "INSERT INTO {}.{} (",
            quote_mysql_identifier(&request.schema),
            quote_mysql_identifier(&request.table)
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
            mysql_push_value(&mut builder, &row.changes[column]);
        }
        builder.push(")");
        return builder;
    }
    if row.action == MutationAction::Delete {
        let mut builder = QueryBuilder::<MySql>::new(format!(
            "DELETE FROM {}.{} WHERE ",
            quote_mysql_identifier(&request.schema),
            quote_mysql_identifier(&request.table)
        ));
        for (index, column) in sorted_keys(&row.key).iter().enumerate() {
            if index > 0 {
                builder.push(" AND ");
            }
            mysql_push_condition(&mut builder, column, &row.key[column]);
        }
        return builder;
    }
    let mut builder = QueryBuilder::<MySql>::new(format!(
        "UPDATE {}.{} SET ",
        quote_mysql_identifier(&request.schema),
        quote_mysql_identifier(&request.table)
    ));
    for (index, column) in sorted_keys(&row.changes).iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        builder.push(quote_mysql_identifier(column)).push(" = ");
        mysql_push_value(&mut builder, &row.changes[column]);
    }
    builder.push(" WHERE ");
    for (index, column) in sorted_keys(&row.key).iter().enumerate() {
        if index > 0 {
            builder.push(" AND ");
        }
        mysql_push_condition(&mut builder, column, &row.key[column]);
    }
    for column in sorted_keys(&row.changes) {
        builder.push(" AND ");
        mysql_push_condition(&mut builder, &column, &row.expected[&column]);
    }
    builder
}

pub(crate) async fn preview_mutation(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<MutationRequest>,
) -> Result<Json<MutationPreviewResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    let statements = match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let schemas = discover_postgres_schema(pool).await?;
            let table = schemas
                .iter()
                .find(|schema| schema.name == request.schema)
                .and_then(|schema| {
                    schema
                        .tables
                        .iter()
                        .find(|table| table.name == request.table)
                })
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            request
                .rows
                .iter()
                .map(|row| {
                    postgres_mutation_builder(&request, row, table)
                        .map(|builder| format!("{};", builder.sql().as_str()))
                })
                .collect::<Result<Vec<_>, _>>()?
        }
        ConnectionBackend::MySql(pool) => {
            if request.schema != session.database {
                return Err(ApiError::bad_request(
                    "ADVANCED_MUTATION_SCHEMA_INVALID",
                    "MySQL/MariaDB mutations must target the connected database.",
                ));
            }
            let schemas = discover_mysql_schema(pool, &session.database).await?;
            let table = schemas[0]
                .tables
                .iter()
                .find(|table| table.name == request.table)
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            request
                .rows
                .iter()
                .map(|row| format!("{};", mysql_mutation_builder(&request, row).sql().as_str()))
                .collect()
        }
        ConnectionBackend::Sqlite(pool) => {
            if request.schema != "main" {
                return Err(ApiError::bad_request(
                    "ADVANCED_MUTATION_SCHEMA_INVALID",
                    "SQLite mutations require the main schema.",
                ));
            }
            let schemas = discover_sqlite_schema(pool).await?;
            let table = schemas[0]
                .tables
                .iter()
                .find(|table| table.name == request.table)
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            request
                .rows
                .iter()
                .map(|row| format!("{};", sqlite_mutation_builder(&request, row).sql().as_str()))
                .collect()
        }
        ConnectionBackend::Mongo(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_MUTATION_PROVIDER_UNSUPPORTED",
                "MongoDB source commit is not enabled.",
            ))
        }
        ConnectionBackend::SqlServer(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_MUTATION_PROVIDER_UNSUPPORTED",
                "SQL Server is read-only in this beta provider.",
            ))
        }
    };
    Ok(Json(MutationPreviewResponse {
        statements,
        row_count: request.rows.len(),
        can_commit: session.safe_mode != "read_only",
    }))
}

fn mutation_conflict() -> ApiError {
    ApiError {
        status: StatusCode::CONFLICT,
        code: "ADVANCED_MUTATION_CONFLICT",
        message:
            "A row changed or disappeared after it was loaded; the entire mutation was rolled back."
                .to_string(),
    }
}

pub(super) fn ensure_write_allowed(session: &ConnectionSession) -> Result<(), ApiError> {
    if session.safe_mode == "read_only" {
        return Err(ApiError::bad_request(
            "ADVANCED_SAFE_MODE_READ_ONLY",
            "This connection profile is read-only; write transactions are blocked.",
        ));
    }
    Ok(())
}

pub(super) async fn invalidate_mutation_caches(state: &Arc<AppState>, connection_id: &str) {
    state
        .advanced
        .schema_cache
        .write()
        .await
        .remove(connection_id);
    state
        .advanced
        .count_cache
        .write()
        .await
        .retain(|(id, _, _), _| id != connection_id);
}

pub(crate) async fn commit_mutation(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
    Json(request): Json<MutationRequest>,
) -> Result<Json<MutationCommitResponse>, ApiError> {
    let session = connection(&state, &connection_id).await?;
    ensure_write_allowed(&session)?;
    let updated_rows = match &session.backend {
        ConnectionBackend::Postgres(pool) => {
            let schemas = discover_postgres_schema(pool).await?;
            let table = schemas
                .iter()
                .find(|schema| schema.name == request.schema)
                .and_then(|schema| {
                    schema
                        .tables
                        .iter()
                        .find(|table| table.name == request.table)
                })
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            for row in &request.rows {
                postgres_mutation_builder(&request, row, table)?;
            }
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start PostgreSQL mutation transaction: {error}"
                ))
            })?;
            let mut updated = 0;
            for row in &request.rows {
                let mut builder = postgres_mutation_builder(&request, row, table)?;
                let result = match builder.build().execute(&mut *tx).await {
                    Ok(result) => result,
                    Err(error) => {
                        tx.rollback().await.ok();
                        return Err(ApiError::database(format!(
                            "PostgreSQL mutation failed and was rolled back: {error}"
                        )));
                    }
                };
                if result.rows_affected() != 1 {
                    tx.rollback().await.ok();
                    return Err(mutation_conflict());
                }
                updated += 1;
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit PostgreSQL mutation transaction: {error}"
                ))
            })?;
            updated
        }
        ConnectionBackend::MySql(pool) => {
            if request.schema != session.database {
                return Err(ApiError::bad_request(
                    "ADVANCED_MUTATION_SCHEMA_INVALID",
                    "MySQL/MariaDB mutations must target the connected database.",
                ));
            }
            let schemas = discover_mysql_schema(pool, &session.database).await?;
            let table = schemas[0]
                .tables
                .iter()
                .find(|table| table.name == request.table)
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start MySQL/MariaDB mutation transaction: {error}"
                ))
            })?;
            let mut updated = 0;
            for row in &request.rows {
                let result = match mysql_mutation_builder(&request, row)
                    .build()
                    .execute(&mut *tx)
                    .await
                {
                    Ok(result) => result,
                    Err(error) => {
                        tx.rollback().await.ok();
                        return Err(ApiError::database(format!(
                            "MySQL/MariaDB mutation failed and was rolled back: {error}"
                        )));
                    }
                };
                if result.rows_affected() != 1 {
                    tx.rollback().await.ok();
                    return Err(mutation_conflict());
                }
                updated += 1;
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit MySQL/MariaDB mutation transaction: {error}"
                ))
            })?;
            updated
        }
        ConnectionBackend::Sqlite(pool) => {
            if request.schema != "main" {
                return Err(ApiError::bad_request(
                    "ADVANCED_MUTATION_SCHEMA_INVALID",
                    "SQLite mutations require the main schema.",
                ));
            }
            let schemas = discover_sqlite_schema(pool).await?;
            let table = schemas[0]
                .tables
                .iter()
                .find(|table| table.name == request.table)
                .ok_or_else(|| ApiError::not_found("Mutation table was not found."))?;
            validate_mutation_request(table, &request)?;
            let mut tx = pool.begin().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not start SQLite mutation transaction: {error}"
                ))
            })?;
            let mut updated = 0;
            for row in &request.rows {
                let result = match sqlite_mutation_builder(&request, row)
                    .build()
                    .execute(&mut *tx)
                    .await
                {
                    Ok(result) => result,
                    Err(error) => {
                        tx.rollback().await.ok();
                        return Err(ApiError::database(format!(
                            "SQLite mutation failed and was rolled back: {error}"
                        )));
                    }
                };
                if result.rows_affected() != 1 {
                    tx.rollback().await.ok();
                    return Err(mutation_conflict());
                }
                updated += 1;
            }
            tx.commit().await.map_err(|error| {
                ApiError::database(format!(
                    "Could not commit SQLite mutation transaction: {error}"
                ))
            })?;
            updated
        }
        ConnectionBackend::Mongo(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_MUTATION_PROVIDER_UNSUPPORTED",
                "MongoDB source commit is not enabled.",
            ))
        }
        ConnectionBackend::SqlServer(_) => {
            return Err(ApiError::bad_request(
                "ADVANCED_MUTATION_PROVIDER_UNSUPPORTED",
                "SQL Server is read-only in this beta provider.",
            ))
        }
    };
    invalidate_mutation_caches(&state, &connection_id).await;
    Ok(Json(MutationCommitResponse { updated_rows }))
}
