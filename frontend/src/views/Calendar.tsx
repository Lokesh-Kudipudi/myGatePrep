import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import SubjectChip from '../components/SubjectChip';
import TestTypeChip from '../components/TestTypeChip';
import TestForm from '../components/TestForm';
import LogTopicSheet from '../components/LogTopicSheet';
import {
  deleteReview,
  deleteTopic,
  getCalendarMonth,
  getReviewsForDate,
  getTestDates,
  getTopics,
} from '../lib/commands';
import { todayIso } from '../lib/date';
import type {
  CalendarDay,
  ReviewWithTopic,
  TestDate,
  Topic,
} from '../lib/types';
import styles from './Calendar.module.css';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayDetail {
  date: string;
  topics: Topic[];
  reviews: ReviewWithTopic[];
  tests: TestDate[];
}

export default function CalendarView() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [days, setDays] = useState<Map<string, CalendarDay>>(new Map());
  const [allTests, setAllTests] = useState<TestDate[]>([]);
  const [selected, setSelected] = useState<DayDetail | null>(null);
  const [showAddTest, setShowAddTest] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  const today = todayIso();

  const refreshMonth = useCallback(async () => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const [monthData, tests] = await Promise.all([
      getCalendarMonth(year, month),
      getTestDates(),
    ]);
    const map = new Map<string, CalendarDay>();
    for (const d of monthData) map.set(d.date, d);
    setDays(map);
    setAllTests(tests);
  }, [cursor]);

  useEffect(() => {
    refreshMonth();
  }, [refreshMonth]);

  // Grid cells span from the Sunday before the 1st to the Saturday after the last day.
  const cells = useMemo(() => {
    const first = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const last = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: first, end: last });
  }, [cursor]);

  const openDay = async (iso: string) => {
    const [topics, reviews] = await Promise.all([
      getTopics(iso),
      getReviewsForDate(iso),
    ]);
    const tests = allTests.filter((t) => t.test_date === iso);
    setSelected({ date: iso, topics, reviews, tests });
  };

  const handleDeleteTopic = async (id: number) => {
    if (!selected) return;
    await deleteTopic(id);
    await Promise.all([openDay(selected.date), refreshMonth()]);
  };

  const handleDeleteReview = async (id: number) => {
    if (!selected) return;
    await deleteReview(id);
    await Promise.all([openDay(selected.date), refreshMonth()]);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.monthLabel}>{format(cursor, 'MMMM yyyy')}</span>
        <div className={styles.navBtns}>
          <button onClick={() => setCursor((c) => addMonths(c, -1))}>‹ Prev</button>
          <button onClick={() => setCursor(startOfMonth(new Date()))}>Today</button>
          <button onClick={() => setCursor((c) => addMonths(c, 1))}>Next ›</button>
        </div>
      </div>

      <div className={styles.grid}>
        {DOW.map((d) => (
          <div key={d} className={styles.dowHeader}>{d}</div>
        ))}
        {cells.map((d) => {
          const iso = format(d, 'yyyy-MM-dd');
          const data = days.get(iso);
          const outside = !isSameMonth(d, cursor);
          const isToday = iso === today;
          const reviewsDue = data?.reviews_due ?? 0;
          const reviewsDone = data?.reviews_done ?? 0;
          const overdue = !outside && iso < today && reviewsDue > 0;
          const complete = reviewsDue === 0 && reviewsDone > 0;
          const tests = data?.test_dates ?? [];
          return (
            <div
              key={iso}
              className={[
                styles.cell,
                outside ? styles.outside : '',
                isToday ? styles.today : '',
                complete ? styles.complete : '',
              ].filter(Boolean).join(' ')}
              onClick={() => !outside && openDay(iso)}
              title={
                tests.length > 0
                  ? tests.map((t) => t.label).join(', ')
                  : undefined
              }
            >
              <span className={styles.dayNum}>{format(d, 'd')}</span>
              <span className={styles.markers}>
                {reviewsDue > 0 && (
                  <span
                    className={`${styles.reviewDot} ${overdue ? styles.overdueDot : ''}`}
                  />
                )}
                {tests.length > 0 && <span className={styles.testDiamond} />}
              </span>
            </div>
          );
        })}
      </div>

      {selected && (
        <>
          <div className={styles.panelScrim} onClick={() => setSelected(null)} />
          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelDate}>
                {format(parseISO(selected.date), 'EEE, MMM d')}
              </span>
              <button onClick={() => setSelected(null)}>close</button>
            </div>

            <section className={styles.panelSection}>
              <h3>Topics logged</h3>
              {selected.topics.length === 0 ? (
                <div className={styles.panelEmpty}>nothing logged</div>
              ) : (
                selected.topics.map((t) => (
                  <div key={t.id} className={styles.panelRow}>
                    <SubjectChip subject={t.subject} />
                    <span className={styles.panelRowName}>{t.topic_name}</span>
                    <button
                      className={styles.panelRowEdit}
                      title="Edit topic"
                      aria-label={`Edit ${t.topic_name}`}
                      onClick={() => setEditingTopic(t)}
                    >
                      ✎
                    </button>
                    <button
                      className={styles.panelRowDelete}
                      title="Delete topic (cascades to all 5 reviews)"
                      onClick={() => handleDeleteTopic(t.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </section>

            <section className={styles.panelSection}>
              <h3>Reviews due</h3>
              {selected.reviews.length === 0 ? (
                <div className={styles.panelEmpty}>nothing due</div>
              ) : (
                selected.reviews.map((r) => (
                  <div key={r.id} className={styles.panelRow}>
                    <SubjectChip subject={r.subject} />
                    <span className={styles.panelRowName}>
                      {r.topic_name}
                      {r.completed && ' ✓'}
                    </span>
                    {!r.completed && (
                      <button
                        className={styles.panelRowDelete}
                        title="Cancel this review"
                        onClick={() => handleDeleteReview(r.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </section>

            <section className={styles.panelSection}>
              <h3>Tests</h3>
              {selected.tests.length === 0 ? (
                <div className={styles.panelEmpty}>none scheduled</div>
              ) : (
                selected.tests.map((t) => (
                  <div key={t.id} className={styles.panelRow}>
                    <TestTypeChip type={t.test_type} subject={t.subject} />
                    <span className={styles.panelRowName}>{t.label}</span>
                  </div>
                ))
              )}
              <button
                style={{ marginTop: 'var(--gap-2)', fontSize: 12 }}
                onClick={() => {
                  setShowAddTest(selected.date);
                  setSelected(null);
                }}
              >
                + Add test on this day
              </button>
            </section>
          </aside>
        </>
      )}

      {showAddTest && (
        <TestForm
          defaultDate={showAddTest}
          onClose={() => setShowAddTest(null)}
          onSaved={refreshMonth}
        />
      )}

      {editingTopic && (
        <LogTopicSheet
          existing={editingTopic}
          onClose={() => setEditingTopic(null)}
          onLogged={async () => {
            await Promise.all([
              openDay(editingTopic.logged_date),
              refreshMonth(),
            ]);
          }}
        />
      )}
    </div>
  );
}
