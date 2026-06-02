import { create } from 'zustand';
import {
  getPomodoroSettings,
  recordPomodoro,
  updatePomodoroSettings as updatePomodoroSettingsCmd,
} from '../lib/commands';
import type {
  PomodoroKind,
  PomodoroSettings,
  Subject,
} from '../lib/types';

type Phase = 'idle' | 'work' | 'short_break' | 'long_break' | 'paused';

interface State {
  phase: Phase;
  prevPhase: Exclude<Phase, 'idle' | 'paused'> | null;
  cycleCount: number;
  startedAt: string | null;
  phaseStartedAt: string | null;
  secondsLeft: number;
  plannedMin: number;
  subject: Subject | null;
  topicLabel: string;
  settings: PomodoroSettings;
  tickHandle: number | null;

  loadSettings: () => Promise<void>;
  saveSettings: (s: PomodoroSettings) => Promise<void>;
  setSubject: (s: Subject | null) => void;
  setTopicLabel: (t: string) => void;

  start: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  stop: () => void;
  reset: () => void;
}

const DEFAULTS: PomodoroSettings = {
  work_min: 25,
  short_break_min: 5,
  long_break_min: 15,
  long_break_after: 4,
  sound_enabled: false,
};

let dingAudio: HTMLAudioElement | null = null;
function tryPlayDing() {
  try {
    if (!dingAudio) dingAudio = new Audio('/ding.mp3');
    dingAudio.currentTime = 0;
    void dingAudio.play();
  } catch {
    // ignore - sound is optional
  }
}

async function tryNotify(title: string, body: string) {
  try {
    const mod: any = await import('@tauri-apps/plugin-notification');
    let granted = await mod.isPermissionGranted();
    if (!granted) {
      const perm = await mod.requestPermission();
      granted = perm === 'granted';
    }
    if (granted) mod.sendNotification({ title, body });
  } catch {
    // notifications optional
  }
}

function pickNextPhase(
  finished: Exclude<Phase, 'idle' | 'paused'>,
  cycleCount: number,
  settings: PomodoroSettings,
): { next: Exclude<Phase, 'idle' | 'paused'>; mins: number; newCycle: number } {
  if (finished === 'work') {
    const newCycle = cycleCount + 1;
    if (newCycle % settings.long_break_after === 0) {
      return { next: 'long_break', mins: settings.long_break_min, newCycle };
    }
    return { next: 'short_break', mins: settings.short_break_min, newCycle };
  }
  // After any break, return to work; reset counter if we just finished a long break
  const newCycle = finished === 'long_break' ? 0 : cycleCount;
  return { next: 'work', mins: settings.work_min, newCycle };
}

export const usePomodoro = create<State>((set, get) => ({
  phase: 'idle',
  prevPhase: null,
  cycleCount: 0,
  startedAt: null,
  phaseStartedAt: null,
  secondsLeft: DEFAULTS.work_min * 60,
  plannedMin: DEFAULTS.work_min,
  subject: null,
  topicLabel: '',
  settings: DEFAULTS,
  tickHandle: null,

  loadSettings: async () => {
    try {
      const s = await getPomodoroSettings();
      set({ settings: s });
      if (get().phase === 'idle') {
        set({ secondsLeft: s.work_min * 60, plannedMin: s.work_min });
      }
    } catch {
      // ignore
    }
  },

  saveSettings: async (s) => {
    const next = await updatePomodoroSettingsCmd(s);
    set({ settings: next });
    if (get().phase === 'idle') {
      set({ secondsLeft: next.work_min * 60, plannedMin: next.work_min });
    }
  },

  setSubject: (s) => set({ subject: s }),
  setTopicLabel: (t) => set({ topicLabel: t }),

  start: () => {
    const { settings, tickHandle } = get();
    if (tickHandle != null) window.clearInterval(tickHandle);
    const now = new Date().toISOString();
    const handle = window.setInterval(() => tick(), 1000);
    set({
      phase: 'work',
      prevPhase: null,
      startedAt: now,
      phaseStartedAt: now,
      secondsLeft: settings.work_min * 60,
      plannedMin: settings.work_min,
      tickHandle: handle,
    });
  },

  pause: () => {
    const { phase } = get();
    if (phase === 'work' || phase === 'short_break' || phase === 'long_break') {
      set({ prevPhase: phase, phase: 'paused' });
    }
  },

  resume: () => {
    const { prevPhase } = get();
    if (prevPhase) set({ phase: prevPhase, prevPhase: null });
  },

  skip: () => {
    void endCurrentPhase({ interrupted: false, autoAdvance: true });
  },

  stop: () => {
    void endCurrentPhase({ interrupted: true, autoAdvance: false });
  },

  reset: () => {
    const { tickHandle, settings } = get();
    if (tickHandle != null) window.clearInterval(tickHandle);
    set({
      phase: 'idle',
      prevPhase: null,
      cycleCount: 0,
      startedAt: null,
      phaseStartedAt: null,
      secondsLeft: settings.work_min * 60,
      plannedMin: settings.work_min,
      tickHandle: null,
    });
  },
}));

function tick() {
  const state = usePomodoro.getState();
  if (state.phase === 'idle' || state.phase === 'paused') return;
  const next = state.secondsLeft - 1;
  if (next <= 0) {
    void endCurrentPhase({ interrupted: false, autoAdvance: true });
  } else {
    usePomodoro.setState({ secondsLeft: next });
  }
}

interface EndArgs {
  interrupted: boolean;
  autoAdvance: boolean;
}

async function endCurrentPhase({ interrupted, autoAdvance }: EndArgs) {
  const state = usePomodoro.getState();
  const active: Exclude<Phase, 'paused'> | null =
    state.phase === 'paused' ? state.prevPhase : state.phase;
  if (!active || active === 'idle') return;
  if (!state.phaseStartedAt) return;

  const startedAt = state.phaseStartedAt;
  const endedAt = new Date().toISOString();
  const elapsedSec =
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000;
  const actualMin = Math.max(0, elapsedSec / 60);
  const completed = !interrupted;
  const kind: PomodoroKind = active;

  try {
    await recordPomodoro({
      started_at: startedAt,
      ended_at: endedAt,
      duration_min: state.plannedMin,
      actual_min: actualMin,
      kind,
      completed,
      interrupted,
      subject: kind === 'work' ? state.subject : null,
      topic_label:
        kind === 'work' && state.topicLabel.trim()
          ? state.topicLabel.trim()
          : null,
      note: null,
    });
  } catch (e) {
    console.error('record_pomodoro failed', e);
  }

  // Notify on phase end (not on stop)
  if (!interrupted) {
    if (kind === 'work') {
      void tryNotify('Focus session complete', 'Take a short break.');
    } else {
      void tryNotify('Break over', 'Back to focus.');
    }
    if (state.settings.sound_enabled) tryPlayDing();
  }

  if (!autoAdvance) {
    if (state.tickHandle != null) window.clearInterval(state.tickHandle);
    usePomodoro.setState({
      phase: 'idle',
      prevPhase: null,
      phaseStartedAt: null,
      startedAt: null,
      secondsLeft: state.settings.work_min * 60,
      plannedMin: state.settings.work_min,
      tickHandle: null,
    });
    return;
  }

  const { next, mins, newCycle } = pickNextPhase(
    kind,
    state.cycleCount,
    state.settings,
  );
  usePomodoro.setState({
    phase: next,
    prevPhase: null,
    cycleCount: newCycle,
    phaseStartedAt: new Date().toISOString(),
    secondsLeft: mins * 60,
    plannedMin: mins,
  });
}
