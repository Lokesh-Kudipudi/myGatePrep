# Wipes the GATE Focus Tracker SQLite database on Windows so the next app
# launch starts with a fresh schema (schema.sql runs on every startup).
$ErrorActionPreference = "Stop"

$dbDir = Join-Path $env:APPDATA "com.personal.gate-tracker"
$db    = Join-Path $dbDir "gate_prep.db"

if (-not (Test-Path -LiteralPath $dbDir)) {
    Write-Host "No app-data dir found at: $dbDir"
    Write-Host "Nothing to clean."
    exit 0
}

foreach ($f in @($db, "$db-wal", "$db-shm")) {
    if (Test-Path -LiteralPath $f) {
        Remove-Item -LiteralPath $f -Force
    }
}

Write-Host "Cleaned: $db (+ wal/shm)"
Write-Host "Next app launch will recreate the schema from backend/schema.sql."
