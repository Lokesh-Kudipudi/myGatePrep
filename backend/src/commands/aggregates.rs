use std::collections::HashMap;

use chrono::{Days, NaiveDate};
use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::{
    CalendarDay, CalendarTestDate, HeatmapDay, ProgressSummary, Streak, TestTypeAverage,
};

#[tauri::command(rename_all = "snake_case")]
pub fn get_heatmap_data(state: State<'_, DbState>, days: i64) -> Result<Vec<HeatmapDay>, String> {
    let conn = state.0.lock().map_err(err)?;
    // Focus hours combine completed work pomodoros and saved stopwatch sessions.
    let mut stmt = conn
        .prepare(
            "WITH RECURSIVE date_series(d) AS ( \
                SELECT date('now', 'localtime', ?1) \
                UNION ALL \
                SELECT date(d, '+1 day') FROM date_series WHERE d < date('now', 'localtime') \
              ) \
              SELECT ds.d, \
                     COALESCE(( \
                       SELECT SUM(actual_min) / 60.0 FROM ( \
                         SELECT actual_min, date(started_at, 'localtime') AS session_date \
                         FROM pomodoro_sessions \
                         WHERE kind = 'work' AND completed = 1 AND interrupted = 0 \
                         UNION ALL \
                         SELECT actual_min, date(started_at, 'localtime') AS session_date \
                         FROM stopwatch_sessions \
                       ) WHERE session_date = ds.d), 0), \
                     (SELECT COUNT(*) FROM daily_tasks
                      WHERE completed = 1
                        AND date(completed_at, 'localtime') = ds.d) \
              FROM date_series ds \
              ORDER BY ds.d",
        )
        .map_err(err)?;
    let interval = format!("-{} days", days - 1);
    let rows = stmt
        .query_map([interval], |row| {
            Ok(HeatmapDay {
                date: row.get(0)?,
                hours: row.get(1)?,
                task_count: row.get(2)?,
            })
        })
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(rows)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_progress_summary(state: State<'_, DbState>) -> Result<ProgressSummary, String> {
    let conn = state.0.lock().map_err(err)?;

    let tasks_completed_this_week: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM daily_tasks
             WHERE completed = 1
               AND date(completed_at, 'localtime') >= date('now', 'localtime', '-6 days')",
            [],
            |row| row.get(0),
        )
        .map_err(err)?;

    let tasks_completed_all_time: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM daily_tasks WHERE completed = 1",
            [],
            |row| row.get(0),
        )
        .map_err(err)?;

    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT subject FROM ( \
               SELECT subject FROM pomodoro_sessions \
               WHERE kind = 'work' AND completed = 1 AND interrupted = 0 \
                 AND subject IS NOT NULL \
                 AND date(started_at, 'localtime') >= date('now', 'localtime', '-6 days') \
               UNION ALL \
               SELECT subject FROM stopwatch_sessions \
               WHERE subject IS NOT NULL \
                 AND date(started_at, 'localtime') >= date('now', 'localtime', '-6 days') \
             ) WHERE subject IS NOT NULL",
        )
        .map_err(err)?;
    let recently_active_subjects: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(err)?
        .filter_map(|r| r.ok())
        .collect();

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

    let (sessions_all_time, focus_min_all_time): (i64, f64) = conn
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

    Ok(ProgressSummary {
        hours_this_week: focus_min_this_week / 60.0,
        tasks_completed_this_week,
        recently_active_subjects,
        sessions_this_week,
        focus_min_this_week,
        hours_all_time: focus_min_all_time / 60.0,
        tasks_completed_all_time,
        sessions_all_time,
        focus_min_all_time,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_streak(state: State<'_, DbState>) -> Result<Streak, String> {
    let conn = state.0.lock().map_err(err)?;
    let dates = activity_dates(&conn).map_err(err)?;
    Ok(calculate_streak(&dates, chrono::Local::now().date_naive()))
}

fn activity_dates(conn: &rusqlite::Connection) -> rusqlite::Result<Vec<NaiveDate>> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT d FROM ( \
                SELECT date(completed_at, 'localtime') AS d FROM daily_tasks \
                  WHERE completed = 1 AND completed_at IS NOT NULL \
                UNION \
                SELECT date(started_at, 'localtime') AS d FROM pomodoro_sessions \
                  WHERE kind = 'work' AND completed = 1 AND interrupted = 0 \
                UNION \
                SELECT date(started_at, 'localtime') AS d FROM stopwatch_sessions \
            ) ORDER BY d DESC",
    )?;
    let dates: Vec<NaiveDate> = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .filter_map(|r| r.ok())
        .filter_map(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
        .collect();
    Ok(dates)
}

fn calculate_streak(dates: &[NaiveDate], today: NaiveDate) -> Streak {
    if dates.is_empty() {
        return Streak {
            current: 0,
            longest: 0,
        };
    }

    // Current streak: walk back from today (or yesterday if today has no entry).
    let mut current = 0_i64;
    let mut cursor = today;
    let set: std::collections::HashSet<NaiveDate> = dates.iter().copied().collect();
    if !set.contains(&today) {
        // allow streak to count yesterday as the latest entry
        cursor = today.checked_sub_days(Days::new(1)).unwrap_or(today);
    }
    while set.contains(&cursor) {
        current += 1;
        match cursor.checked_sub_days(Days::new(1)) {
            Some(prev) => cursor = prev,
            None => break,
        }
    }

    // Longest streak: walk sorted ascending, count contiguous runs.
    let mut sorted: Vec<NaiveDate> = set.into_iter().collect();
    sorted.sort();
    let mut longest = 1_i64;
    let mut run = 1_i64;
    for pair in sorted.windows(2) {
        let diff = (pair[1] - pair[0]).num_days();
        if diff == 1 {
            run += 1;
            if run > longest {
                longest = run;
            }
        } else {
            run = 1;
        }
    }

    Streak { current, longest }
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_calendar_month(
    state: State<'_, DbState>,
    year: i32,
    month: u32,
) -> Result<Vec<CalendarDay>, String> {
    let conn = state.0.lock().map_err(err)?;

    let first = NaiveDate::from_ymd_opt(year, month, 1).ok_or("invalid month")?;
    let next_month = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    }
    .ok_or("invalid month")?;
    let last = next_month.pred_opt().ok_or("invalid month")?;

    let start_s = first.format("%Y-%m-%d").to_string();
    let end_s = last.format("%Y-%m-%d").to_string();

    let mut tasks_pending: HashMap<String, i64> = Default::default();
    let mut tasks_done: HashMap<String, i64> = Default::default();
    let mut tests: HashMap<String, Vec<CalendarTestDate>> = Default::default();

    {
        let mut stmt = conn
            .prepare(
                "SELECT task_date, SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END),
                                   SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END)
                 FROM daily_tasks WHERE task_date BETWEEN ?1 AND ?2 GROUP BY task_date",
            )
            .map_err(err)?;
        let rows = stmt
            .query_map([&start_s, &end_s], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            })
            .map_err(err)?;
        for row in rows {
            let (date, pending, completed) = row.map_err(err)?;
            tasks_pending.insert(date.clone(), pending);
            tasks_done.insert(date, completed);
        }
    }
    {
        let mut stmt = conn
            .prepare(
                "SELECT test_date, label, test_type FROM test_dates \
                 WHERE test_date BETWEEN ?1 AND ?2",
            )
            .map_err(err)?;
        let rows = stmt
            .query_map([&start_s, &end_s], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(err)?;
        for r in rows {
            let (d, label, test_type) = r.map_err(err)?;
            tests
                .entry(d)
                .or_default()
                .push(CalendarTestDate { label, test_type });
        }
    }

    let mut out = Vec::new();
    let mut cursor = first;
    while cursor <= last {
        let key = cursor.format("%Y-%m-%d").to_string();
        out.push(CalendarDay {
            date: key.clone(),
            tasks_pending: *tasks_pending.get(&key).unwrap_or(&0),
            tasks_done: *tasks_done.get(&key).unwrap_or(&0),
            test_dates: tests.remove(&key).unwrap_or_default(),
        });
        cursor = match cursor.checked_add_days(Days::new(1)) {
            Some(d) => d,
            None => break,
        };
    }
    Ok(out)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_test_type_averages(state: State<'_, DbState>) -> Result<Vec<TestTypeAverage>, String> {
    let conn = state.0.lock().map_err(err)?;
    let mut stmt = conn
        .prepare(
            "SELECT test_type, \
                    AVG(attained_marks * 1.0 / total_marks) * 100, \
                    AVG(CASE WHEN attempted > 0 \
                             THEN correct * 1.0 / attempted ELSE NULL END) * 100, \
                    COUNT(*) \
             FROM test_dates \
             WHERE attained_marks IS NOT NULL AND total_marks IS NOT NULL \
             GROUP BY test_type",
        )
        .map_err(err)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(TestTypeAverage {
                test_type: row.get(0)?,
                avg_score_percent: row.get::<_, Option<f64>>(1)?.unwrap_or(0.0),
                avg_accuracy: row.get(2)?,
                tests_taken: row.get(3)?,
            })
        })
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::{activity_dates, calculate_streak};
    use chrono::Local;
    use rusqlite::Connection;

    #[test]
    fn completing_a_task_counts_as_streak_activity() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../../schema.sql"))
            .unwrap();
        conn.execute(
            "INSERT INTO daily_tasks
             (task_date, title, completed, completed_at)
             VALUES (date('now', 'localtime'), 'Completed task', 1, datetime('now'))",
            [],
        )
        .unwrap();

        let dates = activity_dates(&conn).unwrap();
        let streak = calculate_streak(&dates, Local::now().date_naive());

        assert_eq!(streak.current, 1);
        assert_eq!(streak.longest, 1);
    }
}
