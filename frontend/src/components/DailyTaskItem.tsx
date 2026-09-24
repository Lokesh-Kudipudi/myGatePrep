import { useState } from 'react';
import { setDailyTaskCompleted } from '../lib/commands';
import { daysUntil, formatShort } from '../lib/date';
import type { DailyTask } from '../lib/types';
import styles from './DailyTaskItem.module.css';

interface Props {
  task: DailyTask;
  showDate?: boolean;
  onEdit: (task: DailyTask) => void;
  onChanged: () => void | Promise<void>;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export default function DailyTaskItem({ task, showDate, onEdit, onChanged }: Props) {
  const [updating, setUpdating] = useState(false);
  const overdueDays = -daysUntil(task.task_date);

  const handleToggle = async () => {
    setUpdating(true);
    try {
      await setDailyTaskCompleted(task.id, !task.completed);
      await onChanged();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`${styles.item} ${task.completed ? styles.completed : ''}`}>
      <button
        type="button"
        className={styles.check}
        aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
        aria-pressed={task.completed}
        onClick={handleToggle}
        disabled={updating}
      >
        {task.completed ? '✓' : ''}
      </button>
      <div className={styles.content}>
        <div className={styles.title}>{task.title}</div>
        <div className={styles.meta}>
          {showDate && <span>{formatShort(task.task_date)}</span>}
          {!task.completed && overdueDays > 0 && (
            <span className={styles.overdue}>{overdueDays}d overdue</span>
          )}
          {task.suggested_minutes && (
            <span>suggested {formatMinutes(task.suggested_minutes)}</span>
          )}
        </div>
        {task.details && <div className={styles.details}>{task.details}</div>}
      </div>
      <button
        type="button"
        className={styles.edit}
        onClick={() => onEdit(task)}
        aria-label={`Edit ${task.title}`}
        title="Edit task"
      >
        ✎
      </button>
    </div>
  );
}
