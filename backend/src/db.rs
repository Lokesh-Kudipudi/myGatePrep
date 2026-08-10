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
    let mut conn = Connection::open(db_path)?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON; \
         PRAGMA journal_mode = WAL;",
    )?;
    remove_legacy_difficulty(&mut conn)?;
    conn.execute_batch(include_str!("../schema.sql"))?;
    Ok(conn)
}

/// Remove the retired topic difficulty field without losing review history.
/// New databases skip this; databases created before v0.1.4 run it once.
fn remove_legacy_difficulty(conn: &mut Connection) -> rusqlite::Result<()> {
    let has_topics: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'topics')",
        [],
        |row| row.get(0),
    )?;
    if !has_topics {
        return Ok(());
    }

    let has_difficulty = {
        let mut stmt = conn.prepare("PRAGMA table_info(topics)")?;
        let columns = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;
        columns.iter().any(|name| name == "difficulty")
    };
    if !has_difficulty {
        return Ok(());
    }

    conn.execute_batch("PRAGMA foreign_keys = OFF;")?;
    let migration = conn.execute_batch(
        "BEGIN IMMEDIATE;

         CREATE TABLE topics_without_difficulty (
             id          INTEGER PRIMARY KEY AUTOINCREMENT,
             subject     TEXT NOT NULL,
             topic_name  TEXT NOT NULL,
             note        TEXT,
             logged_date TEXT NOT NULL,
             created_at  TEXT NOT NULL DEFAULT (datetime('now'))
         );
         INSERT INTO topics_without_difficulty
             (id, subject, topic_name, note, logged_date, created_at)
         SELECT id, subject, topic_name, note, logged_date, created_at FROM topics;

         CREATE TABLE reviews_without_difficulty (
             id           INTEGER PRIMARY KEY AUTOINCREMENT,
             topic_id     INTEGER NOT NULL REFERENCES topics_without_difficulty(id) ON DELETE CASCADE,
             due_date     TEXT NOT NULL,
             interval_day INTEGER NOT NULL CHECK (interval_day IN (1, 4, 7, 14, 30)),
             completed    INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
             completed_at TEXT
         );
         INSERT INTO reviews_without_difficulty
             (id, topic_id, due_date, interval_day, completed, completed_at)
         SELECT id, topic_id, due_date, interval_day, completed, completed_at FROM reviews;

         DROP TABLE reviews;
         DROP TABLE topics;
         ALTER TABLE topics_without_difficulty RENAME TO topics;
         ALTER TABLE reviews_without_difficulty RENAME TO reviews;

         COMMIT;",
    );

    if migration.is_err() {
        let _ = conn.execute_batch("ROLLBACK;");
    }
    let restore_foreign_keys = conn.execute_batch("PRAGMA foreign_keys = ON;");
    migration?;
    restore_foreign_keys?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::remove_legacy_difficulty;
    use rusqlite::Connection;

    #[test]
    fn removes_difficulty_and_preserves_topics_and_reviews() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE topics (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 subject TEXT NOT NULL,
                 topic_name TEXT NOT NULL,
                 note TEXT,
                 difficulty INTEGER NOT NULL,
                 logged_date TEXT NOT NULL,
                 created_at TEXT NOT NULL
             );
             CREATE TABLE reviews (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
                 due_date TEXT NOT NULL,
                 interval_day INTEGER NOT NULL,
                 completed INTEGER NOT NULL DEFAULT 0,
                 completed_at TEXT
             );
             INSERT INTO topics VALUES (7, 'OS', 'Deadlocks', 'note', 3, '2026-08-10', 'created');
             INSERT INTO reviews VALUES (11, 7, '2026-08-11', 1, 1, 'done');",
        )
        .unwrap();

        remove_legacy_difficulty(&mut conn).unwrap();

        let columns: Vec<String> = conn
            .prepare("PRAGMA table_info(topics)")
            .unwrap()
            .query_map([], |row| row.get(1))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert!(!columns.iter().any(|name| name == "difficulty"));
        assert_eq!(
            conn.query_row("SELECT topic_name FROM topics WHERE id = 7", [], |row| {
                row.get::<_, String>(0)
            })
            .unwrap(),
            "Deadlocks"
        );
        assert_eq!(
            conn.query_row("SELECT completed FROM reviews WHERE id = 11", [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            1
        );
        let fk_errors: i64 = conn
            .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(fk_errors, 0);
    }
}
