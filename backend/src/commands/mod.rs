pub mod aggregates;
pub mod notes;
pub mod pomodoros;
pub mod reviews;
pub mod stopwatch;
pub mod test_dates;
pub mod topics;

/// Convert any error type into the `String` payload that Tauri serializes back
/// to the frontend. Keeps command bodies focused on logic.
pub(crate) fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}
