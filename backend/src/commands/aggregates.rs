use std::collections::HashMap;

use chrono::{Days, NaiveDate};
use tauri::State;

use crate::commands::err;
use crate::db::DbState;
use crate::models::{
    CalendarDay, CalendarTestDate, HeatmapDay, ProgressSummary, Streak, SubjectCoverage,
    TestTypeAverage,
};

#[tauri::command(rename_all = "snake_case")]
pub fn get_heatmap_data(
    state: State<'_, DbState>,
    days: i64,
) -> Result<Vec<HeatmapDay>, String> {
    let conn = state.0.lock().map_err(err)?;
    // Recursive CTE so every day in the window appears, even those without a
    // daily_log row but with topics logged (or no activity at all).
    let mut stmt = conn
        .prepare(
            "WITH RECURSIVE date_series(d) AS ( \
                SELECT date('now', ?1) \
                UNION ALL \
                SELECT date(d, '+1 day') FROM date_series WHERE d < date('now') \
              ) \
              SELECT ds.d, \
                     COALESCE(dl.hours_studied, 0), \
                     (SELECT COUNT(*) FROM topics WHERE logged_date = ds.d) \
              FROM date_series ds \
              LEFT JOIN daily_logs dl ON dl.log_date = ds.d \
              ORDER BY ds.d",
        )
        .map_err(err)?;
    let interval = format!("-{} days", days - 1);
    let rows = stmt
        .query_map([interval], |row| {
            Ok(HeatmapDay {
                date: row.get(0)?,
                hours: row.get(1)?,
                topic_count: row.get(2)?,
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

    let hours_this_week: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(hours_studied), 0) FROM daily_logs \
             WHERE log_date >= date('now', '-6 days')",
            [],
            |row| row.get(0),
        )
        .map_err(err)?;

    let topics_this_week: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM topics WHERE logged_date >= date('now', '-6 days')",
            [],
            |row| row.get(0),
        )
        .map_err(err)?;

    let reviews_done_this_week: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM reviews \
             WHERE completed = 1 AND date(completed_at) >= date('now', '-6 days')",
            [],
            |row| row.get(0),
        )
        .map_err(err)?;

    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT subject FROM topics \
             WHERE logged_date >= date('now', '-6 days')",
        )
        .map_err(err)?;
    let recently_active_subjects: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(err)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ProgressSummary {
        hours_this_week,
        topics_this_week,
        reviews_done_this_week,
        recently_active_subjects,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_subject_coverage(state: State<'_, DbState>) -> Result<Vec<SubjectCoverage>, String> {
    let conn = state.0.lock().map_err(err)?;
    let mut stmt = conn
        .prepare("SELECT subject, COUNT(*) FROM topics GROUP BY subject")
        .map_err(err)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(SubjectCoverage {
                subject: row.get(0)?,
                topic_count: row.get(1)?,
            })
        })
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    Ok(rows)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_streak(state: State<'_, DbState>) -> Result<Streak, String> {
    let conn = state.0.lock().map_err(err)?;
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT d FROM ( \
                SELECT logged_date AS d FROM topics \
                UNION \
                SELECT log_date AS d FROM daily_logs \
            ) ORDER BY d DESC",
        )
        .map_err(err)?;
    let dates: Vec<NaiveDate> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(err)?
        .filter_map(|r| r.ok())
        .filter_map(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
        .collect();

    if dates.is_empty() {
        return Ok(Streak { current: 0, longest: 0 });
    }

    // Current streak: walk back from today (or yesterday if today has no entry).
    let today = chrono::Local::now().date_naive();
    let mut current = 0_i64;
    let mut cursor = today;
    let set: std::collections::HashSet<NaiveDate> = dates.iter().copied().collect();
    if !set.contains(&today) {
        // allow streak to count yesterday as the latest entry
        cursor = today
            .checked_sub_days(Days::new(1))
            .unwrap_or(today);
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

    Ok(Streak { current, longest })
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

    // Pre-fetch the three groups for the month into hashmaps keyed by date.
    let mut has_log: std::collections::HashSet<String> = Default::default();
    let mut due: HashMap<String, i64> = Default::default();
    let mut done: HashMap<String, i64> = Default::default();
    let mut tests: HashMap<String, Vec<CalendarTestDate>> = Default::default();

    {
        let mut stmt = conn
            .prepare("SELECT log_date FROM daily_logs WHERE log_date BETWEEN ?1 AND ?2")
            .map_err(err)?;
        let rows = stmt
            .query_map([&start_s, &end_s], |row| row.get::<_, String>(0))
            .map_err(err)?;
        for r in rows {
            has_log.insert(r.map_err(err)?);
        }
    }
    {
        let mut stmt = conn
            .prepare(
                "SELECT due_date, SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END), \
                                  SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) \
                 FROM reviews WHERE due_date BETWEEN ?1 AND ?2 GROUP BY due_date",
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
        for r in rows {
            let (d, pending, completed) = r.map_err(err)?;
            due.insert(d.clone(), pending);
            done.insert(d, completed);
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
            has_log: has_log.contains(&key),
            reviews_due: *due.get(&key).unwrap_or(&0),
            reviews_done: *done.get(&key).unwrap_or(&0),
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
pub fn get_test_type_averages(
    state: State<'_, DbState>,
) -> Result<Vec<TestTypeAverage>, String> {
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
