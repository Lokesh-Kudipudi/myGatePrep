import { useEffect, useMemo, useState } from 'react';
import Heatmap from '../components/Heatmap';
import {
  getHeatmapData,
  getProgressSummary,
  getStreak,
} from '../lib/commands';
import { SUBJECTS } from '../lib/constants';
import type { HeatmapDay, ProgressSummary, Streak, Subject } from '../lib/types';
import styles from './Progress.module.css';

export default function Progress() {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStreak(), getHeatmapData(365), getProgressSummary()]).then(
      ([s, h, sum]) => {
        if (cancelled) return;
        setStreak(s);
        setHeatmap(h);
        setSummary(sum);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const neglected = useMemo<Subject[]>(() => {
    if (!summary) return [];
    const active = new Set(summary.recently_active_subjects);
    return SUBJECTS.filter((s) => !active.has(s));
  }, [summary]);

  return (
    <div className={styles.page}>
      <h1>Progress</h1>

      <div className={styles.hero}>
        <div className={styles.streakBlock}>
          <span className={styles.streakNumber}>{streak?.current ?? 0}</span>
          <span className={styles.streakLabel}>day streak</span>
          {streak && (
            <span className={styles.streakLongest}>
              longest: {streak.longest} day{streak.longest === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Hours this week</span>
            <span className={styles.statValue}>
              {summary ? summary.hours_this_week.toFixed(1) : '—'}
            </span>
            <span className={styles.statSub}>last 7 days</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Topics logged</span>
            <span className={styles.statValue}>
              {summary ? summary.topics_this_week : '—'}
            </span>
            <span className={styles.statSub}>last 7 days</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Reviews completed</span>
            <span className={styles.statValue}>
              {summary ? summary.reviews_done_this_week : '—'}
            </span>
            <span className={styles.statSub}>last 7 days</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Last 12 months</span>
        <Heatmap data={heatmap} />
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Subjects not touched in 7+ days</span>
        {neglected.length === 0 ? (
          <span className={styles.allCaughtUp}>
            All subjects touched in the last week.
          </span>
        ) : (
          <div className={styles.neglectedList}>
            {neglected.map((s) => (
              <span key={s} className={styles.neglectedChip}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
