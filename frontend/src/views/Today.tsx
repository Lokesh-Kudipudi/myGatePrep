import { useCallback, useEffect, useMemo, useState } from 'react';
import LogTopicSheet from '../components/LogTopicSheet';
import RevisionItem from '../components/RevisionItem';
import SubjectChip from '../components/SubjectChip';
import {
  deleteTopic,
  getFocusStats,
  getTodayReviews,
  getTopics,
} from '../lib/commands';
import { todayIso } from '../lib/date';
import type {
  FocusStats,
  ReviewWithTopic,
  Subject,
  Topic,
} from '../lib/types';
import { usePomodoro } from '../store/usePomodoro';
import { useStopwatch } from '../store/useStopwatch';
import styles from './Today.module.css';

export default function Today() {
  const [reviews, setReviews] = useState<ReviewWithTopic[]>([]);
  const [todayTopics, setTodayTopics] = useState<Topic[]>([]);
  const [hasEverLogged, setHasEverLogged] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [focusStats, setFocusStats] = useState<FocusStats | null>(null);
  const pomoPhase = usePomodoro((s) => s.phase);
  const stopwatchPhase = useStopwatch((s) => s.phase);

  const refresh = useCallback(async () => {
    const [r, allTopics, todays, ps] = await Promise.all([
      getTodayReviews(),
      getTopics(),
      getTopics(todayIso()),
      getFocusStats(),
    ]);
    setReviews(r);
    setHasEverLogged(allTopics.length > 0);
    setTodayTopics(todays);
    setFocusStats(ps);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus-sessions-changed', refresh);
    return () => window.removeEventListener('focus-sessions-changed', refresh);
  }, [refresh, pomoPhase, stopwatchPhase]);

  const grouped = useMemo(() => {
    const map = new Map<Subject, ReviewWithTopic[]>();
    for (const r of reviews) {
      if (!map.has(r.subject)) map.set(r.subject, []);
      map.get(r.subject)!.push(r);
    }
    return Array.from(map.entries());
  }, [reviews]);

  const queueEmpty = reviews.length === 0;

  return (
    <div className={styles.page}>
      {focusStats && focusStats.sessions_today > 0 && (
        <div className={styles.logSummary}>
          <strong>{focusStats.sessions_today}</strong> focus session
          {focusStats.sessions_today === 1 ? '' : 's'} today ·{' '}
          <strong>{Math.round(focusStats.focus_min_today)}m</strong> focused
        </div>
      )}

      {todayTopics.length > 0 && (
        <div>
          <h2 className={styles.sectionTitle}>Logged today</h2>
          <ul className={styles.topicList}>
            {todayTopics.map((t) => (
              <li key={t.id} className={styles.topicItem}>
                <SubjectChip subject={t.subject} />
                <span className={styles.topicName}>{t.topic_name}</span>
                <button
                  className={styles.topicEdit}
                  title="Edit topic"
                  aria-label={`Edit ${t.topic_name}`}
                  onClick={() => setEditingTopic(t)}
                >
                  ✎
                </button>
                <button
                  className={styles.topicDelete}
                  title="Delete topic (cascades to all 5 reviews)"
                  onClick={async () => {
                    await deleteTopic(t.id);
                    refresh();
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className={styles.sectionTitle}>Today's revisions</h2>

      {queueEmpty ? (
        <div className={styles.empty}>
          {hasEverLogged
            ? 'All clear for today. Rest or go deeper.'
            : 'No topics yet — click + to log your first one.'}
        </div>
      ) : (
        grouped.map(([subject, items]) => (
          <div key={subject} className={styles.subjectGroup}>
            <div className={styles.subjectHeading}>{subject}</div>
            {items.map((r) => (
              <RevisionItem key={r.id} review={r} onChanged={refresh} />
            ))}
          </div>
        ))
      )}

      <button
        className={styles.fab}
        onClick={() => setShowSheet(true)}
        title="Log a new topic"
      >
        +
      </button>

      {showSheet && (
        <LogTopicSheet
          onClose={() => setShowSheet(false)}
          onLogged={refresh}
        />
      )}

      {editingTopic && (
        <LogTopicSheet
          existing={editingTopic}
          onClose={() => setEditingTopic(null)}
          onLogged={refresh}
        />
      )}
    </div>
  );
}
