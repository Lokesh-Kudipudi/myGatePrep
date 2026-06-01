-- GATE Focus Tracker — initial schema
-- See docs/3-data-schema.md for full field documentation.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS topics (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    subject      TEXT    NOT NULL,
    topic_name   TEXT    NOT NULL,
    note         TEXT,
    difficulty   INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
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

CREATE TABLE IF NOT EXISTS daily_logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date       TEXT    NOT NULL UNIQUE,
    hours_studied  REAL,
    note           TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

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
