-- GATE Focus Tracker — consolidated schema.
-- See docs/3-data-schema.md for field documentation.

PRAGMA foreign_keys = ON;

-- Hours are sourced from completed work pomodoros and saved stopwatch sessions.
-- The legacy daily_logs table is dropped on every startup if present.
DROP TABLE IF EXISTS daily_logs;

CREATE TABLE IF NOT EXISTS topics (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    subject      TEXT    NOT NULL,
    topic_name   TEXT    NOT NULL,
    logged_date  TEXT    NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_topics_logged_date ON topics(logged_date);
CREATE INDEX IF NOT EXISTS idx_topics_subject     ON topics(subject);

CREATE TABLE IF NOT EXISTS reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id      INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    due_date      TEXT    NOT NULL,
    interval_day  INTEGER NOT NULL CHECK (interval_day IN (1, 4, 7, 14, 30)),
    completed     INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    completed_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_due_date  ON reviews(due_date);
CREATE INDEX IF NOT EXISTS idx_reviews_topic_id  ON reviews(topic_id);
CREATE INDEX IF NOT EXISTS idx_reviews_completed ON reviews(completed);

CREATE TABLE IF NOT EXISTS test_dates (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    label            TEXT    NOT NULL,
    test_date        TEXT    NOT NULL,
    test_type        TEXT    NOT NULL CHECK (test_type IN ('Topic', 'Subject', 'Mixed', 'Grand')),
    subject          TEXT,
    total_questions  INTEGER,
    attempted        INTEGER,
    correct          INTEGER,
    incorrect        INTEGER,
    attained_marks   REAL,
    total_marks      REAL,
    notes            TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_test_dates_test_date ON test_dates(test_date);
CREATE INDEX IF NOT EXISTS idx_test_dates_test_type ON test_dates(test_type);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at    TEXT    NOT NULL,
    ended_at      TEXT    NOT NULL,
    duration_min  INTEGER NOT NULL,
    actual_min    REAL    NOT NULL,
    kind          TEXT    NOT NULL CHECK (kind IN ('work','short_break','long_break')),
    completed     INTEGER NOT NULL DEFAULT 1,
    interrupted   INTEGER NOT NULL DEFAULT 0,
    subject       TEXT,
    topic_label   TEXT,
    note          TEXT
);

CREATE INDEX IF NOT EXISTS idx_pomodoros_started_at ON pomodoro_sessions(date(started_at));
CREATE INDEX IF NOT EXISTS idx_pomodoros_kind       ON pomodoro_sessions(kind);

CREATE TABLE IF NOT EXISTS stopwatch_sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at    TEXT    NOT NULL,
    ended_at      TEXT    NOT NULL,
    actual_min    REAL    NOT NULL CHECK (actual_min >= 0),
    subject       TEXT,
    topic_label   TEXT,
    note          TEXT
);

CREATE INDEX IF NOT EXISTS idx_stopwatch_started_at ON stopwatch_sessions(date(started_at));

CREATE TABLE IF NOT EXISTS pomodoro_settings (
    id                INTEGER PRIMARY KEY CHECK (id = 1),
    work_min          INTEGER NOT NULL DEFAULT 25,
    short_break_min   INTEGER NOT NULL DEFAULT 5,
    long_break_min    INTEGER NOT NULL DEFAULT 15,
    long_break_after  INTEGER NOT NULL DEFAULT 4,
    sound_enabled     INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO pomodoro_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
