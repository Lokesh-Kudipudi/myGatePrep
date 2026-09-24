#!/usr/bin/env bash
# Seeds the GATE Focus Tracker DB with realistic sample data:
#   - recent completed and pending daily tasks
#   - ~25 pomodoro sessions and 2 stopwatch sessions
#   - 3 test dates (one past with marks logged, two upcoming)
# Idempotent within itself (clears tables before inserting). Use this together
# with ./clean-db.sh if you want a totally fresh start.
set -euo pipefail

DB_DIR="${HOME}/Library/Application Support/com.personal.gate-tracker"
DB="${DB_DIR}/gate_prep.db"
SCHEMA="$(cd "$(dirname "$0")/.." && pwd)/backend/schema.sql"

mkdir -p "${DB_DIR}"

if [[ ! -f "${SCHEMA}" ]]; then
  echo "Schema not found at ${SCHEMA}" >&2
  exit 1
fi

# Ensure the schema is in place (idempotent).
sqlite3 "${DB}" < "${SCHEMA}"

# Wipe content tables, leave pomodoro_settings alone. Clearing the schedule
# marker makes the bundled plan return on the next app launch.
sqlite3 "${DB}" <<'SQL'
PRAGMA foreign_keys = ON;
DELETE FROM daily_tasks;
DELETE FROM app_metadata WHERE key = 'gate_2027_schedule_v1';
DELETE FROM pomodoro_sessions;
DELETE FROM stopwatch_sessions;
DELETE FROM test_dates;
DELETE FROM notes;
DELETE FROM sqlite_sequence
  WHERE name IN ('daily_tasks','pomodoro_sessions','stopwatch_sessions','test_dates','notes');
SQL

sqlite3 "${DB}" <<'SQL'
PRAGMA foreign_keys = ON;
BEGIN;

-- ---------------------------------------------------------------------------
-- Sample task history. The full bundled plan is restored by the app.
-- ---------------------------------------------------------------------------
INSERT INTO daily_tasks
  (task_date, title, details, suggested_minutes, completed, completed_at)
VALUES
 (date('now','-3 days'), 'Review pumping lemma mistakes', 'Sample task', 45, 1, datetime('now','-3 days','+10 hours')),
 (date('now','-2 days'), 'Practise pipelining hazards', 'Sample task', 60, 1, datetime('now','-2 days','+11 hours')),
 (date('now','-1 days'), 'Solve graph-colouring PYQs', 'Sample task', 45, 1, datetime('now','-1 days','+9 hours')),
 (date('now'), 'Analyse today''s mock', 'Sample task', 45, 0, NULL);

-- ---------------------------------------------------------------------------
-- Pomodoro sessions — spread over the last 14 days. A mix of completed work,
-- one interrupted work, and breaks.
-- ---------------------------------------------------------------------------
INSERT INTO pomodoro_sessions
  (started_at, ended_at, duration_min, actual_min, kind, completed, interrupted, subject, topic_label)
