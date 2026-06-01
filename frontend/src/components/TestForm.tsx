import { useState } from 'react';
import { createTestDate, deleteTestDate, updateTestDate } from '../lib/commands';
import { SUBJECTS, TEST_TYPES } from '../lib/constants';
import { todayIso } from '../lib/date';
import type { Subject, TestDate, TestType } from '../lib/types';
import Modal from './Modal';
import styles from './TestForm.module.css';

interface Props {
  /** When provided, the form opens in edit mode for this row. */
  existing?: TestDate;
  /** Optional pre-fill for the date when creating from a calendar day. */
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function TestForm({ existing, defaultDate, onClose, onSaved }: Props) {
  const [label, setLabel] = useState(existing?.label ?? '');
  const [date, setDate] = useState(existing?.test_date ?? defaultDate ?? todayIso());
  const [type, setType] = useState<TestType>(existing?.test_type ?? 'Mixed');
  const [subject, setSubject] = useState<Subject | ''>(existing?.subject ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const needsSubject = type === 'Topic' || type === 'Subject';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        label: label.trim(),
        test_date: date,
        test_type: type,
        subject: needsSubject ? (subject || null) : null,
        notes: notes.trim() || null,
      };
      if (existing) {
        await updateTestDate({ id: existing.id, ...payload });
      } else {
        await createTestDate(payload);
      }
      onSaved();
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
    await deleteTestDate(existing.id);
    onSaved();
    onClose();
  };

  return (
    <Modal title={existing ? 'Edit test' : 'Add test'} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="label">Name</label>
          <input
            id="label"
            className={styles.input}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. GATE Mock 3"
            autoFocus
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {needsSubject && (
            <div className={styles.field}>
              <label htmlFor="subject">Subject</label>
              <select
                id="subject"
                className={styles.select}
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
              >
                <option value="">— pick —</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label>Test type</label>
          <div className={styles.pillRow}>
            {TEST_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.pill} ${type === t ? styles.active : ''}`}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            disabled={submitting || !label.trim()}
          >
            {submitting ? 'Saving…' : existing ? 'Save' : 'Add test'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
