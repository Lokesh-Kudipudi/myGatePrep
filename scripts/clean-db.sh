#!/usr/bin/env bash
# Wipes the GATE Focus Tracker SQLite database so the next app launch
# starts with a fresh schema (schema.sql runs on every startup).
set -euo pipefail

DB_DIR="${HOME}/Library/Application Support/com.personal.gate-tracker"
DB="${DB_DIR}/gate_prep.db"

if [[ ! -d "${DB_DIR}" ]]; then
  echo "No app-data dir found at: ${DB_DIR}"
  echo "Nothing to clean."
  exit 0
fi

rm -f "${DB}" "${DB}-wal" "${DB}-shm"
echo "Cleaned: ${DB} (+ wal/shm)"
echo "Next app launch will recreate the schema from backend/schema.sql."
