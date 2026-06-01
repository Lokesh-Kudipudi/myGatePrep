import { useMemo, useState } from 'react';
import { logTestMarks } from '../lib/commands';
import type { TestDate } from '../lib/types';
import Modal from './Modal';
import styles from './TestForm.module.css';

interface Props {
  test: TestDate;
  onClose: () => void;
  onSaved: () => void;
}

const num = (s: string) => (s.trim() === '' ? null : Number(s));

export default function LogResultForm({ test, onClose, onSaved }: Props) {
  const [totalQ, setTotalQ] = useState(test.total_questions?.toString() ?? '');
  const [attempted, setAttempted] = useState(test.attempted?.toString() ?? '');
  const [correct, setCorrect] = useState(test.correct?.toString() ?? '');
  const [incorrect, setIncorrect] = useState(test.incorrect?.toString() ?? '');
  const [attained, setAttained] = useState(test.attained_marks?.toString() ?? '');
  const [total, setTotal] = useState(test.total_marks?.toString() ?? '');
  const [note, setNote] = useState(test.notes ?? '');
  const [submitting, setSubmitting] = useState(false);

  const accuracy = useMemo(() => {
    const a = num(attempted);
    const c = num(correct);
    if (a == null || c == null || a === 0) return null;
    return (c / a) * 100;
  }, [attempted, correct]);

  const scorePct = useMemo(() => {
    const a = num(attained);
    const t = num(total);
    if (a == null || t == null || t === 0) return null;
    return (a / t) * 100;
  }, [attained, total]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = num(attained);
    const t = num(total);
    if (a == null || t == null) return;
    setSubmitting(true);
    try {
      await logTestMarks({
        id: test.id,
        total_questions: num(totalQ),
        attempted: num(attempted),
        correct: num(correct),
        incorrect: num(incorrect),
        attained_marks: a,
        total_marks: t,
        notes: note.trim() || null,
      });
      onSaved();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Log result — ${test.label}`} onClose={onClose} width={560}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Total questions</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={totalQ}
              onChange={(e) => setTotalQ(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Attempted</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={attempted}
              onChange={(e) => setAttempted(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label>Correct</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Incorrect</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={incorrect}
              onChange={(e) => setIncorrect(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label>Attained marks</label>
            <input
              className={styles.input}
              type="number"
              step="0.25"
              value={attained}
              onChange={(e) => setAttained(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label>Total marks</label>
            <input
              className={styles.input}
              type="number"
              step="0.25"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.accuracyDisplay}>
          Score: {scorePct != null ? <strong>{scorePct.toFixed(1)}%</strong> : '—'}{' '}
          · Accuracy: {accuracy != null ? <strong>{accuracy.toFixed(1)}%</strong> : '—'}
        </div>

        <div className={styles.field}>
          <label>Note</label>
          <textarea
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || !attained.trim() || !total.trim()}
          >
            {submitting ? 'Saving…' : 'Save result'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
