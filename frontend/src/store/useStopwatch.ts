import { create } from 'zustand';
import { recordStopwatch } from '../lib/commands';
import type { Subject } from '../lib/types';

type StopwatchPhase = 'idle' | 'running' | 'paused';

interface State {
  phase: StopwatchPhase;
  startedAt: string | null;
  runStartedAt: number | null;
  elapsedBeforeRun: number;
  elapsedSeconds: number;
  subject: Subject | null;
  topicLabel: string;
  tickHandle: number | null;

  setSubject: (subject: Subject | null) => void;
  setTopicLabel: (topic: string) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  finish: () => Promise<void>;
  reset: () => void;
}

function elapsedNow(state: State) {
  if (state.phase !== 'running' || state.runStartedAt == null) {
    return state.elapsedBeforeRun;
  }
  return state.elapsedBeforeRun + (Date.now() - state.runStartedAt) / 1000;
}

function startTicker() {
  return window.setInterval(() => {
    const state = useStopwatch.getState();
    useStopwatch.setState({ elapsedSeconds: Math.floor(elapsedNow(state)) });
  }, 250);
}

const idleState = {
  phase: 'idle' as const,
  startedAt: null,
  runStartedAt: null,
  elapsedBeforeRun: 0,
  elapsedSeconds: 0,
  tickHandle: null,
};

export const useStopwatch = create<State>((set, get) => ({
  ...idleState,
  subject: null,
  topicLabel: '',

  setSubject: (subject) => set({ subject }),
  setTopicLabel: (topicLabel) => set({ topicLabel }),

  start: () => {
    const now = Date.now();
    set({
      phase: 'running',
      startedAt: new Date(now).toISOString(),
      runStartedAt: now,
      elapsedBeforeRun: 0,
      elapsedSeconds: 0,
      tickHandle: startTicker(),
    });
  },

  pause: () => {
    const state = get();
    if (state.phase !== 'running') return;
    const elapsed = elapsedNow(state);
    if (state.tickHandle != null) window.clearInterval(state.tickHandle);
    set({
      phase: 'paused',
      runStartedAt: null,
      elapsedBeforeRun: elapsed,
      elapsedSeconds: Math.floor(elapsed),
      tickHandle: null,
    });
  },

  resume: () => {
    if (get().phase !== 'paused') return;
    set({
      phase: 'running',
      runStartedAt: Date.now(),
      tickHandle: startTicker(),
    });
  },

  finish: async () => {
    const state = get();
    if (state.phase === 'idle' || !state.startedAt) return;
    const elapsed = elapsedNow(state);
    if (state.tickHandle != null) window.clearInterval(state.tickHandle);
    set(idleState);

    if (elapsed <= 0) return;
    await recordStopwatch({
      started_at: state.startedAt,
      ended_at: new Date().toISOString(),
      actual_min: elapsed / 60,
      subject: state.subject,
      topic_label: state.topicLabel.trim() || null,
      note: null,
    });
    window.dispatchEvent(new Event('focus-sessions-changed'));
  },

  reset: () => {
    const state = get();
    if (state.tickHandle != null) window.clearInterval(state.tickHandle);
    set(idleState);
  },
}));
