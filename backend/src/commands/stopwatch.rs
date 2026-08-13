use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::StopwatchSession;

const SESSION_COLS: &str = "id, started_at, ended_at, actual_min, subject, topic_label, note";

fn row_to_session(row: &rusqlite::Row) -> rusqlite::Result<StopwatchSession> {
    Ok(StopwatchSession {
        id: row.get(0)?,
        started_at: row.get(1)?,
        ended_at: row.get(2)?,
        actual_min: row.get(3)?,
        subject: row.get(4)?,
        topic_label: row.get(5)?,
        note: row.get(6)?,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn record_stopwatch(
    state: State<'_, DbState>,
    started_at: String,
    ended_at: String,
    actual_min: f64,
    subject: Option<String>,
    topic_label: Option<String>,
    note: Option<String>,
) -> Result<StopwatchSession, String> {
    if actual_min <= 0.0 {
        return Err("A stopwatch session must be longer than zero seconds".into());
    }

    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO stopwatch_sessions \
         (started_at, ended_at, actual_min, subject, topic_label, note) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![started_at, ended_at, actual_min, subject, topic_label, note],
    )
    .map_err(err)?;

    let id = conn.last_insert_rowid();
    let sql = format!(
        "SELECT {} FROM stopwatch_sessions WHERE id = ?1",
        SESSION_COLS
    );
    conn.query_row(&sql, [id], row_to_session).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_stopwatch_sessions_for_date(
    state: State<'_, DbState>,
    date: String,
) -> Result<Vec<StopwatchSession>, String> {
    let conn = state.0.lock().map_err(err)?;
    let sql = format!(
        "SELECT {} FROM stopwatch_sessions \
         WHERE date(started_at, 'localtime') = ?1 ORDER BY started_at ASC",
        SESSION_COLS
    );
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let rows = stmt
        .query_map([date], row_to_session)
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(rows)
}

#[tauri::command]
pub fn get_stopwatch_sessions(state: State<'_, DbState>) -> Result<Vec<StopwatchSession>, String> {
    let conn = state.0.lock().map_err(err)?;
    let sql = format!(
        "SELECT {} FROM stopwatch_sessions ORDER BY started_at DESC",
        SESSION_COLS
    );
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let sessions = stmt
        .query_map([], row_to_session)
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(sessions)
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_stopwatch(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute("DELETE FROM stopwatch_sessions WHERE id = ?1", [id])
        .map_err(err)?;
    Ok(())
}
