use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::TestDate;

const SELECT_ALL: &str = "
    SELECT id, label, test_date, test_type, subject,
           total_questions, attempted, correct, incorrect,
           attained_marks, total_marks, notes
    FROM test_dates
";

#[tauri::command(rename_all = "snake_case")]
pub fn get_test_dates(state: State<'_, DbState>) -> Result<Vec<TestDate>, String> {
    let conn = state.0.lock().map_err(err)?;
    let mut stmt = conn
        .prepare(&format!("{} ORDER BY test_date ASC", SELECT_ALL))
        .map_err(err)?;
    let rows = stmt
        .query_map([], row_to_test_date)
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(rows)
}

#[tauri::command(rename_all = "snake_case")]
pub fn create_test_date(
    state: State<'_, DbState>,
    label: String,
    test_date: String,
    test_type: String,
    subject: Option<String>,
    notes: Option<String>,
) -> Result<TestDate, String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO test_dates (label, test_date, test_type, subject, notes) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![label, test_date, test_type, subject, notes],
    )
    .map_err(err)?;
    fetch(&conn, conn.last_insert_rowid())
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_test_date(
    state: State<'_, DbState>,
    id: i64,
    label: String,
    test_date: String,
    test_type: String,
    subject: Option<String>,
    notes: Option<String>,
) -> Result<TestDate, String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "UPDATE test_dates \
         SET label = ?1, test_date = ?2, test_type = ?3, subject = ?4, notes = ?5 \
         WHERE id = ?6",
        rusqlite::params![label, test_date, test_type, subject, notes, id],
    )
    .map_err(err)?;
    fetch(&conn, id)
}

#[tauri::command(rename_all = "snake_case")]
#[allow(clippy::too_many_arguments)]
pub fn log_test_marks(
    state: State<'_, DbState>,
    id: i64,
    total_questions: Option<i64>,
    attempted: Option<i64>,
    correct: Option<i64>,
    incorrect: Option<i64>,
    attained_marks: f64,
    total_marks: f64,
    notes: Option<String>,
) -> Result<TestDate, String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "UPDATE test_dates SET \
            total_questions = ?1, attempted = ?2, correct = ?3, incorrect = ?4, \
            attained_marks = ?5, total_marks = ?6, \
            notes = COALESCE(?7, notes) \
         WHERE id = ?8",
        rusqlite::params![
            total_questions,
            attempted,
            correct,
            incorrect,
            attained_marks,
            total_marks,
            notes,
            id
        ],
    )
    .map_err(err)?;
    fetch(&conn, id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_test_date(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(err)?;
    conn.execute("DELETE FROM test_dates WHERE id = ?1", [id])
        .map_err(err)?;
    Ok(())
}

fn fetch(conn: &rusqlite::Connection, id: i64) -> Result<TestDate, String> {
    conn.query_row(
        &format!("{} WHERE id = ?1", SELECT_ALL),
        [id],
        row_to_test_date,
    )
    .map_err(err)
}

fn row_to_test_date(row: &rusqlite::Row) -> rusqlite::Result<TestDate> {
    Ok(TestDate {
        id: row.get(0)?,
        label: row.get(1)?,
        test_date: row.get(2)?,
        test_type: row.get(3)?,
        subject: row.get(4)?,
        total_questions: row.get(5)?,
        attempted: row.get(6)?,
        correct: row.get(7)?,
        incorrect: row.get(8)?,
        attained_marks: row.get(9)?,
        total_marks: row.get(10)?,
        notes: row.get(11)?,
    })
}
