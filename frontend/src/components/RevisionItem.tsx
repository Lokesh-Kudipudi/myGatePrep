import { useState } from 'react';
import { setReviewCompleted } from '../lib/commands';
import { daysUntil, formatShort } from '../lib/date';
import type { ReviewWithTopic } from '../lib/types';
import styles from './RevisionItem.module.css';

interface Props {
  review: ReviewWithTopic;
  onChanged: () => void | Promise<void>;
}

export default function RevisionItem({ review, onChanged }: Props) {
  const [updating, setUpdating] = useState(false);
  const overdueDays = -daysUntil(review.due_date);

  const handleToggle = async () => {
    setUpdating(true);
    try {
      await setReviewCompleted(review.id, !review.completed);
      await onChanged();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`${styles.item} ${review.completed ? styles.completed : ''}`}>
      <span className={styles.topicName}>{review.topic_name}</span>
      <span className={styles.loggedDate} title="Originally logged">
        {formatShort(review.logged_date)}
      </span>
      <span className={styles.actionCell}>
        {review.completed ? (
          <span className={styles.doneTag}>Done today</span>
        ) : overdueDays > 0 ? (
          <span className={styles.overdueTag}>{overdueDays}d overdue</span>
        ) : null}
        <button
          className={`${styles.markBtn} ${review.completed ? styles.undoBtn : ''}`}
          onClick={handleToggle}
          disabled={updating}
        >
          {updating ? 'Saving…' : review.completed ? 'Undo' : 'Mark done'}
        </button>
      </span>
    </div>
  );
}
