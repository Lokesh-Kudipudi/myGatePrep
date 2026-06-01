mod commands;
mod db;
mod models;

use std::sync::Mutex;

use tauri::Manager;

use crate::db::DbState;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            let conn = db::init(&data_dir).expect("failed to initialize database");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::topics::create_topic,
            commands::topics::get_topics,
            commands::topics::delete_topic,
            commands::reviews::get_today_reviews,
            commands::reviews::get_reviews_for_date,
            commands::reviews::complete_review,
            commands::daily_logs::upsert_daily_log,
            commands::daily_logs::get_daily_log,
            commands::test_dates::get_test_dates,
            commands::test_dates::create_test_date,
            commands::test_dates::update_test_date,
            commands::test_dates::log_test_marks,
            commands::test_dates::delete_test_date,
            commands::aggregates::get_heatmap_data,
            commands::aggregates::get_subject_coverage,
            commands::aggregates::get_streak,
            commands::aggregates::get_calendar_month,
            commands::aggregates::get_test_type_averages,
            commands::aggregates::get_progress_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
