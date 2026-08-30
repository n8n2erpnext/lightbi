//! Advanced workspace internal module. Behavior is preserved from the pre-split facade.

use super::*;

type ConnectedSqlServer = SqlServerClient<Compat<TcpStream>>;

pub(super) async fn connect_sql_server(
    connection: &SqlServerConnection,
) -> Result<ConnectedSqlServer, ApiError> {
    let config =
        SqlServerConfig::from_ado_string(&connection.connection_string).map_err(|error| {
            ApiError::bad_request(
                "ADVANCED_CONNECTION_INVALID",
                format!("Invalid SQL Server ADO connection string: {error}"),
            )
        })?;
    let tcp = tokio::time::timeout(
        Duration::from_secs(10),
        TcpStream::connect(config.get_addr()),
    )
    .await
    .map_err(|_| ApiError::database("SQL Server connection timed out."))?
    .map_err(|error| ApiError::database(format!("Could not reach SQL Server: {error}")))?;
    tcp.set_nodelay(true).map_err(|error| {
        ApiError::database(format!("Could not configure SQL Server socket: {error}"))
    })?;
    SqlServerClient::connect(config, tcp.compat_write())
        .await
        .map_err(|error| ApiError::database(format!("Could not connect to SQL Server: {error}")))
}
fn free_local_port() -> Result<u16, ApiError> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|error| {
        ApiError::database(format!("Could not allocate local tunnel port: {error}"))
    })?;
    let port = listener
        .local_addr()
        .map_err(|error| {
            ApiError::database(format!("Could not inspect local tunnel port: {error}"))
        })?
        .port();
    drop(listener);
    Ok(port)
}

async fn maybe_open_ssh_tunnel(
    url: &str,
    request: &CreateConnectionRequest,
) -> Result<(String, Option<Arc<Mutex<Child>>>), ApiError> {
    let Some(ssh_host) = request
        .ssh_host
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Ok((url.to_string(), None));
    };
    let ssh_user = request
        .ssh_user
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            ApiError::bad_request(
                "ADVANCED_SSH_PROFILE_INVALID",
                "SSH user is required when an SSH host is configured.",
            )
        })?;
    let mut parsed = Url::parse(url).map_err(|error| {
        ApiError::bad_request(
            "ADVANCED_CONNECTION_INVALID",
            format!("Invalid connection URL for SSH tunnel: {error}"),
        )
    })?;
    let remote_host = parsed
        .host_str()
        .ok_or_else(|| {
            ApiError::bad_request(
                "ADVANCED_CONNECTION_INVALID",
                "Connection URL must include a database host for SSH tunnel.",
            )
        })?
        .to_string();
    let remote_port = parsed.port_or_known_default().ok_or_else(|| {
        ApiError::bad_request(
            "ADVANCED_CONNECTION_INVALID",
            "Connection URL must include or imply a database port for SSH tunnel.",
        )
    })?;
    let local_port = free_local_port()?;
    let ssh_target = format!("{ssh_user}@{ssh_host}");
    let local_forward = format!("127.0.0.1:{local_port}:{remote_host}:{remote_port}");
    let mut child = Command::new("ssh")
        .arg("-N")
        .arg("-L")
        .arg(local_forward)
        .arg("-p")
        .arg(request.ssh_port.unwrap_or(22).to_string())
        .arg("-o")
        .arg("ExitOnForwardFailure=yes")
        .arg("-o")
        .arg("ServerAliveInterval=30")
        .arg(ssh_target)
        .spawn()
        .map_err(|error| ApiError::database(format!("Could not start SSH tunnel: {error}")))?;
    tokio::time::sleep(Duration::from_millis(700)).await;
    if let Some(status) = child
        .try_wait()
        .map_err(|error| ApiError::database(format!("Could not inspect SSH tunnel: {error}")))?
    {
        return Err(ApiError::database(format!(
            "SSH tunnel exited before connection was opened: {status}"
        )));
    }
    parsed.set_host(Some("127.0.0.1")).map_err(|_| {
        ApiError::bad_request(
            "ADVANCED_CONNECTION_INVALID",
            "Could not rewrite connection URL for SSH tunnel.",
        )
    })?;
    parsed.set_port(Some(local_port)).map_err(|_| {
        ApiError::bad_request(
            "ADVANCED_CONNECTION_INVALID",
            "Could not rewrite connection port for SSH tunnel.",
        )
    })?;
    Ok((parsed.to_string(), Some(Arc::new(Mutex::new(child)))))
}

