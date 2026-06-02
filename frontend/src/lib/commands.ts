import { invoke } from '@tauri-apps/api/core';
import type {
  CalendarDay,
  HeatmapDay,
  ProgressSummary,
  ReviewWithTopic,
  Streak,
  Subject,
  SubjectCoverage,
  TestDate,
  TestType,
  TestTypeAverage,
  Topic,
  PomodoroSession,
  PomodoroKind,
  PomodoroSettings,
  PomodoroStats,
} from './types';

// --- Topics ---

export const createTopic = (input: {
  subject: Subject;
  topic_name: string;
  note?: string | null;
  difficulty: 1 | 2 | 3;
  logged_date: string;
}) => invoke<Topic>('create_topic', input);

export const getTopics = (date?: string) =>
  invoke<Topic[]>('get_topics', { date: date ?? null });

export const deleteTopic = (id: number) =>
  invoke<void>('delete_topic', { id });

// --- Reviews ---

export const getTodayReviews = () =>
  invoke<ReviewWithTopic[]>('get_today_reviews');

export const getReviewsForDate = (date: string) =>
  invoke<ReviewWithTopic[]>('get_reviews_for_date', { date });

export const completeReview = (id: number) =>
  invoke<void>('complete_review', { id });

export const deleteReview = (id: number) =>
  invoke<void>('delete_review', { id });

// --- Test dates & marks ---

export const getTestDates = () => invoke<TestDate[]>('get_test_dates');

export const createTestDate = (input: {
  label: string;
  test_date: string;
  test_type: TestType;
  subject?: Subject | null;
  notes?: string | null;
}) => invoke<TestDate>('create_test_date', input);

export const updateTestDate = (input: {
  id: number;
  label: string;
  test_date: string;
  test_type: TestType;
  subject?: Subject | null;
  notes?: string | null;
}) => invoke<TestDate>('update_test_date', input);

export const logTestMarks = (input: {
  id: number;
  total_questions?: number | null;
  attempted?: number | null;
  correct?: number | null;
  incorrect?: number | null;
  attained_marks: number;
  total_marks: number;
  notes?: string | null;
}) => invoke<TestDate>('log_test_marks', input);

export const deleteTestDate = (id: number) =>
  invoke<void>('delete_test_date', { id });

// --- Aggregates ---

export const getHeatmapData = (days: number) =>
  invoke<HeatmapDay[]>('get_heatmap_data', { days });

export const getSubjectCoverage = () =>
  invoke<SubjectCoverage[]>('get_subject_coverage');

export const getStreak = () => invoke<Streak>('get_streak');

export const getCalendarMonth = (year: number, month: number) =>
  invoke<CalendarDay[]>('get_calendar_month', { year, month });

export const getTestTypeAverages = () =>
  invoke<TestTypeAverage[]>('get_test_type_averages');

export const getProgressSummary = () =>
  invoke<ProgressSummary>('get_progress_summary');

// --- Pomodoros ---

export const recordPomodoro = (input: {
  started_at: string;
  ended_at: string;
  duration_min: number;
  actual_min: number;
  kind: PomodoroKind;
  completed: boolean;
  interrupted: boolean;
  subject?: Subject | null;
  topic_label?: string | null;
  note?: string | null;
}) => invoke<PomodoroSession>('record_pomodoro', input);

export const getPomodorosForDate = (date: string) =>
  invoke<PomodoroSession[]>('get_pomodoros_for_date', { date });

export const getPomodoroStats = () =>
  invoke<PomodoroStats>('get_pomodoro_stats');

export const getPomodoroSettings = () =>
  invoke<PomodoroSettings>('get_pomodoro_settings');

export const updatePomodoroSettings = (input: PomodoroSettings) =>
  invoke<PomodoroSettings>('update_pomodoro_settings', { ...input });
