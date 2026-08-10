# Windows seed script for GATE Focus Tracker.
# Mirrors scripts/seed-db.sh: applies schema.sql, clears content tables,
# inserts 8 topics, 40 reviews, ~23 pomodoros, 2 stopwatches and 3 test dates.
#
# Requires sqlite3.exe on PATH. The easiest install is `winget install
# SQLite.SQLite` or `choco install sqlite`.
$ErrorActionPreference = "Stop"

$dbDir = Join-Path $env:APPDATA "com.personal.gate-tracker"
$db    = Join-Path $dbDir "gate_prep.db"
$root  = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$schema = Join-Path $root "backend\schema.sql"

if (-not (Test-Path -LiteralPath $schema)) {
    Write-Error "Schema not found at $schema"
    exit 1
}

if (-not (Get-Command sqlite3.exe -ErrorAction SilentlyContinue)) {
    Write-Error "sqlite3.exe not on PATH. Install via 'winget install SQLite.SQLite'."
    exit 1
}

New-Item -ItemType Directory -Force -Path $dbDir | Out-Null

# Apply schema (idempotent).
Get-Content -LiteralPath $schema -Raw | & sqlite3.exe $db

# Wipe content tables, preserve pomodoro_settings.
$wipeSql = @'
PRAGMA foreign_keys = ON;
DELETE FROM reviews;
DELETE FROM topics;
DELETE FROM pomodoro_sessions;
DELETE FROM stopwatch_sessions;
DELETE FROM test_dates;
DELETE FROM sqlite_sequence
  WHERE name IN ('reviews','topics','pomodoro_sessions','stopwatch_sessions','test_dates');
'@
$wipeSql | & sqlite3.exe $db

$seedSql = @'
PRAGMA foreign_keys = ON;
BEGIN;

INSERT INTO topics (subject, topic_name, note, difficulty, logged_date) VALUES
 ('DS',                'Binary Search Trees',     'AVL rotations clicked',     2, date('now','-13 days')),
 ('Algorithms',        'Dijkstra''s Algorithm',   NULL,                         3, date('now','-11 days')),
 ('OS',                'Deadlocks',               'banker''s example',          2, date('now','-9 days')),
 ('DBMS',              'Normalization',           '3NF vs BCNF',                2, date('now','-7 days')),
 ('CN',                'TCP Congestion Control',  NULL,                         3, date('now','-5 days')),
 ('TOC',               'Pumping Lemma',           'proof by contradiction',     3, date('now','-3 days')),
 ('COA',               'Pipelining Hazards',      NULL,                         2, date('now','-2 days')),
 ('Discrete Maths',    'Graph Coloring',          'chromatic number basics',    1, date('now','-1 days'));

INSERT INTO reviews (topic_id, due_date, interval_day)
SELECT t.id, date(t.logged_date, '+' || i.n || ' days'), i.n
FROM topics t
CROSS JOIN (SELECT 1 AS n UNION SELECT 4 UNION SELECT 7 UNION SELECT 14 UNION SELECT 30) i;

UPDATE reviews
SET completed = 1,
    completed_at = datetime(due_date, '+9 hours')
WHERE due_date < date('now');

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
 (datetime('now','-50 minutes'),          datetime('now','-25 minutes'),                       25, 25.0, 'work',        1, 0, 'DS',            'Trees revisit'),
 (datetime('now','-20 minutes'),          datetime('now','+5 minutes'),                        25, 25.0, 'work',        1, 0, 'Algorithms',    'Dijkstra revisit');

INSERT INTO stopwatch_sessions
  (started_at, ended_at, actual_min, subject, topic_label)
VALUES
 (datetime('now','-4 days','+13 hours'), datetime('now','-4 days','+14 hours','+5 minutes'), 65.0, 'Aptitude', 'Quantitative practice'),
 (datetime('now','-90 minutes'), datetime('now','-55 minutes'), 35.0, 'DBMS', 'Transactions');

INSERT INTO test_dates (label, test_date, test_type, subject,
                        total_questions, attempted, correct, incorrect,
                        attained_marks, total_marks, notes)
VALUES
 ('DS Subject Test',  date('now','-6 days'),  'Subject', 'DS',           30, 28, 22, 6, 38.5, 50.0, 'tight on time'),
 ('Mock Grand Test',  date('now','+10 days'), 'Grand',  NULL,           NULL, NULL, NULL, NULL, NULL, NULL, NULL),
 ('GATE 2027',        date('now','+40 days'), 'Grand',  NULL,           NULL, NULL, NULL, NULL, NULL, NULL, NULL);

COMMIT;
'@
$seedSql | & sqlite3.exe $db

Write-Host "Seeded $db"
Write-Host ("  topics:           {0}" -f (& sqlite3.exe $db "SELECT COUNT(*) FROM topics;"))
Write-Host ("  reviews:          {0}" -f (& sqlite3.exe $db "SELECT COUNT(*) FROM reviews;"))
Write-Host ("  reviews done:     {0}" -f (& sqlite3.exe $db "SELECT COUNT(*) FROM reviews WHERE completed=1;"))
Write-Host ("  pomodoros:        {0}" -f (& sqlite3.exe $db "SELECT COUNT(*) FROM pomodoro_sessions;"))
Write-Host ("  stopwatches:      {0}" -f (& sqlite3.exe $db "SELECT COUNT(*) FROM stopwatch_sessions;"))
Write-Host ("  focus min total:  {0}" -f (& sqlite3.exe $db "SELECT ROUND(SUM(actual_min),1) FROM (SELECT actual_min FROM pomodoro_sessions WHERE kind='work' AND completed=1 AND interrupted=0 UNION ALL SELECT actual_min FROM stopwatch_sessions);"))
Write-Host ("  test dates:       {0}" -f (& sqlite3.exe $db "SELECT COUNT(*) FROM test_dates;"))
