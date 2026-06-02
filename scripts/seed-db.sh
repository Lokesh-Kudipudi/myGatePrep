#!/usr/bin/env bash
# Seeds the GATE Focus Tracker DB with realistic sample data:
#   - 8 topics across several subjects, each with 5 spaced-repetition reviews
#   - ~25 pomodoro sessions spread across the last 14 days
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

# Wipe the four content tables, leave pomodoro_settings alone.
sqlite3 "${DB}" <<'SQL'
PRAGMA foreign_keys = ON;
DELETE FROM reviews;
DELETE FROM topics;
DELETE FROM pomodoro_sessions;
DELETE FROM test_dates;
DELETE FROM sqlite_sequence
  WHERE name IN ('reviews','topics','pomodoro_sessions','test_dates');
SQL

sqlite3 "${DB}" <<'SQL'
PRAGMA foreign_keys = ON;
BEGIN;

-- ---------------------------------------------------------------------------
-- Topics (logged across the last ~14 days). 5 reviews each are generated
-- below at +1, +4, +7, +14, +30 days.
-- ---------------------------------------------------------------------------
INSERT INTO topics (subject, topic_name, note, difficulty, logged_date) VALUES
 ('DS',                'Binary Search Trees',     'AVL rotations clicked',     2, date('now','-13 days')),
 ('Algorithms',        'Dijkstra''s Algorithm',   NULL,                         3, date('now','-11 days')),
 ('OS',                'Deadlocks',               'banker''s example',          2, date('now','-9 days')),
 ('DBMS',              'Normalization',           '3NF vs BCNF',                2, date('now','-7 days')),
 ('CN',                'TCP Congestion Control',  NULL,                         3, date('now','-5 days')),
 ('TOC',               'Pumping Lemma',           'proof by contradiction',     3, date('now','-3 days')),
 ('COA',               'Pipelining Hazards',      NULL,                         2, date('now','-2 days')),
 ('Discrete Maths',    'Graph Coloring',          'chromatic number basics',    1, date('now','-1 days'));

-- Reviews — five rows per topic at standard intervals.
INSERT INTO reviews (topic_id, due_date, interval_day)
SELECT t.id, date(t.logged_date, '+' || i.n || ' days'), i.n
FROM topics t
CROSS JOIN (SELECT 1 AS n UNION SELECT 4 UNION SELECT 7 UNION SELECT 14 UNION SELECT 30) i;

-- Mark all reviews whose due_date is in the past as completed.
UPDATE reviews
SET completed = 1,
    completed_at = datetime(due_date, '+9 hours')
WHERE due_date < date('now');

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
echo "  topics:           $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM topics;')"
echo "  reviews:          $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM reviews;')"
echo "  reviews done:     $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM reviews WHERE completed=1;')"
echo "  pomodoros:        $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM pomodoro_sessions;')"
echo "  focus min total:  $(sqlite3 "${DB}" "SELECT ROUND(SUM(actual_min),1) FROM pomodoro_sessions WHERE kind='work' AND completed=1 AND interrupted=0;")"
echo "  test dates:       $(sqlite3 "${DB}" 'SELECT COUNT(*) FROM test_dates;')"
