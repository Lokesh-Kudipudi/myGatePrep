import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { deleteStopwatch, getStopwatchSessionsForDate } from '../lib/commands';
import FocusPortal from '../components/FocusPortal';
import { SUBJECTS } from '../lib/constants';
import { todayIso } from '../lib/date';
import { useStopwatch } from '../store/useStopwatch';
import type { StopwatchSession, Subject } from '../lib/types';
import styles from './Stopwatch.module.css';

function fmt(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hours, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}

function fmtDuration(minutes: number) {
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))}s`;
  return `${Math.round(minutes)}m`;
}

interface StopwatchProps {
  showHistory?: boolean;
}

export default function Stopwatch({ showHistory = true }: StopwatchProps) {
  const phase = useStopwatch((s) => s.phase);
  const elapsedSeconds = useStopwatch((s) => s.elapsedSeconds);
  const subject = useStopwatch((s) => s.subject);
  const topicLabel = useStopwatch((s) => s.topicLabel);
  const setSubject = useStopwatch((s) => s.setSubject);
  const setTopicLabel = useStopwatch((s) => s.setTopicLabel);
  const start = useStopwatch((s) => s.start);
  const pause = useStopwatch((s) => s.pause);
  const resume = useStopwatch((s) => s.resume);
  const finish = useStopwatch((s) => s.finish);
  const reset = useStopwatch((s) => s.reset);

  const [sessions, setSessions] = useState<StopwatchSession[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSessions(await getStopwatchSessionsForDate(todayIso()));
  }, []);

  useEffect(() => {
    if (!showHistory) return;
    refresh();
    window.addEventListener('focus-sessions-changed', refresh);
    return () => window.removeEventListener('focus-sessions-changed', refresh);
  }, [refresh, showHistory]);

  const isIdle = phase === 'idle';
  const isRunning = phase === 'running';

  const finishSession = async () => {
    await finish();
    refresh();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Stopwatch</h1>
          <p>Open-ended focus, measured at your pace.</p>
        </div>
        <button className={styles.subtleButton} onClick={() => setFocusMode(true)}>
          ◱ focus mode
        </button>
      </div>

      <div className={`${styles.timerCard} ${isRunning ? styles.glowing : ''}`}>
        <div className={styles.time}>{fmt(elapsedSeconds)}</div>
        <div className={styles.phaseLabel}>{phase}</div>
      </div>

      <div className={styles.inputs}>
        <label>
          <span>Subject</span>
          <select
            value={subject ?? ''}
            disabled={!isIdle}
            onChange={(e) => setSubject(e.target.value ? (e.target.value as Subject) : null)}
          >
            <option value="">—</option>
            {SUBJECTS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Topic</span>
          <input
            value={topicLabel}
            disabled={!isIdle}
            onChange={(e) => setTopicLabel(e.target.value)}
            placeholder="What are you working on?"
          />
        </label>
      </div>

      <div className={styles.actions}>
        {isIdle && <button className={styles.primary} onClick={start}>Start</button>}
        {isRunning && <button className={styles.primary} onClick={pause}>Pause</button>}
        {phase === 'paused' && <button className={styles.primary} onClick={resume}>Resume</button>}
        {!isIdle && <button onClick={finishSession}>Finish & save</button>}
        <button className={styles.danger} onClick={reset} disabled={isIdle && elapsedSeconds === 0}>
          Reset
        </button>
      </div>

      {showHistory && <hr className={styles.divider} />}
      {showHistory && <section>
        <h2 className={styles.sectionTitle}>Today's stopwatch sessions</h2>
        {deleteError && <div className={styles.deleteError}>{deleteError}</div>}
        {sessions.length === 0 ? (
          <div className={styles.empty}>No stopwatch sessions yet today.</div>
        ) : (
          <ul className={styles.sessionList}>
            {sessions.map((session) => (
              <li className={styles.sessionItem} key={session.id}>
                <span className={styles.sessionTime}>{format(parseISO(session.started_at), 'HH:mm')}</span>
                <span>{fmtDuration(session.actual_min)} · {session.subject ?? '—'}{session.topic_label ? ` · ${session.topic_label}` : ''}</span>
                <span className={styles.done}>✓</span>
                <button
                  className={styles.sessionDelete}
                  title="Delete session"
                  aria-label={`Delete stopwatch session at ${format(parseISO(session.started_at), 'HH:mm')}`}
                  onClick={async () => {
                    setDeleteError(null);
                    try {
                      await deleteStopwatch(session.id);
                      setSessions((current) => current.filter((item) => item.id !== session.id));
                      window.dispatchEvent(new Event('focus-sessions-changed'));
                    } catch (error) {
                      setDeleteError(`Could not delete session: ${String(error)}`);
                    }
                  }}
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </section>}

      {focusMode && (
        <FocusPortal>
          <div className={styles.focusMode}>
            <button className={styles.focusExit} onClick={() => setFocusMode(false)}>Exit focus</button>
            <div className={styles.focusContent}>
              <span className={styles.focusEyebrow}>Stopwatch · {phase}</span>
              <div className={styles.focusTime}>{fmt(elapsedSeconds)}</div>
              {(subject || topicLabel) && <div className={styles.focusTopic}>{[subject, topicLabel].filter(Boolean).join(' · ')}</div>}
              <div className={styles.focusActions}>
                {isIdle && <button onClick={start}>Start focus</button>}
                {isRunning && <button onClick={pause}>Pause</button>}
                {phase === 'paused' && <button onClick={resume}>Resume</button>}
                {!isIdle && <button onClick={finishSession}>Finish & save</button>}
              </div>
            </div>
          </div>
        </FocusPortal>
      )}
    </div>
  );
}