pub(crate) async fn create_connection(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateConnectionRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let name = request.name.trim();
    let connection_url_owned = match request
        .connection_url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(value) => value.to_string(),
        None => {
            crate::advanced_workspace::resolve_profile_secret(
                &state.context.sqlite_pool,
                request.profile_id.as_deref().ok_or_else(|| {
                    ApiError::bad_request(
                        "ADVANCED_CONNECTION_INVALID",
                        "Connection URL or profileId is required.",
                    )
                })?,
            )
            .await?
        }
    };
    let raw_connection_url = connection_url_owned.trim();
    if name.is_empty() || raw_connection_url.is_empty() {
        return Err(ApiError::bad_request(
            "ADVANCED_CONNECTION_INVALID",
            "Connection name and PostgreSQL URL are required.",
        ));
    }
    let requested_provider = request
        .provider
        .as_deref()
        .unwrap_or_default()
        .to_ascii_lowercase();
    let tls_mode = request.tls_mode.as_deref().unwrap_or("driver-default");
    if !["driver-default", "require", "verify-full"].contains(&tls_mode) {
        return Err(ApiError::bad_request(
            "ADVANCED_TLS_MODE_INVALID",
            "TLS mode must be driver-default, require, or verify-full.",
        ));
    }
    let safe_mode = request.safe_mode.as_deref().unwrap_or("confirm_writes");
    if !["off", "confirm_writes", "read_only"].contains(&safe_mode) {
        return Err(ApiError::bad_request(
            "ADVANCED_SAFE_MODE_INVALID",
            "Safe mode must be off, confirm_writes, or read_only.",
        ));
    }
    let tls_url = crate::advanced_workspace::apply_tls_policy(
        raw_connection_url,
        &requested_provider,
        tls_mode,
    );
    let (connection_url, ssh_tunnel) = maybe_open_ssh_tunnel(&tls_url, &request).await?;
    let connection_url = connection_url.as_str();
    let (provider, database, backend) = if connection_url.starts_with("postgres://")
        || connection_url.starts_with("postgresql://")
    {
        let pool = PgPoolOptions::new()
            .max_connections(4)
            .acquire_timeout(Duration::from_secs(10))
            .connect(connection_url)
            .await
            .map_err(|error| {
                ApiError::database(format!("Could not connect to PostgreSQL: {error}"))
            })?;
        let database = sqlx::query_scalar("SELECT current_database()")
            .fetch_one(&pool)
            .await
            .map_err(|error| {
                ApiError::database(format!("Could not identify PostgreSQL database: {error}"))
            })?;
        (
            "postgresql".to_string(),
            database,
            ConnectionBackend::Postgres(pool),
        )
    } else if connection_url.starts_with("mysql://") {
        let pool = MySqlPoolOptions::new()
            .max_connections(4)
            .acquire_timeout(Duration::from_secs(10))
            .connect(connection_url)
            .await
            .map_err(|error| {
                ApiError::database(format!("Could not connect to MySQL/MariaDB: {error}"))
            })?;
        let database: String = sqlx::query_scalar("SELECT DATABASE()")
            .fetch_one(&pool)
            .await
            .map_err(|error| {
                ApiError::database(format!(
                    "Could not identify MySQL/MariaDB database: {error}"
                ))
            })?;
        let provider = if requested_provider == "mariadb" {
            "mariadb"
        } else {
            "mysql"
        };
        (
            provider.to_string(),
            database,
            ConnectionBackend::MySql(pool),
        )
    } else if connection_url.starts_with("sqlite:") || requested_provider == "sqlite" {
        let normalized = if connection_url.starts_with("sqlite:") {
            connection_url.to_string()
        } else {
            format!("sqlite://{connection_url}")
        };
        let options: SqliteConnectOptions = normalized.parse().map_err(|error| {
            ApiError::bad_request(
                "ADVANCED_CONNECTION_INVALID",
                format!("Invalid SQLite URL: {error}"),
            )
        })?;
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .acquire_timeout(Duration::from_secs(10))
            .connect_with(options)
            .await
            .map_err(|error| ApiError::database(format!("Could not connect to SQLite: {error}")))?;
        let database = request
            .database_name
            .clone()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "main".to_string());
        (
            "sqlite".to_string(),
            database,
            ConnectionBackend::Sqlite(pool),
        )
    } else if connection_url.starts_with("mongodb://")
        || connection_url.starts_with("mongodb+srv://")
    {
        let client = MongoClient::with_uri_str(connection_url)
            .await
            .map_err(|error| {
                ApiError::database(format!("Could not connect to MongoDB: {error}"))
            })?;
        let database = request
            .database_name
            .clone()
            .filter(|value| !value.trim().is_empty())
            .or_else(|| {
                client
                    .default_database()
                    .map(|database| database.name().to_string())
            })
            .ok_or_else(|| {
                ApiError::bad_request(
                    "ADVANCED_MONGO_DATABASE_REQUIRED",
                    "MongoDB requires a database name in the URL or form.",
                )
            })?;
        client
            .database(&database)
            .run_command(mongodb::bson::doc! { "ping": 1 })
            .await
            .map_err(|error| {
                ApiError::database(format!("Could not ping MongoDB database: {error}"))
            })?;
        (
            "mongodb".to_string(),
            database,
            ConnectionBackend::Mongo(client),
        )
    } else if requested_provider == "sqlserver" {
        let connection = SqlServerConnection {
            connection_string: connection_url.to_string(),
        };
        let mut client = connect_sql_server(&connection).await?;
        let stream = client
            .simple_query("SELECT DB_NAME() AS database_name")
            .await
            .map_err(|error| {
                ApiError::database(format!("Could not identify SQL Server database: {error}"))
            })?;
        let row = stream
            .into_row()
            .await
            .map_err(|error| {
                ApiError::database(format!(
                    "Could not read SQL Server database identity: {error}"
                ))
            })?
            .ok_or_else(|| ApiError::database("SQL Server did not return the active database."))?;
        let database = row
            .get::<&str, _>("database_name")
            .map(str::to_string)
            .or_else(|| request.database_name.clone())
            .ok_or_else(|| {
                ApiError::database("SQL Server did not identify the active database.")
            })?;
        (
            "sqlserver".to_string(),
            database,
            ConnectionBackend::SqlServer(connection),
        )
    } else {
        return Err(ApiError::bad_request(
            "ADVANCED_CONNECTION_PROVIDER_UNSUPPORTED",
            "Use a PostgreSQL, MySQL/MariaDB, SQLite, MongoDB URL, or SQL Server ADO connection string.",
        ));
    };

    let id = Uuid::new_v4().to_string();
    let session = ConnectionSession {
        id: id.clone(),
        name: name.to_string(),
        database: database.clone(),
        backend,
        ssh_tunnel,
        safe_mode: safe_mode.to_string(),
    };
    state
        .advanced
        .connections
        .write()
        .await
        .insert(id.clone(), session);

    Ok((
        StatusCode::CREATED,
        Json(ConnectionResponse {
            connection_id: id,
            name: name.to_string(),
            database,
            provider,
        }),
    ))
}

