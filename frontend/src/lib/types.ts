import type { Subject, TestType } from './constants';

export type { Subject, TestType };

export interface Topic {
  id: number;
  subject: Subject;
  topic_name: string;
  note: string | null;
  difficulty: 1 | 2 | 3;
  logged_date: string;
  created_at: string;
}

export interface ReviewWithTopic {
  id: number;
  topic_id: number;
  due_date: string;
  interval_day: 1 | 4 | 7 | 14 | 30;
  completed: boolean;
  completed_at: string | null;
  subject: Subject;
  topic_name: string;
  difficulty: 1 | 2 | 3;
  logged_date: string;
}

export interface DailyLog {
  id: number;
  log_date: string;
  hours_studied: number | null;
  note: string | null;
}

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
  topic_count: number;
}

export interface SubjectCoverage {
  subject: Subject;
  topic_count: number;
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
  has_log: boolean;
  reviews_due: number;
  reviews_done: number;
  test_dates: CalendarTestDate[];
}

export interface ProgressSummary {
  hours_this_week: number;
  topics_this_week: number;
  reviews_done_this_week: number;
  recently_active_subjects: Subject[];
}

export interface TestTypeAverage {
  test_type: TestType;
  avg_score_percent: number;
  avg_accuracy: number | null;
  tests_taken: number;
}
