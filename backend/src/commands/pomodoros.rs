use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::{FocusStats, PomodoroSession, PomodoroSettings};

fn row_to_session(row: &rusqlite::Row) -> rusqlite::Result<PomodoroSession> {
    Ok(PomodoroSession {
        id: row.get(0)?,
        started_at: row.get(1)?,
        ended_at: row.get(2)?,
        duration_min: row.get(3)?,
        actual_min: row.get(4)?,
        kind: row.get(5)?,
        completed: row.get::<_, i64>(6)? != 0,
        interrupted: row.get::<_, i64>(7)? != 0,
        subject: row.get(8)?,
        topic_label: row.get(9)?,
        note: row.get(10)?,
    })
}

const SESSION_COLS: &str = "id, started_at, ended_at, duration_min, actual_min, kind, \
     completed, interrupted, subject, topic_label, note";

#[tauri::command(rename_all = "snake_case")]
pub fn record_pomodoro(
    state: State<'_, DbState>,
    started_at: String,
    ended_at: String,
    duration_min: i64,
    actual_min: f64,
    kind: String,
    completed: bool,
    interrupted: bool,
    subject: Option<String>,
    topic_label: Option<String>,
    note: Option<String>,
) -> Result<PomodoroSession, String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO pomodoro_sessions \
         (started_at, ended_at, duration_min, actual_min, kind, completed, interrupted, subject, topic_label, note) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            started_at,
            ended_at,
            duration_min,
            actual_min,
            kind,
            completed as i64,
            interrupted as i64,
            subject,
            topic_label,
            note,
        ],
    )
    .map_err(err)?;
    let id = conn.last_insert_rowid();
    let sql = format!(
        "SELECT {} FROM pomodoro_sessions WHERE id = ?1",
        SESSION_COLS
    );
    conn.query_row(&sql, [id], row_to_session).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_pomodoros_for_date(
    state: State<'_, DbState>,
    date: String,
) -> Result<Vec<PomodoroSession>, String> {
    let conn = state.0.lock().map_err(err)?;
    let sql = format!(
        "SELECT {} FROM pomodoro_sessions \
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
pub fn get_pomodoro_sessions(state: State<'_, DbState>) -> Result<Vec<PomodoroSession>, String> {
    let conn = state.0.lock().map_err(err)?;
    let sql = format!(
        "SELECT {} FROM pomodoro_sessions ORDER BY started_at DESC",
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
pub fn delete_pomodoro(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute("DELETE FROM pomodoro_sessions WHERE id = ?1", [id])
        .map_err(err)?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_focus_stats(state: State<'_, DbState>) -> Result<FocusStats, String> {
    let conn = state.0.lock().map_err(err)?;

    let (sessions_today, focus_min_today): (i64, f64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(actual_min), 0) FROM ( \
               SELECT actual_min FROM pomodoro_sessions \
               WHERE kind = 'work' AND completed = 1 AND interrupted = 0 \
                 AND date(started_at, 'localtime') = date('now', 'localtime') \
               UNION ALL \
               SELECT actual_min FROM stopwatch_sessions \
               WHERE date(started_at, 'localtime') = date('now', 'localtime') \
             )",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(err)?;

    let (sessions_this_week, focus_min_this_week): (i64, f64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(actual_min), 0) FROM ( \
               SELECT actual_min FROM pomodoro_sessions \
               WHERE kind = 'work' AND completed = 1 AND interrupted = 0 \
                 AND date(started_at, 'localtime') >= date('now', 'localtime', '-6 days') \
               UNION ALL \
               SELECT actual_min FROM stopwatch_sessions \
               WHERE date(started_at, 'localtime') >= date('now', 'localtime', '-6 days') \
             )",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(err)?;

    let (sessions_total, focus_min_total): (i64, f64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(actual_min), 0) FROM ( \
               SELECT actual_min FROM pomodoro_sessions \
               WHERE kind = 'work' AND completed = 1 AND interrupted = 0 \
               UNION ALL \
               SELECT actual_min FROM stopwatch_sessions \
             )",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(err)?;

    Ok(FocusStats {
        sessions_today,
        focus_min_today,
        sessions_this_week,
        focus_min_this_week,
        sessions_total,
        focus_min_total,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_pomodoro_settings(state: State<'_, DbState>) -> Result<PomodoroSettings, String> {
    let conn = state.0.lock().map_err(err)?;
    conn.query_row(
        "SELECT work_min, short_break_min, long_break_min, long_break_after, sound_enabled \
         FROM pomodoro_settings WHERE id = 1",
        [],
        |row| {
            Ok(PomodoroSettings {
                work_min: row.get(0)?,
                short_break_min: row.get(1)?,
                long_break_min: row.get(2)?,
                long_break_after: row.get(3)?,
                sound_enabled: row.get::<_, i64>(4)? != 0,
            })
        },
    )
    .map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_pomodoro_settings(
    state: State<'_, DbState>,
    work_min: i64,
    short_break_min: i64,
    long_break_min: i64,
    long_break_after: i64,
    sound_enabled: bool,
) -> Result<PomodoroSettings, String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "UPDATE pomodoro_settings SET \
            work_min = ?1, short_break_min = ?2, long_break_min = ?3, \
            long_break_after = ?4, sound_enabled = ?5 \
         WHERE id = 1",
        rusqlite::params![
            work_min,
            short_break_min,
            long_break_min,
            long_break_after,
            sound_enabled as i64
        ],
    )
    .map_err(err)?;
    conn.query_row(
        "SELECT work_min, short_break_min, long_break_min, long_break_after, sound_enabled \
         FROM pomodoro_settings WHERE id = 1",
        [],
        |row| {
            Ok(PomodoroSettings {
                work_min: row.get(0)?,
                short_break_min: row.get(1)?,
                long_break_min: row.get(2)?,
                long_break_after: row.get(3)?,
                sound_enabled: row.get::<_, i64>(4)? != 0,
            })
        },
    )
    .map_err(err)
}
