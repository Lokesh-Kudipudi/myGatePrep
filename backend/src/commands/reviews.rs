use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::ReviewWithTopic;

const SELECT_REVIEW_WITH_TOPIC: &str = "
    SELECT r.id, r.topic_id, r.due_date, r.interval_day, r.completed, r.completed_at,
           t.subject, t.topic_name, t.logged_date
    FROM reviews r
    JOIN topics t ON t.id = r.topic_id
";

#[tauri::command(rename_all = "snake_case")]
pub fn get_today_reviews(state: State<'_, DbState>) -> Result<Vec<ReviewWithTopic>, String> {
    let conn = state.0.lock().map_err(err)?;
    let sql = format!(
        "{} WHERE (r.due_date <= date('now', 'localtime') AND r.completed = 0) \
             OR (r.completed = 1 \
                 AND date(r.completed_at, 'localtime') = date('now', 'localtime')) \
         ORDER BY r.completed ASC, r.due_date ASC, t.subject ASC",
        SELECT_REVIEW_WITH_TOPIC
    );
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let rows = stmt
        .query_map([], row_to_review)
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(rows)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_reviews_for_date(
    state: State<'_, DbState>,
    date: String,
) -> Result<Vec<ReviewWithTopic>, String> {
    let conn = state.0.lock().map_err(err)?;
    let sql = format!(
        "{} WHERE r.due_date = ?1 ORDER BY t.subject ASC",
        SELECT_REVIEW_WITH_TOPIC
    );
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let rows = stmt
        .query_map([date], row_to_review)
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(rows)
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_review_completed(
    state: State<'_, DbState>,
    id: i64,
    completed: bool,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "UPDATE reviews \
         SET completed = ?1, \
             completed_at = CASE WHEN ?1 = 1 THEN datetime('now') ELSE NULL END \
         WHERE id = ?2",
        rusqlite::params![completed, id],
    )
    .map_err(err)?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_review(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute("DELETE FROM reviews WHERE id = ?1", [id])
        .map_err(err)?;
    Ok(())
}

fn row_to_review(row: &rusqlite::Row) -> rusqlite::Result<ReviewWithTopic> {
    let completed_int: i64 = row.get(4)?;
    Ok(ReviewWithTopic {
        id: row.get(0)?,
        topic_id: row.get(1)?,
        due_date: row.get(2)?,
        interval_day: row.get(3)?,
        completed: completed_int != 0,
        completed_at: row.get(5)?,
        subject: row.get(6)?,
        topic_name: row.get(7)?,
        logged_date: row.get(8)?,
    })
}
