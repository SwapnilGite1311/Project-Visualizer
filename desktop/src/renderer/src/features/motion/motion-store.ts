import { create } from 'zustand';
import { useAppStore } from '../../core/store';
import { FrameIndex, type Frame } from './frames';
import {
  findPython,
  getSteps,
  loadTrace,
  type PythonInfo,
  type RecordResult,
  recordRun,
  type Step,
  type TraceSummary,
  unloadTrace,
} from './motion-api';

export const STEP_MS = 350;
export const CHUNK = 5000;
export const SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;

type Status = 'idle' | 'recording' | 'loading' | 'ready' | 'error';
type Mode = 'map' | 'inside';

interface MotionState {
  status: Status;
  error: string | null;
  python: PythonInfo | null | undefined;
  command: string;
  run: RecordResult | null;
  traceId: string | null;
  summary: TraceSummary | null;
  steps: Step[];
  total: number;
  index: number;
  playing: boolean;
  speed: number;
  mode: Mode;
  source: 'trace' | 'walkthrough';
  checkPython(): Promise<void>;
  setCommand(command: string): void;
  record(): Promise<void>;
  load(path: string): Promise<void>;
  loadWalkthrough(steps: Step[]): void;
  play(): void;
  pause(): void;
  stepForward(): void;
  stepBack(): void;
  seek(i: number): void;
  setSpeed(speed: number): void;
  setMode(mode: Mode): void;
  jumpToException(): void;
  close(): void;
}

const frames = new FrameIndex();
let timer: ReturnType<typeof setInterval> | undefined;
// Incremented whenever a load starts or the player closes, so late chunks of an old load are ignored.
let generation = 0;

const idle = {
  status: 'idle' as Status,
  error: null,
  run: null,
  traceId: null,
  summary: null,
  steps: [] as Step[],
  total: 0,
  index: 0,
  playing: false,
  source: 'trace' as const,
};

// In map mode only calls, returns and exceptions move the picture, so line steps are skipped.
function isStop(step: Step, mode: Mode): boolean {
  return mode === 'inside' || step.kind !== 'line';
}

export const useMotionStore = create<MotionState>()((set, get) => {
  const move = (direction: 1 | -1): boolean => {
    const { steps, index, mode } = get();
    for (let i = index + direction; i >= 0 && i < steps.length; i += direction) {
      if (isStop(steps[i], mode)) {
        set({ index: i });
        return true;
      }
    }
    return false;
  };
  const stopTimer = () => {
    clearInterval(timer);
    timer = undefined;
  };
  const startTimer = () => {
    stopTimer();
    timer = setInterval(() => {
      if (!move(1)) get().pause();
    }, STEP_MS / get().speed);
  };
  const unloadCurrent = () => {
    const id = get().traceId;
    if (id) void unloadTrace(id).catch(() => undefined);
  };

  return {
    ...idle,
    python: undefined,
    command: 'main.py',
    speed: 1,
    mode: 'map',
    checkPython: async () => {
      try {
        set({ python: await findPython() });
      } catch {
        set({ python: null });
      }
    },
    setCommand: (command) => set({ command }),
    record: async () => {
      const root = useAppStore.getState().projectRoot;
      if (!root) return;
      get().pause();
      set({ status: 'recording', error: null, run: null });
      try {
        const run = await recordRun(root, get().command);
        set({ run });
        if (!run.trace_exists) {
          set({ status: 'error', error: run.stderr.slice(-500) || 'The program did not produce a trace.' });
          return;
        }
        await get().load(run.trace_path);
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    },
    load: async (path) => {
      const pid = useAppStore.getState().projectId;
      if (!pid) return;
      get().pause();
      unloadCurrent();
      const mine = ++generation;
      frames.reset();
      set({ status: 'loading', error: null, traceId: null, summary: null, steps: [], total: 0, index: 0, source: 'trace' });
      try {
        const summary = await loadTrace(pid, path);
        if (mine !== generation) return;
        set({ traceId: summary.trace_id, summary, total: summary.steps_total });
        let steps: Step[] = [];
        while (steps.length < summary.steps_total) {
          const page = await getSteps(summary.trace_id, steps.length, CHUNK);
          if (mine !== generation) return;
          if (page.steps.length === 0) break;
          steps = steps.concat(page.steps);
        }
        set({ steps, status: 'ready', index: 0 });
      } catch (e) {
        if (mine === generation) set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    },
    loadWalkthrough: (steps) => {
      get().pause();
      unloadCurrent();
      generation++;
      frames.reset();
      set({ ...idle, status: 'ready', steps, total: steps.length, source: 'walkthrough' });
    },
    play: () => {
      if (get().status !== 'ready') return;
      if (get().index >= get().steps.length - 1) set({ index: 0 });
      set({ playing: true });
      startTimer();
    },
    pause: () => {
      stopTimer();
      set({ playing: false });
    },
    stepForward: () => void move(1),
    stepBack: () => void move(-1),
    seek: (i) => set({ index: Math.max(0, Math.min(get().steps.length - 1, Math.round(i))) }),
    setSpeed: (speed) => {
      set({ speed });
      if (get().playing) startTimer();
    },
    setMode: (mode) => set({ mode }),
    jumpToException: () => {
      const ex = get().summary?.last_exception;
      if (ex) {
        get().pause();
        get().seek(ex.i);
      }
    },
    close: () => {
      get().pause();
      unloadCurrent();
      generation++;
      frames.reset();
      set({ ...idle });
      useAppStore.getState().setOverlay('motion', null);
    },
  };
});

export function currentStep(): Step | null {
  const { steps, index } = useMotionStore.getState();
  return steps[index] ?? null;
}

export function currentStack(): Frame[] {
  const { steps, index } = useMotionStore.getState();
  return frames.stackAt(steps, index);
}
