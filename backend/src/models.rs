use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Topic {
    pub id: i64,
    pub subject: String,
    pub topic_name: String,
    pub note: Option<String>,
    pub difficulty: i64,
    pub logged_date: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Review {
    pub id: i64,
    pub topic_id: i64,
    pub due_date: String,
    pub interval_day: i64,
    pub completed: bool,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReviewWithTopic {
    pub id: i64,
    pub topic_id: i64,
    pub due_date: String,
    pub interval_day: i64,
    pub completed: bool,
    pub completed_at: Option<String>,
    pub subject: String,
    pub topic_name: String,
    pub difficulty: i64,
    pub logged_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyLog {
    pub id: i64,
    pub log_date: String,
    pub hours_studied: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestDate {
    pub id: i64,
    pub label: String,
    pub test_date: String,
    pub test_type: String,
    pub subject: Option<String>,
    pub total_questions: Option<i64>,
    pub attempted: Option<i64>,
    pub correct: Option<i64>,
    pub incorrect: Option<i64>,
    pub attained_marks: Option<f64>,
    pub total_marks: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HeatmapDay {
    pub date: String,
    pub hours: f64,
    pub topic_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubjectCoverage {
    pub subject: String,
    pub topic_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Streak {
    pub current: i64,
    pub longest: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CalendarDay {
    pub date: String,
    pub has_log: bool,
    pub reviews_due: i64,
    pub reviews_done: i64,
    pub test_dates: Vec<CalendarTestDate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CalendarTestDate {
    pub label: String,
    pub test_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestTypeAverage {
    pub test_type: String,
    pub avg_score_percent: f64,
    pub avg_accuracy: Option<f64>,
    pub tests_taken: i64,
}
