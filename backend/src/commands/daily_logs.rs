use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::DailyLog;

#[tauri::command(rename_all = "snake_case")]
pub fn upsert_daily_log(
    state: State<'_, DbState>,
    log_date: String,
    hours_studied: Option<f64>,
    note: Option<String>,
) -> Result<DailyLog, String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO daily_logs (log_date, hours_studied, note) VALUES (?1, ?2, ?3) \
         ON CONFLICT(log_date) DO UPDATE SET \
            hours_studied = excluded.hours_studied, \
            note = excluded.note",
        rusqlite::params![log_date, hours_studied, note],
    )
    .map_err(err)?;
    fetch(&conn, &log_date)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_daily_log(
    state: State<'_, DbState>,
    date: String,
) -> Result<Option<DailyLog>, String> {
    let conn = state.0.lock().map_err(err)?;
    match fetch(&conn, &date) {
        Ok(log) => Ok(Some(log)),
        Err(e) if e == "Query returned no rows" => Ok(None),
        Err(e) => Err(e),
    }
}

fn fetch(conn: &rusqlite::Connection, date: &str) -> Result<DailyLog, String> {
    conn.query_row(
        "SELECT id, log_date, hours_studied, note FROM daily_logs WHERE log_date = ?1",
        [date],
        |row| {
            Ok(DailyLog {
                id: row.get(0)?,
                log_date: row.get(1)?,
                hours_studied: row.get(2)?,
                note: row.get(3)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => "Query returned no rows".to_string(),
        other => other.to_string(),
    })
}
