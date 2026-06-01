import { useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { createTopic } from '../lib/commands';
import { SUBJECTS, REVIEW_INTERVALS } from '../lib/constants';
import { todayIso } from '../lib/date';
import type { Subject } from '../lib/types';
import styles from './LogTopicSheet.module.css';

interface Props {
  onClose: () => void;
  onLogged: () => void;
}

const DIFFICULTIES: Array<{ value: 1 | 2 | 3; label: string }> = [
  { value: 1, label: 'Easy' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Hard' },
];

export default function LogTopicSheet({ onClose, onLogged }: Props) {
  const [subject, setSubject] = useState<Subject>(SUBJECTS[0]);
  const [topicName, setTopicName] = useState('');
  const [note, setNote] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [scheduled, setScheduled] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;
    setSubmitting(true);
    const loggedDate = todayIso();
    try {
      await createTopic({
        subject,
        topic_name: topicName.trim(),
        note: note.trim() || null,
        difficulty,
        logged_date: loggedDate,
      });
      const dates = REVIEW_INTERVALS.map((n) =>
        format(addDays(parseISO(loggedDate), n), 'MMM d'),
      );
      setScheduled(dates);
      onLogged();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Log topic</h2>
          <button type="button" className={styles.close} onClick={onClose}>
            close
          </button>
        </div>

        {scheduled ? (
          <>
            <div className={styles.scheduled}>
              Revisions queued:
              <br />
              {scheduled.join(' · ')}
            </div>
            <div className={styles.actions}>
              <button type="button" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="subject">Subject</label>
              <select
                id="subject"
                className={styles.select}
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="topic">Topic name</label>
              <input
                id="topic"
                className={styles.input}
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g. Deadlocks"
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="note">Note (optional)</label>
              <textarea
                id="note"
                className={styles.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label>Difficulty</label>
              <div className={styles.pillRow}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`${styles.pill} ${difficulty === d.value ? styles.active : ''}`}
                    onClick={() => setDifficulty(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting || !topicName.trim()}
              >
                {submitting ? 'Saving…' : 'Log topic'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