VALUES
 (datetime('now','-13 days','+9 hours'),  datetime('now','-13 days','+9 hours','+25 minutes'), 25, 25.0, 'work',        1, 0, 'DS',            'Trees'),
 (datetime('now','-13 days','+9 hours','+25 minutes'), datetime('now','-13 days','+9 hours','+30 minutes'), 5, 5.0, 'short_break', 1, 0, NULL, NULL),
 (datetime('now','-13 days','+9 hours','+30 minutes'), datetime('now','-13 days','+9 hours','+55 minutes'), 25, 25.0, 'work',        1, 0, 'DS',            'Trees'),

 (datetime('now','-11 days','+10 hours'), datetime('now','-11 days','+10 hours','+25 minutes'), 25, 25.0, 'work',        1, 0, 'Algorithms',    'Dijkstra'),
 (datetime('now','-11 days','+11 hours'), datetime('now','-11 days','+11 hours','+25 minutes'), 25, 25.0, 'work',        1, 0, 'Algorithms',    'Dijkstra'),

 (datetime('now','-9 days','+9 hours'),   datetime('now','-9 days','+9 hours','+25 minutes'),   25, 25.0, 'work',        1, 0, 'OS',            'Deadlocks'),
 (datetime('now','-9 days','+10 hours'),  datetime('now','-9 days','+10 hours','+18 minutes'),  25, 18.0, 'work',        0, 1, 'OS',            'Deadlocks'),

 (datetime('now','-7 days','+9 hours'),   datetime('now','-7 days','+9 hours','+25 minutes'),   25, 25.0, 'work',        1, 0, 'DBMS',          'Normalization'),
 (datetime('now','-7 days','+10 hours'),  datetime('now','-7 days','+10 hours','+25 minutes'),  25, 25.0, 'work',        1, 0, 'DBMS',          'Normalization'),
 (datetime('now','-7 days','+11 hours'),  datetime('now','-7 days','+11 hours','+25 minutes'),  25, 25.0, 'work',        1, 0, 'DBMS',          'BCNF'),
 (datetime('now','-7 days','+12 hours'),  datetime('now','-7 days','+12 hours','+15 minutes'),  15, 15.0, 'long_break',  1, 0, NULL, NULL),

 (datetime('now','-5 days','+14 hours'),  datetime('now','-5 days','+14 hours','+25 minutes'),  25, 25.0, 'work',        1, 0, 'CN',            'TCP'),
 (datetime('now','-5 days','+15 hours'),  datetime('now','-5 days','+15 hours','+25 minutes'),  25, 25.0, 'work',        1, 0, 'CN',            'TCP slow start'),

 (datetime('now','-3 days','+9 hours'),   datetime('now','-3 days','+9 hours','+25 minutes'),   25, 25.0, 'work',        1, 0, 'TOC',           'Pumping lemma'),
 (datetime('now','-3 days','+10 hours'),  datetime('now','-3 days','+10 hours','+25 minutes'),  25, 25.0, 'work',        1, 0, 'TOC',           'Pumping lemma'),
 (datetime('now','-3 days','+11 hours'),  datetime('now','-3 days','+11 hours','+25 minutes'),  25, 25.0, 'work',        1, 0, 'TOC',           'Regular languages'),

 (datetime('now','-2 days','+9 hours'),   datetime('now','-2 days','+9 hours','+25 minutes'),   25, 25.0, 'work',        1, 0, 'COA',           'Pipelining'),
 (datetime('now','-2 days','+10 hours'),  datetime('now','-2 days','+10 hours','+25 minutes'),  25, 25.0, 'work',        1, 0, 'COA',           'Hazards'),

 (datetime('now','-1 days','+9 hours'),   datetime('now','-1 days','+9 hours','+25 minutes'),   25, 25.0, 'work',        1, 0, 'Discrete Maths','Graph coloring'),
 (datetime('now','-1 days','+10 hours'),  datetime('now','-1 days','+10 hours','+25 minutes'),  25, 25.0, 'work',        1, 0, 'Discrete Maths','Graph coloring'),
 (datetime('now','-1 days','+11 hours'),  datetime('now','-1 days','+11 hours','+25 minutes'),  25, 25.0, 'work',        1, 0, 'Engineering Maths','Linear algebra'),

 -- Today
 (datetime('now','-50 minutes'),          datetime('now','-25 minutes'),                       25, 25.0, 'work',        1, 0, 'DS',            'Trees revisit'),
 (datetime('now','-20 minutes'),          datetime('now','+5 minutes'),                        25, 25.0, 'work',        1, 0, 'Algorithms',    'Dijkstra revisit');

INSERT INTO stopwatch_sessions
  (started_at, ended_at, actual_min, subject, topic_label)
VALUES
 (datetime('now','-4 days','+13 hours'), datetime('now','-4 days','+14 hours','+5 minutes'), 65.0, 'Aptitude', 'Quantitative practice'),
 (datetime('now','-90 minutes'), datetime('now','-55 minutes'), 35.0, 'DBMS', 'Transactions');

-- ---------------------------------------------------------------------------
-- Test dates — one past (with marks), two upcoming.
-- ---------------------------------------------------------------------------
INSERT INTO test_dates (label, test_date, test_type, subject,
                        total_questions, attempted, correct, incorrect,
                        attained_marks, total_marks, notes)
VALUES
 ('DS Subject Test',  date('now','-6 days'), 'Subject', 'DS',           30, 28, 22, 6, 38.5, 50.0, 'tight on time'),
 ('Mock Grand Test',  date('now','+10 days'), 'Grand',  NULL,           NULL, NULL, NULL, NULL, NULL, NULL, NULL),
 ('GATE 2027',        date('now','+40 days'), 'Grand',  NULL,           NULL, NULL, NULL, NULL, NULL, NULL, NULL);

COMMIT;
SQL

echo "Seeded ${DB}"
echo "  tasks:            $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM daily_tasks;')"
echo "  tasks completed:  $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM daily_tasks WHERE completed=1;')"
echo "  pomodoros:        $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM pomodoro_sessions;')"
echo "  stopwatches:      $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM stopwatch_sessions;')"
echo "  focus min total:  $(sqlite3 "${DB}" "SELECT ROUND(SUM(actual_min),1) FROM (SELECT actual_min FROM pomodoro_sessions WHERE kind='work' AND completed=1 AND interrupted=0 UNION ALL SELECT actual_min FROM stopwatch_sessions);")"
echo "  test dates:       $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM test_dates;')"
