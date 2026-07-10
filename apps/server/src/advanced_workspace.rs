use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use ring::{
    aead,
    rand::{SecureRandom, SystemRandom},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::{advanced::ApiError, AppState};

const HISTORY_LIMIT: i64 = 200;
const SESSION_LIMIT: i64 = 100;
const SESSION_PAYLOAD_LIMIT_BYTES: usize = 5 * 1024 * 1024;

pub(crate) async fn initialize(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS advanced_query_history (
            id TEXT PRIMARY KEY,
            connection_name TEXT NOT NULL,
            database_name TEXT NOT NULL,
            provider TEXT NOT NULL,
            sql_text TEXT NOT NULL,
            status TEXT NOT NULL,
            row_count INTEGER NOT NULL DEFAULT 0,
            execution_ms INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )"#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS advanced_query_favorites (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sql_text TEXT NOT NULL,
            provider TEXT NOT NULL,
            database_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS advanced_connection_profiles (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, provider TEXT NOT NULL, database_name TEXT NOT NULL,
            tls_mode TEXT NOT NULL, ssh_host TEXT, ssh_port INTEGER, ssh_user TEXT,
            credential_cipher TEXT NOT NULL, credential_nonce TEXT NOT NULL,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        )"#,
    ).execute(pool).await?;
    let _ = sqlx::query("ALTER TABLE advanced_connection_profiles ADD COLUMN group_name TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE advanced_connection_profiles ADD COLUMN tag_name TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE advanced_connection_profiles ADD COLUMN safe_mode TEXT NOT NULL DEFAULT 'confirm_writes'").execute(pool).await;
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS workspace_sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            source_type TEXT NOT NULL,
            row_count INTEGER NOT NULL DEFAULT 0,
            column_count INTEGER NOT NULL DEFAULT 0,
            source_summary TEXT NOT NULL DEFAULT '[]',
            snapshot_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

async fn vault_key() -> Result<[u8; 32], ApiError> {
    use tokio::io::AsyncWriteExt;
    let path = "/tmp/lightbi-project-1/.vault-key";
    if let Ok(bytes) = tokio::fs::read(path).await {
        return bytes
            .try_into()
            .map_err(|_| ApiError::storage("Credential vault key has an invalid length."));
    }
    let mut key = [0u8; 32];
    SystemRandom::new()
        .fill(&mut key)
        .map_err(|_| ApiError::storage("Could not generate credential vault key."))?;
    let mut options = tokio::fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        options.mode(0o600);
    }
    match options.open(path).await {
        Ok(mut file) => file
            .write_all(&key)
            .await
            .map_err(|error| ApiError::storage(format!("Could not write vault key: {error}")))?,
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            let bytes = tokio::fs::read(path)
                .await
                .map_err(|error| ApiError::storage(format!("Could not read vault key: {error}")))?;
            return bytes
                .try_into()
                .map_err(|_| ApiError::storage("Credential vault key has an invalid length."));
        }
        Err(error) => {
            return Err(ApiError::storage(format!(
                "Could not create vault key: {error}"
            )))
        }
    }
    Ok(key)
}

async fn encrypt_secret(secret: &str) -> Result<(String, String), ApiError> {
    let key = aead::UnboundKey::new(&aead::AES_256_GCM, &vault_key().await?)
        .map_err(|_| ApiError::storage("Could not initialize credential vault."))?;
    let mut nonce_bytes = [0u8; 12];
    SystemRandom::new()
        .fill(&mut nonce_bytes)
        .map_err(|_| ApiError::storage("Could not generate vault nonce."))?;
    let nonce = aead::Nonce::assume_unique_for_key(nonce_bytes);
    let mut value = secret.as_bytes().to_vec();
    aead::LessSafeKey::new(key)
        .seal_in_place_append_tag(nonce, aead::Aad::empty(), &mut value)
        .map_err(|_| ApiError::storage("Could not encrypt credential."))?;
    Ok((BASE64.encode(value), BASE64.encode(nonce_bytes)))
}

