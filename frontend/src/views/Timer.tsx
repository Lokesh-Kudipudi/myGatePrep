import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import Modal from '../components/Modal';
import {
  deletePomodoro,
  deleteStopwatch,
  getPomodoroSessions,
  getStopwatchSessions,
} from '../lib/commands';
import type { PomodoroSession, StopwatchSession } from '../lib/types';
import { usePomodoro } from '../store/usePomodoro';
import { useStopwatch } from '../store/useStopwatch';
import Pomodoro from './Pomodoro';
import Stopwatch from './Stopwatch';
import styles from './Timer.module.css';

type TimerMode = 'pomodoro' | 'stopwatch';
type HistorySession =
  | { source: 'pomodoro'; value: PomodoroSession }
  | { source: 'stopwatch'; value: StopwatchSession };

function dateKey(session: HistorySession) {
  return format(parseISO(session.value.started_at), 'yyyy-MM-dd');
}

function focusMinutes(session: HistorySession) {
  if (session.source === 'stopwatch') return session.value.actual_min;
  return session.value.kind === 'work' && !session.value.interrupted
    ? session.value.actual_min
    : 0;
}

function durationLabel(minutes: number) {
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} sec`;
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return `${hours}h${mins ? ` ${mins}m` : ''}`;
}

function sessionLabel(session: HistorySession) {
  if (session.source === 'stopwatch') return 'Stopwatch';
  if (session.value.kind === 'work') return 'Pomodoro';
  return session.value.kind === 'short_break' ? 'Short break' : 'Long break';
}

export default function Timer() {
  const pomodoroActive = usePomodoro((state) => state.phase !== 'idle');
  const stopwatchActive = useStopwatch((state) => state.phase !== 'idle');
  const [mode, setMode] = useState<TimerMode>(() =>
    stopwatchActive && !pomodoroActive ? 'stopwatch' : 'pomodoro',
  );
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [pomodoros, stopwatches] = await Promise.all([
        getPomodoroSessions(),
        getStopwatchSessions(),
      ]);
      const combined: HistorySession[] = [
        ...pomodoros.map((value) => ({ source: 'pomodoro' as const, value })),
        ...stopwatches.map((value) => ({ source: 'stopwatch' as const, value })),
      ];
      combined.sort(
        (a, b) =>
          new Date(b.value.started_at).getTime() -
          new Date(a.value.started_at).getTime(),
      );
      setSessions(combined);
      setError(null);
    } catch (reason) {
      setError(`Could not load session history: ${String(reason)}`);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus-sessions-changed', refresh);
    return () => window.removeEventListener('focus-sessions-changed', refresh);
  }, [refresh]);

  const groups = useMemo(() => {
    const byDate = new Map<string, HistorySession[]>();
    sessions.forEach((session) => {
      const key = dateKey(session);
      byDate.set(key, [...(byDate.get(key) ?? []), session]);
    });
    return [...byDate.entries()];
  }, [sessions]);

  const selectedSessions = selectedDate
    ? groups.find(([date]) => date === selectedDate)?.[1] ?? []
    : [];

  const removeSession = async (session: HistorySession) => {
    try {
      if (session.source === 'pomodoro') await deletePomodoro(session.value.id);
      else await deleteStopwatch(session.value.id);
      if (selectedSessions.length === 1) setSelectedDate(null);
      window.dispatchEvent(new Event('focus-sessions-changed'));
      await refresh();
    } catch (reason) {
      setError(`Could not delete session: ${String(reason)}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Timer</h1>
          <p>Choose a structured sprint or track an open-ended study session.</p>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Timer type">
          <button
            className={mode === 'pomodoro' ? styles.activeTab : ''}
            onClick={() => setMode('pomodoro')}
          >
            Pomodoro {pomodoroActive && <span className={styles.liveDot} />}
          </button>
          <button
            className={mode === 'stopwatch' ? styles.activeTab : ''}
            onClick={() => setMode('stopwatch')}
          >
            Stopwatch {stopwatchActive && <span className={styles.liveDot} />}
          </button>
        </div>
      </div>

      <div className={styles.timerPanel}>
        {mode === 'pomodoro' ? (
          <Pomodoro showHistory={false} />
        ) : (
          <Stopwatch showHistory={false} />
        )}
      </div>

      <section className={styles.history}>
        <div className={styles.historyHeader}>
          <div>
            <span className={styles.eyebrow}>Session archive</span>
            <h2>Previous timer sessions</h2>
          </div>
          <span>{sessions.length} sessions</span>
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {groups.length === 0 ? (
          <div className={styles.empty}>Your completed sessions will appear here.</div>
        ) : (
          <div className={styles.historyGrid}>
            {groups.map(([date, items]) => {
              const parsedDate = parseISO(date);
              const minutes = items.reduce((sum, item) => sum + focusMinutes(item), 0);
              return (
                <button
                  key={date}
                  className={styles.dateCard}
                  onClick={() => setSelectedDate(date)}
                >
                  <span className={styles.cardDate}>
                    {isToday(parsedDate) ? 'Today' : format(parsedDate, 'EEEE')}
                  </span>
                  <strong>{format(parsedDate, 'dd MMM yyyy')}</strong>
                  <div className={styles.cardStats}>
                    <span>{items.length} session{items.length === 1 ? '' : 's'}</span>
                    <span>{durationLabel(minutes)} focused</span>
                  </div>
                  <span className={styles.viewLink}>View sessions →</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedDate && (
        <Modal
          title={format(parseISO(selectedDate), 'EEEE, dd MMMM yyyy')}
          onClose={() => setSelectedDate(null)}
          width={680}
        >
          <div className={styles.modalSummary}>
            <span>{selectedSessions.length} sessions</span>
            <span>
              {durationLabel(
                selectedSessions.reduce((sum, item) => sum + focusMinutes(item), 0),
              )}{' '}
              focused
            </span>
          </div>
          <div className={styles.modalList}>
            {selectedSessions.map((session) => (
              <div
                className={styles.sessionRow}
                key={`${session.source}-${session.value.id}`}
              >
                <span className={styles.sessionTime}>
                  {format(parseISO(session.value.started_at), 'HH:mm')}
                </span>
                <div className={styles.sessionDetails}>
                  <strong>{sessionLabel(session)}</strong>
                  <span>
                    {[session.value.subject, session.value.topic_label]
                      .filter(Boolean)
                      .join(' · ') || 'No subject or topic'}
                  </span>
                </div>
                <span className={styles.sessionDuration}>
                  {durationLabel(session.value.actual_min)}
                </span>
                <button
                  className={styles.deleteButton}
                  aria-label="Delete session"
                  title="Delete session"
                  onClick={() => removeSession(session)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
