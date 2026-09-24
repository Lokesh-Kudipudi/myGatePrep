mod commands;
mod db;
mod models;

use std::sync::Mutex;

use tauri::Manager;

use crate::db::DbState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
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
            commands::daily_tasks::create_daily_task,
            commands::daily_tasks::get_today_daily_tasks,
            commands::daily_tasks::get_daily_tasks_for_date,
            commands::daily_tasks::update_daily_task,
            commands::daily_tasks::set_daily_task_completed,
            commands::daily_tasks::delete_daily_task,
            commands::notes::create_note,
            commands::notes::get_notes,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::test_dates::get_test_dates,
            commands::test_dates::create_test_date,
            commands::test_dates::update_test_date,
            commands::test_dates::log_test_marks,
            commands::test_dates::delete_test_date,
            commands::aggregates::get_heatmap_data,
            commands::aggregates::get_streak,
            commands::aggregates::get_calendar_month,
            commands::aggregates::get_test_type_averages,
            commands::aggregates::get_progress_summary,
            commands::pomodoros::record_pomodoro,
            commands::pomodoros::delete_pomodoro,
            commands::pomodoros::get_pomodoros_for_date,
            commands::pomodoros::get_pomodoro_sessions,
            commands::pomodoros::get_focus_stats,
            commands::pomodoros::get_pomodoro_settings,
            commands::pomodoros::update_pomodoro_settings,
            commands::stopwatch::record_stopwatch,
            commands::stopwatch::get_stopwatch_sessions_for_date,
            commands::stopwatch::get_stopwatch_sessions,
            commands::stopwatch::delete_stopwatch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
