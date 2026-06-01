import { invoke } from '@tauri-apps/api/core';
import type {
  CalendarDay,
  DailyLog,
  HeatmapDay,
  ReviewWithTopic,
  Streak,
  Subject,
  SubjectCoverage,
  TestDate,
  TestType,
  TestTypeAverage,
  Topic,
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

// --- Daily logs ---

export const upsertDailyLog = (input: {
  log_date: string;
  hours_studied?: number | null;
  note?: string | null;
}) => invoke<DailyLog>('upsert_daily_log', input);

export const getDailyLog = (date: string) =>
  invoke<DailyLog | null>('get_daily_log', { date });

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
