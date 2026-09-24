import type { Subject, TestType } from './constants';

export type { Subject, TestType };

export interface TestDate {
  id: number;
  label: string;
  test_date: string;
  test_type: TestType;
  subject: Subject | null;
  total_questions: number | null;
  attempted: number | null;
  correct: number | null;
  incorrect: number | null;
  attained_marks: number | null;
  total_marks: number | null;
  notes: string | null;
}

export interface HeatmapDay {
  date: string;
  hours: number;
  task_count: number;
}

export interface Streak {
  current: number;
  longest: number;
}

export interface CalendarTestDate {
  label: string;
  test_type: TestType;
}

export interface CalendarDay {
  date: string;
  tasks_pending: number;
  tasks_done: number;
  test_dates: CalendarTestDate[];
}

export interface DailyTask {
  id: number;
  task_date: string;
  title: string;
  details: string | null;
  suggested_minutes: number | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressSummary {
  hours_this_week: number;
  tasks_completed_this_week: number;
  recently_active_subjects: Subject[];
  sessions_this_week: number;
  focus_min_this_week: number;
  hours_all_time: number;
  tasks_completed_all_time: number;
  sessions_all_time: number;
  focus_min_all_time: number;
}

export type PomodoroKind = 'work' | 'short_break' | 'long_break';

export interface PomodoroSession {
  id: number;
  started_at: string;
  ended_at: string;
  duration_min: number;
  actual_min: number;
  kind: PomodoroKind;
  completed: boolean;
  interrupted: boolean;
  subject: Subject | null;
  topic_label: string | null;
  note: string | null;
}

export interface StopwatchSession {
  id: number;
  started_at: string;
  ended_at: string;
  actual_min: number;
  subject: Subject | null;
  topic_label: string | null;
  note: string | null;
}

export interface PomodoroSettings {
  work_min: number;
  short_break_min: number;
  long_break_min: number;
  long_break_after: number;
  sound_enabled: boolean;
}

export interface FocusStats {
  sessions_today: number;
  focus_min_today: number;
  sessions_this_week: number;
  focus_min_this_week: number;
  sessions_total: number;
  focus_min_total: number;
}

export interface TestTypeAverage {
  test_type: TestType;
  avg_score_percent: number;
  avg_accuracy: number | null;
  tests_taken: number;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}
