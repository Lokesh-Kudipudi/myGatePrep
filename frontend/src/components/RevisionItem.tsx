import { useState } from 'react';
import { completeReview } from '../lib/commands';
import { daysUntil, formatShort } from '../lib/date';
import type { ReviewWithTopic } from '../lib/types';
import SubjectChip from './SubjectChip';
import styles from './RevisionItem.module.css';

interface Props {
  review: ReviewWithTopic;
  onDone: (id: number) => void;
}

export default function RevisionItem({ review, onDone }: Props) {
  const [removing, setRemoving] = useState(false);
  const overdueDays = -daysUntil(review.due_date);

  const handleMarkDone = async () => {
    setRemoving(true);
    await completeReview(review.id);
    setTimeout(() => onDone(review.id), 220);
  };

  return (
    <div className={`${styles.item} ${removing ? styles.removing : ''}`}>
      <SubjectChip subject={review.subject} />
      <span className={styles.topicName}>{review.topic_name}</span>
      <span className={styles.loggedDate} title="Originally logged">
        {formatShort(review.logged_date)}
      </span>
      <span className={styles.actionCell}>
        {overdueDays > 0 && (
          <span className={styles.overdueTag}>{overdueDays}d overdue</span>
        )}
        <button
          className={styles.markBtn}
          onClick={handleMarkDone}
          disabled={removing}
        >
          Mark done
        </button>
      </span>
    </div>
  );
}
