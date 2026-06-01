export const SUBJECTS = [
  'DS',
  'Algorithms',
  'OS',
  'DBMS',
  'CN',
  'TOC',
  'COA',
  'Engineering Maths',
  'Discrete Maths',
  'Aptitude',
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const TEST_TYPES = ['Topic', 'Subject', 'Mixed', 'Grand'] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const REVIEW_INTERVALS = [1, 4, 7, 14, 30] as const;

export const SUBJECT_COLORS: Record<Subject, string> = {
  DS: 'var(--subj-ds)',
  Algorithms: 'var(--subj-algo)',
  OS: 'var(--subj-os)',
  DBMS: 'var(--subj-dbms)',
  CN: 'var(--subj-cn)',
  TOC: 'var(--subj-toc)',
  COA: 'var(--subj-coa)',
  'Engineering Maths': 'var(--subj-eng-maths)',
  'Discrete Maths': 'var(--subj-disc-maths)',
  Aptitude: 'var(--subj-aptitude)',
};
