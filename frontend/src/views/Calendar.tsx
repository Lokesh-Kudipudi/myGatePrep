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
import DailyTaskForm from '../components/DailyTaskForm';
import DailyTaskItem from '../components/DailyTaskItem';
import TestTypeChip from '../components/TestTypeChip';
import TestForm from '../components/TestForm';
import {
  getCalendarMonth,
  getDailyTasksForDate,
  getTestDates,
} from '../lib/commands';
import { todayIso } from '../lib/date';
import type {
  CalendarDay,
  DailyTask,
  TestDate,
} from '../lib/types';
import styles from './Calendar.module.css';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayDetail {
  date: string;
  tasks: DailyTask[];
  tests: TestDate[];
}

export default function CalendarView() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [days, setDays] = useState<Map<string, CalendarDay>>(new Map());
  const [allTests, setAllTests] = useState<TestDate[]>([]);
  const [selected, setSelected] = useState<DayDetail | null>(null);
  const [showAddTest, setShowAddTest] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);

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
    const tasks = await getDailyTasksForDate(iso);
    const tests = allTests.filter((t) => t.test_date === iso);
    setSelected({ date: iso, tasks, tests });
  };

  const refreshSelectedDay = async () => {
    if (!selected) {
      await refreshMonth();
      return;
    }
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
          const tasksPending = data?.tasks_pending ?? 0;
          const tasksDone = data?.tasks_done ?? 0;
          const overdue = !outside && iso < today && tasksPending > 0;
          const complete = tasksPending === 0 && tasksDone > 0;
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
              {tasksPending + tasksDone > 0 && (
                <span
                  className={`${styles.taskCount} ${overdue ? styles.overdueTaskCount : ''}`}
                  title={`${tasksPending} task${tasksPending === 1 ? '' : 's'} remaining`}
                >
                  {tasksDone}/{tasksPending + tasksDone}
                </span>
              )}
              <span className={styles.markers}>
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
              <div className={styles.panelSectionHeader}>
                <h3>Daily tasks</h3>
                <button
                  className={styles.panelAdd}
                  onClick={() => setShowAddTask(selected.date)}
                >
                  + Add
                </button>
              </div>
              {selected.tasks.length === 0 ? (
                <div className={styles.panelEmpty}>nothing planned</div>
              ) : (
                <div className={styles.taskList}>
                  {selected.tasks.map((task) => (
                    <DailyTaskItem
                      key={task.id}
                      task={task}
                      onEdit={setEditingTask}
                      onChanged={refreshSelectedDay}
                    />
                  ))}
                </div>
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

      {showAddTask && (
        <DailyTaskForm
          defaultDate={showAddTask}
          onClose={() => setShowAddTask(null)}
          onSaved={refreshSelectedDay}
        />
      )}

      {editingTask && (
        <DailyTaskForm
          existing={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={refreshSelectedDay}
        />
      )}

    </div>
  );
}
