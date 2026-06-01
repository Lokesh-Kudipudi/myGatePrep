use chrono::{Days, NaiveDate};
use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::Topic;

const REVIEW_INTERVALS: [i64; 5] = [1, 4, 7, 14, 30];

#[tauri::command(rename_all = "snake_case")]
pub fn create_topic(
    state: State<'_, DbState>,
    subject: String,
    topic_name: String,
    note: Option<String>,
    difficulty: i64,
    logged_date: String,
) -> Result<Topic, String> {
    let logged = NaiveDate::parse_from_str(&logged_date, "%Y-%m-%d").map_err(err)?;
    let mut conn = state.0.lock().map_err(err)?;
    let tx = conn.transaction().map_err(err)?;

    tx.execute(
        "INSERT INTO topics (subject, topic_name, note, difficulty, logged_date) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![subject, topic_name, note, difficulty, logged_date],
    )
    .map_err(err)?;

    let topic_id = tx.last_insert_rowid();

    for interval in REVIEW_INTERVALS {
        let due = logged
            .checked_add_days(Days::new(interval as u64))
            .ok_or_else(|| "date overflow".to_string())?
            .format("%Y-%m-%d")
            .to_string();
        tx.execute(
            "INSERT INTO reviews (topic_id, due_date, interval_day) VALUES (?1, ?2, ?3)",
            rusqlite::params![topic_id, due, interval],
        )
        .map_err(err)?;
    }

    let topic = tx
        .query_row(
            "SELECT id, subject, topic_name, note, difficulty, logged_date, created_at \
             FROM topics WHERE id = ?1",
            [topic_id],
            row_to_topic,
        )
        .map_err(err)?;

    tx.commit().map_err(err)?;
    Ok(topic)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_topics(
    state: State<'_, DbState>,
    date: Option<String>,
) -> Result<Vec<Topic>, String> {
    let conn = state.0.lock().map_err(err)?;
    let (sql, params): (&str, Vec<&dyn rusqlite::ToSql>) = match &date {
        Some(d) => (
            "SELECT id, subject, topic_name, note, difficulty, logged_date, created_at \
             FROM topics WHERE logged_date = ?1 ORDER BY created_at DESC",
            vec![d],
        ),
        None => (
            "SELECT id, subject, topic_name, note, difficulty, logged_date, created_at \
             FROM topics ORDER BY logged_date DESC, created_at DESC",
            vec![],
        ),
    };
    let mut stmt = conn.prepare(sql).map_err(err)?;
    let rows = stmt
        .query_map(params.as_slice(), row_to_topic)
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(rows)
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_topic(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute("DELETE FROM topics WHERE id = ?1", [id])
        .map_err(err)?;
    Ok(())
}

fn row_to_topic(row: &rusqlite::Row) -> rusqlite::Result<Topic> {
    Ok(Topic {
        id: row.get(0)?,
        subject: row.get(1)?,
        topic_name: row.get(2)?,
        note: row.get(3)?,
        difficulty: row.get(4)?,
        logged_date: row.get(5)?,
        created_at: row.get(6)?,
    })
}
