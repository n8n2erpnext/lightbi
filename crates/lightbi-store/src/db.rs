use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StoreError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Migration error: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
}

/// Initializes the SQLite database pool and automatically runs pending migrations.
/// `db_url` should point to the `metadata.db` file in the project folder.
pub async fn init_db(db_url: &str) -> Result<SqlitePool, StoreError> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(db_url)
        .await?;

    // Run embedded migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}
