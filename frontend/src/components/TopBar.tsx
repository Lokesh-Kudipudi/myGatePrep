import { useEffect, useState } from 'react';
import { getTestDates } from '../lib/commands';
import { daysUntil } from '../lib/date';
import type { TestDate } from '../lib/types';
import styles from './TopBar.module.css';

const GATE_2027 = new Date('2027-02-08T00:00:00');

interface NextTest {
  label: string;
  days: number;
}

interface Countdown {
  d: number;
  h: number;
  m: number;
  s: number;
  past: boolean;
}

function computeCountdown(target: Date): Countdown {
  const diffMs = target.getTime() - Date.now();
  const past = diffMs <= 0;
  const total = Math.abs(diffMs) / 1000;
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return { d, h, m, s, past };
}

function pickNextTest(tests: TestDate[]): NextTest | null {
  const upcoming = tests
    .map((t) => ({ label: t.label, days: daysUntil(t.test_date) }))
    .filter((t) => t.days >= 0)
    .sort((a, b) => a.days - b.days);
  return upcoming[0] ?? null;
}

export default function TopBar() {
  const [countdown, setCountdown] = useState<Countdown>(() =>
    computeCountdown(GATE_2027),
  );
  const [next, setNext] = useState<NextTest | null>(null);

  useEffect(() => {
    const tick = () => setCountdown(computeCountdown(GATE_2027));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getTestDates().then((tests) => {
        if (!cancelled) setNext(pickNextTest(tests));
      });
    };
    load();
    window.addEventListener('test-dates-changed', load);
    return () => {
      cancelled = true;
      window.removeEventListener('test-dates-changed', load);
    };
  }, []);

  const isUrgent = next !== null && next.days <= 14;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <header className={styles.bar}>
      <div className={styles.title}>GATE Focus Tracker</div>

      <div className={styles.gateCountdown} title="GATE 2027 — Feb 8, 2027">
        <span className={styles.gateLabel}>GATE 2027</span>
        <span className={styles.gateValue}>
          {countdown.past ? (
            'underway'
          ) : (
            <>
              <span className={styles.unit}>
                <strong>{countdown.d}</strong>d
              </span>
              <span className={styles.unit}>
                <strong>{pad(countdown.h)}</strong>h
              </span>
              <span className={styles.unit}>
                <strong>{pad(countdown.m)}</strong>m
              </span>
              <span className={styles.unit}>
                <strong>{pad(countdown.s)}</strong>s
              </span>
            </>
          )}
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
