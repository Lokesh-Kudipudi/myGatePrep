# Changelog

All notable changes to GATE Focus Tracker are documented here.

## [0.2.1] - 2026-10-02

- Show only tasks scheduled for today on the Today page; past tasks remain accessible in Calendar.
- Remove the days-overdue tag from task cards.

## [0.2.0] - 2026-09-24

### Added

- Bundled the complete GATE 2027 schedule from 28 September through 31 December 2026.
- Added 412 persistent daily tasks across 95 scheduled dates.
- Added daily-task creation, editing, rescheduling, completion, undo, and deletion.
- Added overdue incomplete tasks to the Today page.
- Added per-day task completion counts and overdue indicators to Calendar.
- Added one-time schedule seeding that preserves subsequent user edits and deletions.

### Changed

- Made daily tasks the primary progress unit throughout the application.
- Task completions now contribute to streaks, heatmap activity, and progress totals.
- Renamed progress statistics from topics and reviews to Tasks completed.
- Updated Stopwatch and Pomodoro labels from Topic to Task.
- Kept suggested task durations informational; actual study time remains controlled by Stopwatch or Pomodoro.
- Updated the sample database scripts and project documentation for the task-based workflow.

### Removed

- Removed topic logging from Today and Calendar.
- Removed automatically generated revision queues and calendar review markers.
- Removed the 1–4–7–14–30 spaced-repetition workflow and its active backend commands.

### Data compatibility

- Existing topic and review records are left intact in older databases for safety, but they are no longer used by the application.