pub(crate) async fn resolve_profile_secret(
    pool: &SqlitePool,
    profile_id: &str,
) -> Result<String, ApiError> {
    let row = sqlx::query(
        "SELECT credential_cipher, credential_nonce FROM advanced_connection_profiles WHERE id = ?",
    )
    .bind(profile_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| ApiError::storage(format!("Could not read connection profile: {error}")))?
    .ok_or_else(|| {
        ApiError::bad_request(
            "ADVANCED_PROFILE_NOT_FOUND",
            "Connection profile was not found.",
        )
    })?;
    let mut cipher = BASE64
        .decode(row.get::<String, _>("credential_cipher"))
        .map_err(|_| ApiError::storage("Stored credential is invalid."))?;
    let nonce: [u8; 12] = BASE64
        .decode(row.get::<String, _>("credential_nonce"))
        .map_err(|_| ApiError::storage("Stored credential nonce is invalid."))?
        .try_into()
        .map_err(|_| ApiError::storage("Stored credential nonce has an invalid length."))?;
    let key = aead::UnboundKey::new(&aead::AES_256_GCM, &vault_key().await?)
        .map_err(|_| ApiError::storage("Could not initialize credential vault."))?;
    let plain = aead::LessSafeKey::new(key)
        .open_in_place(
            aead::Nonce::assume_unique_for_key(nonce),
            aead::Aad::empty(),
            &mut cipher,
        )
        .map_err(|_| ApiError::storage("Could not decrypt stored credential."))?;
    String::from_utf8(plain.to_vec())
        .map_err(|_| ApiError::storage("Stored credential is not valid UTF-8."))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HistoryEntry {
    id: String,
    connection_name: String,
    database: String,
    provider: String,
    sql: String,
    status: String,
    row_count: i64,
    execution_ms: i64,
    created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveHistoryRequest {
    connection_name: String,
    database: String,
    provider: String,
    sql: String,
    status: String,
    #[serde(default)]
    row_count: i64,
    #[serde(default)]
    execution_ms: i64,
}

pub(crate) async fn list_history(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<HistoryEntry>>, ApiError> {
    let rows = sqlx::query(
        "SELECT id, connection_name, database_name, provider, sql_text, status, row_count, execution_ms, created_at FROM advanced_query_history ORDER BY created_at DESC LIMIT ?",
    )
    .bind(HISTORY_LIMIT)
    .fetch_all(&state.context.sqlite_pool)
    .await
    .map_err(|error| ApiError::storage(format!("Could not load query history: {error}")))?;
    Ok(Json(rows.into_iter().map(history_from_row).collect()))
}

pub(crate) async fn save_history(
    State(state): State<Arc<AppState>>,
    Json(request): Json<SaveHistoryRequest>,
) -> Result<(StatusCode, Json<HistoryEntry>), ApiError> {
    let sql = request.sql.trim();
    if sql.is_empty() || sql.len() > 100_000 {
        return Err(ApiError::bad_request(
            "ADVANCED_HISTORY_INVALID",
            "History SQL must contain 1 to 100,000 characters.",
        ));
    }
    let entry = HistoryEntry {
        id: Uuid::new_v4().to_string(),
        connection_name: request.connection_name.trim().to_string(),
        database: request.database.trim().to_string(),
        provider: request.provider.trim().to_string(),
        sql: sql.to_string(),
        status: request.status.trim().to_string(),
        row_count: request.row_count.max(0),
        execution_ms: request.execution_ms.max(0),
        created_at: Utc::now().to_rfc3339(),
    };
    sqlx::query("INSERT INTO advanced_query_history (id, connection_name, database_name, provider, sql_text, status, row_count, execution_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&entry.id).bind(&entry.connection_name).bind(&entry.database).bind(&entry.provider)
        .bind(&entry.sql).bind(&entry.status).bind(entry.row_count).bind(entry.execution_ms).bind(&entry.created_at)
        .execute(&state.context.sqlite_pool).await
        .map_err(|error| ApiError::storage(format!("Could not save query history: {error}")))?;
    sqlx::query("DELETE FROM advanced_query_history WHERE id NOT IN (SELECT id FROM advanced_query_history ORDER BY created_at DESC LIMIT ?)")
        .bind(HISTORY_LIMIT).execute(&state.context.sqlite_pool).await
        .map_err(|error| ApiError::storage(format!("Could not trim query history: {error}")))?;
    Ok((StatusCode::CREATED, Json(entry)))
}

pub(crate) async fn clear_history(
    State(state): State<Arc<AppState>>,
) -> Result<StatusCode, ApiError> {
    sqlx::query("DELETE FROM advanced_query_history")
        .execute(&state.context.sqlite_pool)
        .await
        .map_err(|error| ApiError::storage(format!("Could not clear query history: {error}")))?;
    Ok(StatusCode::NO_CONTENT)
}

fn history_from_row(row: sqlx::sqlite::SqliteRow) -> HistoryEntry {
    HistoryEntry {
        id: row.get("id"),
        connection_name: row.get("connection_name"),
        database: row.get("database_name"),
        provider: row.get("provider"),
        sql: row.get("sql_text"),
        status: row.get("status"),
        row_count: row.get("row_count"),
        execution_ms: row.get("execution_ms"),
        created_at: row.get("created_at"),
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkspaceSessionEntry {
    id: String,
    title: String,
    source_type: String,
    row_count: i64,
    column_count: i64,
    source_summary: Value,
    snapshot: Value,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveWorkspaceSessionRequest {
    id: Option<String>,
    title: String,
    source_type: String,
    #[serde(default)]
    row_count: i64,
    #[serde(default)]
    column_count: i64,
    #[serde(default)]
    source_summary: Value,
    snapshot: Value,
}

pub(crate) async fn list_workspace_sessions(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<WorkspaceSessionEntry>>, ApiError> {
    let rows = sqlx::query(
        "SELECT id, title, source_type, row_count, column_count, source_summary, snapshot_json, created_at, updated_at FROM workspace_sessions ORDER BY updated_at DESC LIMIT ?",
    )
    .bind(SESSION_LIMIT)
    .fetch_all(&state.context.sqlite_pool)
    .await
    .map_err(|error| ApiError::storage(format!("Could not load workspace sessions: {error}")))?;
    Ok(Json(
        rows.into_iter().map(workspace_session_from_row).collect(),
    ))
}

pub(crate) async fn save_workspace_session(
    State(state): State<Arc<AppState>>,
    Json(request): Json<SaveWorkspaceSessionRequest>,
) -> Result<(StatusCode, Json<WorkspaceSessionEntry>), ApiError> {
    let title = request.title.trim();
    if title.is_empty() || title.len() > 180 {
        return Err(ApiError::bad_request(
            "WORKSPACE_SESSION_INVALID",
            "Session title must contain 1 to 180 characters.",
        ));
    }
    let source_type = request.source_type.trim();
    if source_type.is_empty() || source_type.len() > 80 {
        return Err(ApiError::bad_request(
            "WORKSPACE_SESSION_INVALID",
            "Session source type is required.",
        ));
    }
    let snapshot_json = serde_json::to_string(&request.snapshot).map_err(|error| {
        ApiError::storage(format!("Could not encode session snapshot: {error}"))
    })?;
    if snapshot_json.len() > SESSION_PAYLOAD_LIMIT_BYTES {
        return Err(ApiError::bad_request(
            "WORKSPACE_SESSION_TOO_LARGE",
            "Session snapshot is too large to save.",
        ));
    }
    let source_summary_json = serde_json::to_string(&request.source_summary).map_err(|error| {
        ApiError::storage(format!("Could not encode session source summary: {error}"))
    })?;
    let now = Utc::now().to_rfc3339();
    let id = request
        .id
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let existing_created_at =
        sqlx::query_scalar::<_, String>("SELECT created_at FROM workspace_sessions WHERE id = ?")
            .bind(&id)
            .fetch_optional(&state.context.sqlite_pool)
            .await
            .map_err(|error| {
                ApiError::storage(format!("Could not check workspace session: {error}"))
            })?;
    let created_at = existing_created_at.unwrap_or_else(|| now.clone());

    sqlx::query(
        "INSERT OR REPLACE INTO workspace_sessions (id, title, source_type, row_count, column_count, source_summary, snapshot_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(title)
    .bind(source_type)
    .bind(request.row_count.max(0))
    .bind(request.column_count.max(0))
    .bind(&source_summary_json)
    .bind(&snapshot_json)
    .bind(&created_at)
    .bind(&now)
    .execute(&state.context.sqlite_pool)
    .await
    .map_err(|error| ApiError::storage(format!("Could not save workspace session: {error}")))?;

    sqlx::query("DELETE FROM workspace_sessions WHERE id NOT IN (SELECT id FROM workspace_sessions ORDER BY updated_at DESC LIMIT ?)")
        .bind(SESSION_LIMIT)
        .execute(&state.context.sqlite_pool)
        .await
        .map_err(|error| ApiError::storage(format!("Could not trim workspace sessions: {error}")))?;

    Ok((
        StatusCode::CREATED,
        Json(WorkspaceSessionEntry {
            id,
            title: title.to_string(),
            source_type: source_type.to_string(),
            row_count: request.row_count.max(0),
            column_count: request.column_count.max(0),
            source_summary: request.source_summary,
            snapshot: request.snapshot,
            created_at,
            updated_at: now,
        }),
    ))
}

pub(crate) async fn delete_workspace_session(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
) -> Result<StatusCode, ApiError> {
    sqlx::query("DELETE FROM workspace_sessions WHERE id = ?")
        .bind(session_id)
        .execute(&state.context.sqlite_pool)
        .await
        .map_err(|error| {
            ApiError::storage(format!("Could not delete workspace session: {error}"))
        })?;
    Ok(StatusCode::NO_CONTENT)
}

fn workspace_session_from_row(row: sqlx::sqlite::SqliteRow) -> WorkspaceSessionEntry {
    let source_summary = serde_json::from_str::<Value>(&row.get::<String, _>("source_summary"))
        .unwrap_or(Value::Array(vec![]));
    let snapshot = serde_json::from_str::<Value>(&row.get::<String, _>("snapshot_json"))
        .unwrap_or(Value::Object(Default::default()));
    WorkspaceSessionEntry {
        id: row.get("id"),
        title: row.get("title"),
        source_type: row.get("source_type"),
        row_count: row.get("row_count"),
        column_count: row.get("column_count"),
        source_summary,
        snapshot,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FavoriteEntry {
    id: String,
    name: String,
    sql: String,
    provider: String,
    database: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveFavoriteRequest {
    name: String,
    sql: String,
    provider: String,
    database: String,
}

pub(crate) async fn list_favorites(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<FavoriteEntry>>, ApiError> {
    let rows = sqlx::query("SELECT id, name, sql_text, provider, database_name, created_at, updated_at FROM advanced_query_favorites ORDER BY updated_at DESC")
        .fetch_all(&state.context.sqlite_pool).await
        .map_err(|error| ApiError::storage(format!("Could not load favorites: {error}")))?;
    Ok(Json(rows.into_iter().map(favorite_from_row).collect()))
}

pub(crate) async fn save_favorite(
    State(state): State<Arc<AppState>>,
    Json(request): Json<SaveFavoriteRequest>,
) -> Result<(StatusCode, Json<FavoriteEntry>), ApiError> {
    let name = request.name.trim();
    let sql = request.sql.trim();
    if name.is_empty() || name.len() > 120 || sql.is_empty() || sql.len() > 100_000 {
        return Err(ApiError::bad_request(
            "ADVANCED_FAVORITE_INVALID",
            "Favorite requires a name and bounded SQL text.",
        ));
    }
    let now = Utc::now().to_rfc3339();
    let entry = FavoriteEntry {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        sql: sql.to_string(),
        provider: request.provider,
        database: request.database,
        created_at: now.clone(),
        updated_at: now,
    };
    sqlx::query("INSERT INTO advanced_query_favorites (id, name, sql_text, provider, database_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(&entry.id).bind(&entry.name).bind(&entry.sql).bind(&entry.provider).bind(&entry.database).bind(&entry.created_at).bind(&entry.updated_at)
        .execute(&state.context.sqlite_pool).await
        .map_err(|error| ApiError::storage(format!("Could not save favorite: {error}")))?;
    Ok((StatusCode::CREATED, Json(entry)))
}

pub(crate) async fn delete_favorite(
    State(state): State<Arc<AppState>>,
    Path(favorite_id): Path<String>,
) -> Result<StatusCode, ApiError> {
    sqlx::query("DELETE FROM advanced_query_favorites WHERE id = ?")
        .bind(favorite_id)
        .execute(&state.context.sqlite_pool)
        .await
        .map_err(|error| ApiError::storage(format!("Could not delete favorite: {error}")))?;
    Ok(StatusCode::NO_CONTENT)
}

fn favorite_from_row(row: sqlx::sqlite::SqliteRow) -> FavoriteEntry {
    FavoriteEntry {
        id: row.get("id"),
        name: row.get("name"),
        sql: row.get("sql_text"),
        provider: row.get("provider"),
        database: row.get("database_name"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConnectionProfile {
    id: String,
    name: String,
    provider: String,
    database: String,
    tls_mode: String,
    ssh_host: Option<String>,
    ssh_port: Option<i64>,
    ssh_user: Option<String>,
    group_name: Option<String>,
    tag_name: Option<String>,
    safe_mode: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveProfileRequest {
    name: String,
    provider: String,
    database: Option<String>,
    connection_url: String,
    tls_mode: Option<String>,
    ssh_host: Option<String>,
    ssh_port: Option<i64>,
    ssh_user: Option<String>,
    group_name: Option<String>,
    tag_name: Option<String>,
    safe_mode: Option<String>,
}

pub(crate) async fn list_profiles(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ConnectionProfile>>, ApiError> {
    let rows = sqlx::query("SELECT id, name, provider, database_name, tls_mode, ssh_host, ssh_port, ssh_user, group_name, tag_name, safe_mode, created_at, updated_at FROM advanced_connection_profiles ORDER BY COALESCE(group_name, ''), updated_at DESC")
        .fetch_all(&state.context.sqlite_pool).await.map_err(|error| ApiError::storage(format!("Could not load connection profiles: {error}")))?;
    Ok(Json(rows.into_iter().map(profile_from_row).collect()))
}

pub(crate) async fn save_profile(
    State(state): State<Arc<AppState>>,
    Json(request): Json<SaveProfileRequest>,
) -> Result<(StatusCode, Json<ConnectionProfile>), ApiError> {
    let name = request.name.trim();
    let url = request.connection_url.trim();
    let providers = ["postgresql", "mysql", "mariadb", "sqlite", "mongodb"];
    if name.is_empty()
        || name.len() > 120
        || url.is_empty()
        || !providers.contains(&request.provider.as_str())
    {
        return Err(ApiError::bad_request(
            "ADVANCED_PROFILE_INVALID",
            "Profile requires a name, supported provider, and connection URL.",
        ));
    }
    let tls_mode = request
        .tls_mode
        .unwrap_or_else(|| "driver-default".to_string());
    if !["driver-default", "require", "verify-full"].contains(&tls_mode.as_str()) {
        return Err(ApiError::bad_request(
            "ADVANCED_TLS_MODE_INVALID",
            "TLS mode must be driver-default, require, or verify-full.",
        ));
    }
    if request.ssh_host.is_some()
        && request
            .ssh_user
            .as_deref()
            .unwrap_or_default()
            .trim()
            .is_empty()
    {
        return Err(ApiError::bad_request(
            "ADVANCED_SSH_PROFILE_INVALID",
            "SSH user is required when an SSH host is configured.",
        ));
    }
    let safe_mode = request
        .safe_mode
        .unwrap_or_else(|| "confirm_writes".to_string());
    if !["off", "confirm_writes", "read_only"].contains(&safe_mode.as_str()) {
        return Err(ApiError::bad_request(
            "ADVANCED_SAFE_MODE_INVALID",
            "Safe mode must be off, confirm_writes, or read_only.",
        ));
    }
    let secured_url = apply_tls_policy(url, &request.provider, &tls_mode);
    let (cipher, nonce) = encrypt_secret(&secured_url).await?;
    let now = Utc::now().to_rfc3339();
    let profile = ConnectionProfile {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        provider: request.provider,
        database: request.database.unwrap_or_default(),
        tls_mode,
        ssh_host: request.ssh_host.filter(|value| !value.trim().is_empty()),
        ssh_port: request.ssh_port.map(|port| port.clamp(1, 65535)),
        ssh_user: request.ssh_user.filter(|value| !value.trim().is_empty()),
        group_name: request.group_name.filter(|value| !value.trim().is_empty()),
        tag_name: request.tag_name.filter(|value| !value.trim().is_empty()),
        safe_mode,
        created_at: now.clone(),
        updated_at: now,
    };
    sqlx::query("INSERT INTO advanced_connection_profiles (id, name, provider, database_name, tls_mode, ssh_host, ssh_port, ssh_user, group_name, tag_name, safe_mode, credential_cipher, credential_nonce, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&profile.id).bind(&profile.name).bind(&profile.provider).bind(&profile.database).bind(&profile.tls_mode)
        .bind(&profile.ssh_host).bind(profile.ssh_port).bind(&profile.ssh_user).bind(&profile.group_name).bind(&profile.tag_name).bind(&profile.safe_mode)
        .bind(cipher).bind(nonce).bind(&profile.created_at).bind(&profile.updated_at)
        .execute(&state.context.sqlite_pool).await.map_err(|error| ApiError::storage(format!("Could not save connection profile: {error}")))?;
    Ok((StatusCode::CREATED, Json(profile)))
}

pub(crate) fn apply_tls_policy(url: &str, provider: &str, mode: &str) -> String {
    if mode == "driver-default" || provider == "sqlite" {
        return url.to_string();
    }
    let separator = if url.contains('?') { '&' } else { '?' };
    match provider {
        "postgresql" => format!(
            "{url}{separator}sslmode={}",
            if mode == "verify-full" {
                "verify-full"
            } else {
                "require"
            }
        ),
        "mysql" | "mariadb" => format!(
            "{url}{separator}ssl-mode={}",
            if mode == "verify-full" {
                "VERIFY_IDENTITY"
            } else {
                "REQUIRED"
            }
        ),
        "mongodb" => format!("{url}{separator}tls=true"),
        _ => url.to_string(),
    }
}

pub(crate) async fn delete_profile(
    State(state): State<Arc<AppState>>,
    Path(profile_id): Path<String>,
) -> Result<StatusCode, ApiError> {
    sqlx::query("DELETE FROM advanced_connection_profiles WHERE id = ?")
        .bind(profile_id)
        .execute(&state.context.sqlite_pool)
        .await
        .map_err(|error| {
            ApiError::storage(format!("Could not delete connection profile: {error}"))
        })?;
    Ok(StatusCode::NO_CONTENT)
}

fn profile_from_row(row: sqlx::sqlite::SqliteRow) -> ConnectionProfile {
    ConnectionProfile {
        id: row.get("id"),
        name: row.get("name"),
        provider: row.get("provider"),
        database: row.get("database_name"),
        tls_mode: row.get("tls_mode"),
        ssh_host: row.get("ssh_host"),
        ssh_port: row.get("ssh_port"),
        ssh_user: row.get("ssh_user"),
        group_name: row.get("group_name"),
        tag_name: row.get("tag_name"),
        safe_mode: row.get("safe_mode"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}
