use chrono::NaiveDate;
use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::DailyTask;

const SELECT_TASK: &str = "
    SELECT id, task_date, title, details, suggested_minutes, completed,
           completed_at, created_at, updated_at
    FROM daily_tasks
";

#[tauri::command(rename_all = "snake_case")]
pub fn create_daily_task(
    state: State<'_, DbState>,
    task_date: String,
    title: String,
    details: Option<String>,
    suggested_minutes: Option<i64>,
) -> Result<DailyTask, String> {
    validate_task(&task_date, &title, suggested_minutes)?;
    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO daily_tasks (task_date, title, details, suggested_minutes)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![
            task_date,
            title.trim(),
            clean_optional(details),
            suggested_minutes
        ],
    )
    .map_err(err)?;
    get_task(&conn, conn.last_insert_rowid()).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_today_daily_tasks(state: State<'_, DbState>) -> Result<Vec<DailyTask>, String> {
    let conn = state.0.lock().map_err(err)?;
    let sql = format!(
        "{} WHERE (task_date <= date('now', 'localtime') AND completed = 0)
             OR (completed = 1 AND date(completed_at, 'localtime') = date('now', 'localtime'))
         ORDER BY completed ASC, task_date ASC, id ASC",
        SELECT_TASK
    );
    query_tasks(&conn, &sql, []).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_daily_tasks_for_date(
    state: State<'_, DbState>,
    date: String,
) -> Result<Vec<DailyTask>, String> {
    validate_date(&date)?;
    let conn = state.0.lock().map_err(err)?;
    let sql = format!("{} WHERE task_date = ?1 ORDER BY id ASC", SELECT_TASK);
    query_tasks(&conn, &sql, [date]).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_daily_task(
    state: State<'_, DbState>,
    id: i64,
    task_date: String,
    title: String,
    details: Option<String>,
    suggested_minutes: Option<i64>,
) -> Result<DailyTask, String> {
    validate_task(&task_date, &title, suggested_minutes)?;
    let conn = state.0.lock().map_err(err)?;
    let changed = conn
        .execute(
            "UPDATE daily_tasks
             SET task_date = ?1, title = ?2, details = ?3, suggested_minutes = ?4,
                 updated_at = datetime('now')
             WHERE id = ?5",
            rusqlite::params![
                task_date,
                title.trim(),
                clean_optional(details),
                suggested_minutes,
                id
            ],
        )
        .map_err(err)?;
    if changed == 0 {
        return Err("Daily task not found".into());
    }
    get_task(&conn, id).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_daily_task_completed(
    state: State<'_, DbState>,
    id: i64,
    completed: bool,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(err)?;
    let changed = conn
        .execute(
            "UPDATE daily_tasks
             SET completed = ?1,
                 completed_at = CASE WHEN ?1 = 1 THEN datetime('now') ELSE NULL END,
                 updated_at = datetime('now')
             WHERE id = ?2",
            rusqlite::params![completed, id],
        )
        .map_err(err)?;
    if changed == 0 {
        return Err("Daily task not found".into());
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_daily_task(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(err)?;
    let changed = conn
        .execute("DELETE FROM daily_tasks WHERE id = ?1", [id])
        .map_err(err)?;
    if changed == 0 {
        return Err("Daily task not found".into());
    }
    Ok(())
}

fn validate_task(date: &str, title: &str, suggested_minutes: Option<i64>) -> Result<(), String> {
    validate_date(date)?;
    if title.trim().is_empty() {
        return Err("Task title cannot be empty".into());
    }
    if suggested_minutes.is_some_and(|minutes| minutes <= 0) {
        return Err("Suggested minutes must be greater than zero".into());
    }
    Ok(())
}

fn validate_date(date: &str) -> Result<(), String> {
    NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map(|_| ())
        .map_err(err)
}

fn clean_optional(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    })
}

fn get_task(conn: &rusqlite::Connection, id: i64) -> rusqlite::Result<DailyTask> {
    let sql = format!("{} WHERE id = ?1", SELECT_TASK);
    conn.query_row(&sql, [id], row_to_task)
}

fn query_tasks<P>(
    conn: &rusqlite::Connection,
    sql: &str,
    params: P,
) -> rusqlite::Result<Vec<DailyTask>>
where
    P: rusqlite::Params,
{
    let mut stmt = conn.prepare(sql)?;
    let tasks = stmt.query_map(params, row_to_task)?.collect();
    tasks
}

fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<DailyTask> {
    let completed: i64 = row.get(5)?;
    Ok(DailyTask {
        id: row.get(0)?,
        task_date: row.get(1)?,
        title: row.get(2)?,
        details: row.get(3)?,
        suggested_minutes: row.get(4)?,
        completed: completed != 0,
        completed_at: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}
