use rusqlite::Connection;
use serde::Deserialize;
use std::path::Path;
use std::sync::Mutex;

/// Holds the single shared SQLite connection. Tauri commands acquire the lock
/// per-call; SQLite operations are fast and there is only one user, so a Mutex
/// keeps everything simple without spinning up a connection pool.
pub struct DbState(pub Mutex<Connection>);

pub fn init(data_dir: &Path) -> rusqlite::Result<Connection> {
    std::fs::create_dir_all(data_dir).ok();
    let db_path = data_dir.join("gate_prep.db");
    let mut conn = Connection::open(db_path)?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON; \
         PRAGMA journal_mode = WAL;",
    )?;
    conn.execute_batch(include_str!("../schema.sql"))?;
    seed_gate_2027_schedule(&mut conn)?;
    Ok(conn)
}

#[derive(Deserialize)]
struct SeedDailyTask {
    seed_key: String,
    task_date: String,
    title: String,
    details: Option<String>,
    suggested_minutes: Option<i64>,
}

/// Insert the bundled plan once. A separate metadata marker is intentional:
/// users can freely edit or delete seeded rows without them returning later.
fn seed_gate_2027_schedule(conn: &mut Connection) -> rusqlite::Result<()> {
    let already_seeded: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM app_metadata WHERE key = 'gate_2027_schedule_v1')",
        [],
        |row| row.get(0),
    )?;
    if already_seeded {
        return Ok(());
    }

    let tasks: Vec<SeedDailyTask> =
        serde_json::from_str(include_str!("../gate_2027_schedule.json"))
            .expect("embedded GATE 2027 schedule must be valid JSON");

    let tx = conn.transaction()?;
    {
        let mut insert = tx.prepare(
            "INSERT INTO daily_tasks
             (task_date, title, details, suggested_minutes, seed_key)
             VALUES (?1, ?2, ?3, ?4, ?5)",
        )?;
        for task in tasks {
            insert.execute(rusqlite::params![
                task.task_date,
                task.title,
                task.details,
                task.suggested_minutes,
                task.seed_key
            ])?;
        }
    }
    tx.execute(
        "INSERT INTO app_metadata (key, value) VALUES ('gate_2027_schedule_v1', 'seeded')",
        [],
    )?;
    tx.commit()
}

#[cfg(test)]
mod tests {
    use super::seed_gate_2027_schedule;
    use rusqlite::Connection;

    #[test]
    fn seeds_schedule_once_and_does_not_restore_user_deletions() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../schema.sql")).unwrap();

        seed_gate_2027_schedule(&mut conn).unwrap();
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM daily_tasks", [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            412
        );

        conn.execute("DELETE FROM daily_tasks WHERE id = 1", [])
            .unwrap();
        seed_gate_2027_schedule(&mut conn).unwrap();
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM daily_tasks", [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            411
        );
    }
}
