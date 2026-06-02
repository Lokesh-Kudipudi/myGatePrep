import { useCallback, useEffect, useMemo, useState } from 'react';
import LogResultForm from '../components/LogResultForm';
import TestForm from '../components/TestForm';
import TestTypeChip from '../components/TestTypeChip';
import { getTestDates, getTestTypeAverages } from '../lib/commands';
import { TEST_TYPES } from '../lib/constants';
import { daysUntil, formatShort } from '../lib/date';
import type { TestDate, TestType, TestTypeAverage } from '../lib/types';
import styles from './TestDates.module.css';

function marksClass(score: number | null): string {
  if (score == null) return '';
  if (score >= 60) return styles.good;
  if (score >= 40) return styles.mid;
  return styles.bad;
}

function isLogged(t: TestDate) {
  return t.attained_marks != null && t.total_marks != null;
}

export default function TestDates() {
  const [tests, setTests] = useState<TestDate[]>([]);
  const [averages, setAverages] = useState<TestTypeAverage[]>([]);
  const [editing, setEditing] = useState<TestDate | null>(null);
  const [logging, setLogging] = useState<TestDate | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const [t, a] = await Promise.all([getTestDates(), getTestTypeAverages()]);
    setTests(t);
    setAverages(a);
    window.dispatchEvent(new Event('test-dates-changed'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const averagesByType = useMemo(() => {
    const map = new Map<TestType, TestTypeAverage>();
    for (const a of averages) map.set(a.test_type, a);
    return map;
  }, [averages]);

  const { upcoming, past } = useMemo(() => {
    const up: TestDate[] = [];
    const pa: TestDate[] = [];
    for (const t of tests) {
      if (daysUntil(t.test_date) >= 0) up.push(t);
      else pa.push(t);
    }
    pa.sort((a, b) => b.test_date.localeCompare(a.test_date));
    return { upcoming: up, past: pa };
  }, [tests]);

  const renderRow = (t: TestDate) => {
    const days = daysUntil(t.test_date);
    const past = days < 0;
    const loggable = days <= 0; // today counts as loggable
    const logged = isLogged(t);
    const score =
      logged && t.total_marks ? (t.attained_marks! / t.total_marks!) * 100 : null;
    return (
      <div key={t.id} className={`${styles.row} ${past ? styles.past : ''}`}>
        <TestTypeChip type={t.test_type} subject={t.subject} />
        <span className={styles.label}>
          {t.label}
          {t.subject && t.test_type !== 'Mixed' && t.test_type !== 'Grand' && (
            <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>
              · {t.subject}
            </span>
          )}
        </span>
        <span className={styles.meta}>
          {formatShort(t.test_date)}
          {' · '}
          {days === 0
            ? 'today'
            : past
            ? `${-days}d ago`
            : `in ${days}d`}
        </span>
        {logged ? (
          <span className={`${styles.marks} ${marksClass(score)}`}>
            {t.attained_marks} / {t.total_marks}
            {score != null && ` (${score.toFixed(0)}%)`}
          </span>
        ) : loggable ? (
          <button
            className={styles.rowBtn}
            onClick={() => setLogging(t)}
            style={{ borderColor: 'var(--amber-dim)', color: 'var(--amber)' }}
          >
            Log result
          </button>
        ) : (
          <span />
        )}
        <button className={styles.rowBtn} onClick={() => setEditing(t)}>
          Edit
        </button>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Test Dates</h1>
        <button className={styles.addBtn} onClick={() => setCreating(true)}>
          + Add test
        </button>
      </div>

      <div className={styles.summary}>
        {TEST_TYPES.map((type) => {
          const avg = averagesByType.get(type);
          return (
            <div key={type} className={styles.summaryCard}>
              <span className={styles.summaryType}>{type}</span>
              <span className={styles.summaryNumber}>
                {avg ? `${avg.avg_score_percent.toFixed(0)}%` : '—'}
              </span>
              <span className={styles.summaryMeta}>
                {avg
                  ? `${avg.tests_taken} taken${
                      avg.avg_accuracy != null
                        ? ` · ${avg.avg_accuracy.toFixed(0)}% acc`
                        : ''
                    }`
                  : 'no results'}
              </span>
            </div>
          );
        })}
      </div>

      {upcoming.length > 0 && (
        <>
          <div className={styles.section}>Upcoming</div>
          <div className={styles.list}>{upcoming.map(renderRow)}</div>
        </>
      )}

      {past.length > 0 && (
        <>
          <div className={styles.section}>Past</div>
          <div className={styles.list}>{past.map(renderRow)}</div>
        </>
      )}

      {tests.length === 0 && (
        <div className={styles.empty}>
          No tests yet. Add one to start tracking mock scores and trends.
        </div>
      )}

      {creating && (
        <TestForm onClose={() => setCreating(false)} onSaved={refresh} />
      )}
      {editing && (
        <TestForm
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {logging && (
        <LogResultForm
          test={logging}
          onClose={() => setLogging(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
