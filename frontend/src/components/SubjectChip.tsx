import { SUBJECT_COLORS } from '../lib/constants';
import type { Subject } from '../lib/types';
import styles from './SubjectChip.module.css';

export default function SubjectChip({ subject }: { subject: Subject }) {
  return (
    <span className={styles.chip} style={{ color: SUBJECT_COLORS[subject] }}>
      {subject}
    </span>
  );
}
