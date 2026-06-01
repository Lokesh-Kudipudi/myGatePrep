use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Holds the single shared SQLite connection. Tauri commands acquire the lock
/// per-call; SQLite operations are fast and there is only one user, so a Mutex
/// keeps everything simple without spinning up a connection pool.
pub struct DbState(pub Mutex<Connection>);

pub fn init(data_dir: &Path) -> rusqlite::Result<Connection> {
    std::fs::create_dir_all(data_dir).ok();
    let db_path = data_dir.join("gate_prep.db");
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON; \
         PRAGMA journal_mode = WAL;",
    )?;
    conn.execute_batch(include_str!("../migrations/001_initial.sql"))?;
    Ok(conn)
}
