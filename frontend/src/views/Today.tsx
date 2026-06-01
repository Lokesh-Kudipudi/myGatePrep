import { useCallback, useEffect, useMemo, useState } from 'react';
import LogTopicSheet from '../components/LogTopicSheet';
import RevisionItem from '../components/RevisionItem';
import { getDailyLog, getTodayReviews, upsertDailyLog } from '../lib/commands';
import { todayIso } from '../lib/date';
import type { DailyLog, ReviewWithTopic, Subject } from '../lib/types';
import styles from './Today.module.css';

export default function Today() {
  const [reviews, setReviews] = useState<ReviewWithTopic[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  const refresh = useCallback(async () => {
    const [r, d] = await Promise.all([getTodayReviews(), getDailyLog(todayIso())]);
    setReviews(r);
    setDailyLog(d);
    if (d) {
      setHours(d.hours_studied != null ? String(d.hours_studied) : '');
      setNote(d.note ?? '');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grouped = useMemo(() => {
    const map = new Map<Subject, ReviewWithTopic[]>();
    for (const r of reviews) {
      if (!map.has(r.subject)) map.set(r.subject, []);
      map.get(r.subject)!.push(r);
    }
    return Array.from(map.entries());
  }, [reviews]);

  const handleMarkDone = (id: number) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await upsertDailyLog({
      log_date: todayIso(),
      hours_studied: hours.trim() ? parseFloat(hours) : null,
      note: note.trim() || null,
    });
    setDailyLog(updated);
    setShowLogForm(false);
  };

  const queueEmpty = reviews.length === 0;
  const noLogYet = dailyLog === null;

  return (
    <div className={styles.page}>
      {noLogYet && !showLogForm && (
        <div className={styles.banner}>
          <span className={styles.label}>No study logged yet today.</span>
          <button
            className={styles.bannerCta}
            onClick={() => setShowLogForm(true)}
          >
            Log now
          </button>
        </div>
      )}

      {showLogForm && (
        <form className={styles.logForm} onSubmit={handleSaveLog}>
          <div>
            <label>Hours</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="5.5"
              autoFocus
            />
          </div>
          <div>
            <label>Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did today feel?"
            />
          </div>
          <button type="submit" style={{ borderColor: 'var(--amber-dim)', color: 'var(--amber)' }}>
            Save
          </button>
        </form>
      )}

      {dailyLog && !showLogForm && (
        <div className={styles.logSummary}>
          Logged today:{' '}
          <strong>
            {dailyLog.hours_studied != null ? `${dailyLog.hours_studied}h` : '—'}
          </strong>
          {dailyLog.note ? <> · {dailyLog.note}</> : null}
          <button
            style={{ marginLeft: 'var(--gap-3)', fontSize: 11, padding: '2px 8px' }}
            onClick={() => setShowLogForm(true)}
          >
            edit
          </button>
        </div>
      )}

      <h2 className={styles.sectionTitle}>Today's revisions</h2>

      {queueEmpty ? (
        <div className={styles.empty}>All clear for today. Rest or go deeper.</div>
      ) : (
        grouped.map(([subject, items]) => (
          <div key={subject} className={styles.subjectGroup}>
            <div className={styles.subjectHeading}>{subject}</div>
            {items.map((r) => (
              <RevisionItem key={r.id} review={r} onDone={handleMarkDone} />
            ))}
          </div>
        ))
      )}

      <button
        className={styles.fab}
        onClick={() => setShowSheet(true)}
        title="Log a new topic"
      >
        +
      </button>

      {showSheet && (
        <LogTopicSheet
          onClose={() => setShowSheet(false)}
          onLogged={refresh}
        />
      )}
    </div>
  );
}
