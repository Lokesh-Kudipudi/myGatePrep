import { useCallback, useEffect, useState } from 'react';
import { usePomodoro } from '../store/usePomodoro';
import PomodoroSettingsModal from '../components/PomodoroSettings';
import { getPomodorosForDate } from '../lib/commands';
import { todayIso } from '../lib/date';
import { SUBJECTS } from '../lib/constants';
import type { PomodoroSession, Subject } from '../lib/types';
import { format, parseISO } from 'date-fns';
import styles from './Pomodoro.module.css';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const PHASE_LABEL: Record<string, string> = {
  idle: 'READY',
  work: 'WORK',
  short_break: 'SHORT BREAK',
  long_break: 'LONG BREAK',
  paused: 'PAUSED',
};

export default function Pomodoro() {
  const phase = usePomodoro((s) => s.phase);
  const prevPhase = usePomodoro((s) => s.prevPhase);
  const secondsLeft = usePomodoro((s) => s.secondsLeft);
  const cycleCount = usePomodoro((s) => s.cycleCount);
  const subject = usePomodoro((s) => s.subject);
  const topicLabel = usePomodoro((s) => s.topicLabel);
  const settings = usePomodoro((s) => s.settings);
  const start = usePomodoro((s) => s.start);
  const pause = usePomodoro((s) => s.pause);
  const resume = usePomodoro((s) => s.resume);
  const skip = usePomodoro((s) => s.skip);
  const stop = usePomodoro((s) => s.stop);
  const reset = usePomodoro((s) => s.reset);
  const setSubject = usePomodoro((s) => s.setSubject);
  const setTopicLabel = usePomodoro((s) => s.setTopicLabel);

  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const refresh = useCallback(async () => {
    const list = await getPomodorosForDate(todayIso());
    setSessions(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, phase, secondsLeft]);
  // refresh fires whenever phase changes (session got recorded)

  const isRunning = phase !== 'idle' && phase !== 'paused';
  const isIdle = phase === 'idle';
  const isPaused = phase === 'paused';
  const isBreak =
    phase === 'short_break' ||
    phase === 'long_break' ||
    (isPaused && (prevPhase === 'short_break' || prevPhase === 'long_break'));
  const labelKey =
    phase === 'paused' && prevPhase ? prevPhase : phase;

  const phaseColor = isBreak ? 'var(--success)' : 'var(--amber)';

  const completedWork = cycleCount % settings.long_break_after;
  const nextLongIn = settings.long_break_after - completedWork;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Pomodoro</h1>
        <button
          type="button"
          className={styles.gear}
          disabled={isRunning || isPaused}
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          ⚙ settings
        </button>
      </div>

      <div
        className={`${styles.timerCard} ${isRunning ? styles.glowing : ''}`}
      >
        <div className={styles.time} style={{ color: phaseColor }}>
          {fmt(secondsLeft)}
        </div>
        <div className={styles.phaseLabel} style={{ color: phaseColor }}>
          {PHASE_LABEL[labelKey]}
        </div>
      </div>

      <div className={styles.inputs}>
        <label>
          <span>Subject</span>
          <select
            value={subject ?? ''}
            disabled={isRunning || isPaused}
            onChange={(e) =>
              setSubject(e.target.value ? (e.target.value as Subject) : null)
            }
          >
            <option value="">—</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Topic</span>
          <input
            type="text"
            value={topicLabel}
            disabled={isRunning || isPaused}
            onChange={(e) => setTopicLabel(e.target.value)}
            placeholder="e.g. Trees"
          />
        </label>
      </div>

      <div className={styles.actions}>
        {isIdle && (
          <>
            <button className={styles.primary} onClick={start}>
              Start
            </button>
            <button onClick={reset}>Reset</button>
          </>
        )}
        {phase === 'work' && (
          <>
            <button className={styles.primary} onClick={pause}>
              Pause
            </button>
            <button onClick={skip}>Skip</button>
            <button onClick={stop} className={styles.danger}>
              Stop
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button className={styles.primary} onClick={resume}>
              Resume
            </button>
            <button onClick={skip}>Skip</button>
            <button onClick={stop} className={styles.danger}>
              Stop
            </button>
          </>
        )}
        {(phase === 'short_break' || phase === 'long_break') && (
          <>
            <button className={styles.primary} onClick={skip}>
              Skip break
            </button>
            <button onClick={stop} className={styles.danger}>
              Stop
            </button>
          </>
        )}
      </div>

      <div className={styles.cycleInfo}>
        Cycle: {completedWork} of {settings.long_break_after}
        {' · '}
        {nextLongIn === settings.long_break_after
          ? `next long break after ${nextLongIn} work session${nextLongIn === 1 ? '' : 's'}`
          : `next long break in ${nextLongIn} work session${nextLongIn === 1 ? '' : 's'} (${settings.long_break_min}m)`}
      </div>

      <hr className={styles.divider} />

      <div className={styles.sessionsBlock}>
        <h2 className={styles.sectionTitle}>Today's sessions</h2>
        {sessions.length === 0 ? (
          <div className={styles.empty}>No sessions yet today.</div>
        ) : (
          <ul className={styles.sessionList}>
            {sessions.map((s) => (
              <li key={s.id} className={styles.sessionItem}>
                <span className={styles.sessionTime}>
                  {format(parseISO(s.started_at), 'HH:mm')}
                </span>
                <span className={styles.sessionDesc}>
                  {Math.round(s.actual_min)}m{' '}
                  {s.kind === 'work'
                    ? `${s.subject ?? '—'}${s.topic_label ? ` · ${s.topic_label}` : ''}`
                    : s.kind === 'short_break'
                      ? 'short break'
                      : 'long break'}
                </span>
                {s.interrupted ? (
                  <span className={styles.aborted}>✕ aborted</span>
                ) : (
                  <span className={styles.done}>✓</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showSettings && (
        <PomodoroSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
