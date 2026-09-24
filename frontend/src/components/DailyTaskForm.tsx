import { useState } from 'react';
import { createDailyTask, deleteDailyTask, updateDailyTask } from '../lib/commands';
import { todayIso } from '../lib/date';
import type { DailyTask } from '../lib/types';
import Modal from './Modal';
import styles from './DailyTaskForm.module.css';

interface Props {
  existing?: DailyTask;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export default function DailyTaskForm({ existing, defaultDate, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.task_date ?? defaultDate ?? todayIso());
  const [details, setDetails] = useState(existing?.details ?? '');
  const [suggestedMinutes, setSuggestedMinutes] = useState(
    existing?.suggested_minutes?.toString() ?? '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const minutes = suggestedMinutes ? Number(suggestedMinutes) : null;
      const payload = {
        task_date: date,
        title: title.trim(),
        details: details.trim() || null,
        suggested_minutes: minutes,
      };
      if (existing) {
        await updateDailyTask({ id: existing.id, ...payload });
      } else {
        await createDailyTask(payload);
      }
      await onSaved();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteDailyTask(existing.id);
    await onSaved();
    onClose();
  };

  return (
    <Modal title={existing ? 'Edit daily task' : 'Add daily task'} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="daily-task-title">Task</label>
          <input
            id="daily-task-title"
            className={styles.input}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="daily-task-date">Date</label>
            <input
              id="daily-task-date"
              type="date"
              className={styles.input}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="daily-task-minutes">Suggested minutes</label>
            <input
              id="daily-task-minutes"
              type="number"
              min="5"
              step="5"
              className={styles.input}
              value={suggestedMinutes}
              onChange={(event) => setSuggestedMinutes(event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className={styles.hint}>
          This is only a planning estimate. Record actual study time with Stopwatch.
        </div>

        <div className={styles.field}>
          <label htmlFor="daily-task-details">Details (optional)</label>
          <textarea
            id="daily-task-details"
            className={styles.textarea}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
          />
        </div>

        <div className={styles.actions}>
          {existing && (
            <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
              {confirmDelete ? 'Click again to confirm' : 'Delete'}
            </button>
          )}
          <button type="button" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || !title.trim()}
          >
            {submitting ? 'Saving…' : existing ? 'Save' : 'Add task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