pub(crate) async fn delete_connection(
    State(state): State<Arc<AppState>>,
    Path(connection_id): Path<String>,
) -> Result<StatusCode, ApiError> {
    let session = state
        .advanced
        .connections
        .write()
        .await
        .remove(&connection_id)
        .ok_or_else(|| ApiError::not_found("Connection session was not found."))?;
    state.advanced.runs.write().await.retain(|_, run| {
        if run.connection_id == connection_id {
            run.abort_handle.abort();
            false
        } else {
            true
        }
    });
    state
        .advanced
        .schema_cache
        .write()
        .await
        .remove(&connection_id);
    state
        .advanced
        .schema_locks
        .write()
        .await
        .remove(&connection_id);
    state
        .advanced
        .count_cache
        .write()
        .await
        .retain(|(id, _, _), _| id != &connection_id);
    match session.backend {
        ConnectionBackend::Postgres(pool) => pool.close().await,
        ConnectionBackend::MySql(pool) => pool.close().await,
        ConnectionBackend::Sqlite(pool) => pool.close().await,
        ConnectionBackend::Mongo(_) => {}
        ConnectionBackend::SqlServer(_) => {}
    }
    if let Some(tunnel) = session.ssh_tunnel {
        let mut child = tunnel.lock().await;
        let _ = child.kill().await;
    }
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn connection(
    state: &Arc<AppState>,
    id: &str,
) -> Result<ConnectionSession, ApiError> {
    state
        .advanced
        .connections
        .read()
        .await
        .get(id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Connection session expired or was closed."))
}
