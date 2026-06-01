import { SUBJECT_COLORS } from '../lib/constants';
import type { Subject, TestType } from '../lib/types';
import styles from './TestTypeChip.module.css';

interface Props {
  type: TestType;
  subject?: Subject | null;
}

/**
 * Per design brief: Topic/Subject pills use the test's subject color when set;
 * Mixed = slate, Grand = amber.
 */
function colorFor(type: TestType, subject?: Subject | null): string {
  if ((type === 'Topic' || type === 'Subject') && subject) {
    return SUBJECT_COLORS[subject];
  }
  switch (type) {
    case 'Mixed': return 'var(--text-muted)';
    case 'Grand': return 'var(--amber)';
    case 'Topic':
    case 'Subject':
    default: return 'var(--text-muted)';
  }
}

export default function TestTypeChip({ type, subject }: Props) {
  return (
    <span className={styles.chip} style={{ color: colorFor(type, subject) }}>
      {type}
    </span>
  );
}
