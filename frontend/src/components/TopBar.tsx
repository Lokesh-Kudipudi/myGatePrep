import { useEffect, useState } from 'react';
import { getTestDates } from '../lib/commands';
import { getDailyQuote } from '../lib/dailyQuote';
import { daysUntil } from '../lib/date';
import type { TestDate } from '../lib/types';
import Modal from './Modal';
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
  const [showQuote, setShowQuote] = useState(false);

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
  const quote = getDailyQuote();

  return (
    <header className={styles.bar}>
      <div className={styles.title}>GATE Focus Tracker</div>

      <div className={styles.gateArea}>
        <button
          type="button"
          className={styles.quoteButton}
          onClick={() => setShowQuote(true)}
          title={quote.reference}
        >
          <span aria-hidden="true">✦</span>
          Daily verse
        </button>

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

      {showQuote && (
        <Modal title="Verse for today" onClose={() => setShowQuote(false)} width={620}>
          <article className={styles.quoteContent}>
            <div className={styles.quoteReference}>{quote.reference}</div>
            <p className={styles.sanskrit} lang="sa">
              {quote.sanskrit}
            </p>
            <div className={styles.quoteDivider} />
            <p className={styles.translation}>{quote.direct_translation}</p>
            <p className={styles.meaning}>{quote.meaning}</p>
          </article>
        </Modal>
      )}
    </header>
  );
}
