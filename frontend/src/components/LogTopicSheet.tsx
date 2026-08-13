import { useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { createTopic, updateTopic } from '../lib/commands';
import { SUBJECTS, REVIEW_INTERVALS } from '../lib/constants';
import { todayIso } from '../lib/date';
import type { Subject, Topic } from '../lib/types';
import Modal from './Modal';
import styles from './LogTopicSheet.module.css';

interface Props {
  onClose: () => void;
  onLogged: () => void | Promise<void>;
  existing?: Topic;
}

export default function LogTopicSheet({ onClose, onLogged, existing }: Props) {
  const [subject, setSubject] = useState<Subject>(existing?.subject ?? SUBJECTS[0]);
  const [topicName, setTopicName] = useState(existing?.topic_name ?? '');
  const [scheduled, setScheduled] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;
    setSubmitting(true);
    setError(null);
    const loggedDate = todayIso();
    try {
      if (existing) {
        await updateTopic({
          id: existing.id,
          subject,
          topic_name: topicName.trim(),
        });
        await onLogged();
        onClose();
        return;
      }
      await createTopic({
        subject,
        topic_name: topicName.trim(),
        logged_date: loggedDate,
      });
      const dates = REVIEW_INTERVALS.map((n) =>
        format(addDays(parseISO(loggedDate), n), 'MMM d'),
      );
      setScheduled(dates);
      await onLogged();
    } catch (caught) {
      setError(`Could not save topic: ${String(caught)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={existing ? 'Edit topic' : 'Log topic'} onClose={onClose}>
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
          {existing && (
            <div className={styles.editNotice}>
              Logged {format(parseISO(existing.logged_date), 'MMM d, yyyy')} · review dates stay unchanged
            </div>
          )}
          {error && <div className={styles.error}>{error}</div>}
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

          <div className={styles.actions}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting || !topicName.trim()}
            >
              {submitting ? 'Saving…' : existing ? 'Save changes' : 'Log topic'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
