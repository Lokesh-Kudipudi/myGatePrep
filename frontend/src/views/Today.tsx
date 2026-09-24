import { useCallback, useEffect, useState } from 'react';
import DailyTaskForm from '../components/DailyTaskForm';
import DailyTaskItem from '../components/DailyTaskItem';
import { getFocusStats, getTodayDailyTasks } from '../lib/commands';
import { todayIso } from '../lib/date';
import type { DailyTask, FocusStats } from '../lib/types';
import { usePomodoro } from '../store/usePomodoro';
import { useStopwatch } from '../store/useStopwatch';
import styles from './Today.module.css';

export default function Today() {
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [focusStats, setFocusStats] = useState<FocusStats | null>(null);
  const pomoPhase = usePomodoro((state) => state.phase);
  const stopwatchPhase = useStopwatch((state) => state.phase);

  const refresh = useCallback(async () => {
    const [tasks, stats] = await Promise.all([
      getTodayDailyTasks(),
      getFocusStats(),
    ]);
    setDailyTasks(tasks);
    setFocusStats(stats);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus-sessions-changed', refresh);
    return () => window.removeEventListener('focus-sessions-changed', refresh);
  }, [refresh, pomoPhase, stopwatchPhase]);

  const today = todayIso();
  const overdueTasks = dailyTasks.filter(
    (task) => !task.completed && task.task_date < today,
  );
  const currentTasks = dailyTasks.filter(
    (task) => task.task_date === today || (task.completed && task.completed_at),
  );

  return (
    <div className={styles.page}>
      {focusStats && focusStats.sessions_today > 0 && (
        <div className={styles.logSummary}>
          <strong>{focusStats.sessions_today}</strong> focus session
          {focusStats.sessions_today === 1 ? '' : 's'} today ·{' '}
          <strong>{Math.round(focusStats.focus_min_today)}m</strong> focused
        </div>
      )}

      <section>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Daily tasks</h2>
            <div className={styles.sectionHint}>
              Suggested times are guidance only—track actual work with Stopwatch.
            </div>
          </div>
          <button className={styles.addTaskBtn} onClick={() => setShowTaskForm(true)}>
            + Add task
          </button>
        </div>

        {overdueTasks.length > 0 && (
          <div className={styles.taskGroup}>
            <div className={styles.overdueHeading}>
              Past incomplete · {overdueTasks.length}
            </div>
            {overdueTasks.map((task) => (
              <DailyTaskItem
                key={task.id}
                task={task}
                showDate
                onEdit={setEditingTask}
                onChanged={refresh}
              />
            ))}
          </div>
        )}

        <div className={styles.taskGroup}>
          <div className={styles.taskHeading}>Today</div>
          {currentTasks.length === 0 ? (
            <div className={styles.taskEmpty}>No tasks planned for today.</div>
          ) : (
            currentTasks.map((task) => (
              <DailyTaskItem
                key={task.id}
                task={task}
                showDate={task.task_date !== today}
                onEdit={setEditingTask}
                onChanged={refresh}
              />
            ))
          )}
        </div>
      </section>

      {showTaskForm && (
        <DailyTaskForm
          defaultDate={today}
          onClose={() => setShowTaskForm(false)}
          onSaved={refresh}
        />
      )}

      {editingTask && (
        <DailyTaskForm
          existing={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
