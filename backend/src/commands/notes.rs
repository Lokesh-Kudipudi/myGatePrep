use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::Note;

const NOTE_COLS: &str = "id, title, content, created_at, updated_at";

fn row_to_note(row: &rusqlite::Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn validate(title: &str, content: &str) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("Note title cannot be empty".into());
    }
    if content.trim().is_empty() {
        return Err("Note content cannot be empty".into());
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn create_note(
    state: State<'_, DbState>,
    title: String,
    content: String,
) -> Result<Note, String> {
    validate(&title, &content)?;
    let conn = state.0.lock().map_err(err)?;
    conn.execute(
        "INSERT INTO notes (title, content) VALUES (?1, ?2)",
        rusqlite::params![title.trim(), content.trim()],
    )
    .map_err(err)?;
    let id = conn.last_insert_rowid();
    let sql = format!("SELECT {} FROM notes WHERE id = ?1", NOTE_COLS);
    conn.query_row(&sql, [id], row_to_note).map_err(err)
}

#[tauri::command]
pub fn get_notes(state: State<'_, DbState>) -> Result<Vec<Note>, String> {
    let conn = state.0.lock().map_err(err)?;
    let sql = format!(
        "SELECT {} FROM notes ORDER BY created_at DESC, id DESC",
        NOTE_COLS
    );
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let notes = stmt
        .query_map([], row_to_note)
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(notes)
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_note(
    state: State<'_, DbState>,
    id: i64,
    title: String,
    content: String,
) -> Result<Note, String> {
    validate(&title, &content)?;
    let conn = state.0.lock().map_err(err)?;
    let changed = conn
        .execute(
            "UPDATE notes SET title = ?1, content = ?2, updated_at = datetime('now') WHERE id = ?3",
            rusqlite::params![title.trim(), content.trim(), id],
        )
        .map_err(err)?;
    if changed == 0 {
        return Err("Note not found".into());
    }
    let sql = format!("SELECT {} FROM notes WHERE id = ?1", NOTE_COLS);
    conn.query_row(&sql, [id], row_to_note).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_note(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(err)?;
    let changed = conn
        .execute("DELETE FROM notes WHERE id = ?1", [id])
        .map_err(err)?;
    if changed == 0 {
        return Err("Note not found".into());
    }
    Ok(())
}
