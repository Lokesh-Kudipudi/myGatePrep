import { useEffect, useState } from 'react';
import { getStreak, getTestDates } from '../lib/commands';
import { daysUntil } from '../lib/date';
import type { Streak, TestDate } from '../lib/types';
import styles from './TopBar.module.css';

interface NextTest {
  label: string;
  days: number;
}

function pickNextTest(tests: TestDate[]): NextTest | null {
  const upcoming = tests
    .map((t) => ({ label: t.label, days: daysUntil(t.test_date) }))
    .filter((t) => t.days >= 0)
    .sort((a, b) => a.days - b.days);
  return upcoming[0] ?? null;
}

export default function TopBar() {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [next, setNext] = useState<NextTest | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStreak(), getTestDates()]).then(([s, tests]) => {
      if (cancelled) return;
      setStreak(s);
      setNext(pickNextTest(tests));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = streak?.current ?? 0;
  const isUrgent = next !== null && next.days <= 14;

  return (
    <header className={styles.bar}>
      <div className={styles.title}>GATE Focus Tracker</div>

      <div className={`${styles.streak} ${current === 0 ? styles.dim : ''}`}>
        <span>🔥</span>
        <span>
          {current} {current === 1 ? 'day' : 'days'}
        </span>
      </div>

      {next ? (
        <div className={`${styles.countdown} ${isUrgent ? styles.urgent : ''}`}>
          <span className={styles.label}>{next.label}</span>
          <span className={styles.value}>
            {next.days === 0
              ? 'today'
              : `${next.days} ${next.days === 1 ? 'day' : 'days'}`}
          </span>
        </div>
      ) : (
        <div className={`${styles.countdown} ${styles.empty}`}>no test set</div>
      )}
    </header>
  );
}
