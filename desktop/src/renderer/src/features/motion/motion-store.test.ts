import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../core/store';
import { getSteps, loadTrace, recordRun, type TraceSummary, unloadTrace } from './motion-api';
import { CHUNK, currentStack, currentStep, STEP_MS, useMotionStore } from './motion-store';
import { numbered, step } from './test-data';

vi.mock('./motion-api', () => ({
  findPython: vi.fn(),
  getSteps: vi.fn(),
  loadTrace: vi.fn(),
  recordRun: vi.fn(),
  unloadTrace: vi.fn(async () => ({ removed: true })),
}));

const STEPS = numbered([
  step('call', 'f:main', 0, 7),
  step('line', 'f:main', 0, 8),
  step('call', 'f:get', 1, 20, { user_id: '1' }),
  step('line', 'f:get', 1, 21),
  step('exception', 'f:get', 1, 22, {}, 'ValueError: bad id'),
  step('return', 'f:get', 1, 22),
  step('line', 'f:main', 0, 9),
]);

const summary = (total: number): TraceSummary => ({
  trace_id: 't1',
  steps_total: total,
  truncated: false,
  exit_code: 0,
  argv: ['main.py'],
  skipped_lines: 0,
  functions: [],
  last_exception: { i: 4, node_id: 'f:get', line: 22, value: 'ValueError: bad id' },
});

async function loadSteps() {
  vi.mocked(loadTrace).mockResolvedValue(summary(STEPS.length));
  vi.mocked(getSteps).mockImplementation(async (_t, from, count) => ({ total: STEPS.length, steps: STEPS.slice(from, from + Math.min(count, 4)) }));
  await useMotionStore.getState().load('C:/t.jsonl');
}

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({ projectId: 'p1', projectRoot: 'C:/code/demo', overlays: {} });
  useMotionStore.getState().close();
  useMotionStore.setState({ mode: 'map', speed: 1, command: 'main.py' });
});
afterEach(() => vi.useRealTimers());

describe('motion store', () => {
  it('loads every step in chunks', async () => {
    await loadSteps();
    const s = useMotionStore.getState();
    expect(s.status).toBe('ready');
    expect(s.steps).toHaveLength(STEPS.length);
    expect(getSteps).toHaveBeenCalledWith('t1', 0, CHUNK);
    expect(getSteps).toHaveBeenCalledWith('t1', 4, CHUNK);
    expect(currentStep()?.node_id).toBe('f:main');
  });

  it('plays one step per tick inside a function and pauses at the end', async () => {
    vi.useFakeTimers();
    await loadSteps();
    useMotionStore.getState().setMode('inside');
    useMotionStore.getState().play();
    vi.advanceTimersByTime(STEP_MS * 2);
    expect(useMotionStore.getState().index).toBe(2);
    expect(currentStack().map((f) => f.nodeId)).toEqual(['f:main', 'f:get']);
    vi.advanceTimersByTime(STEP_MS * 10);
    expect(useMotionStore.getState().index).toBe(STEPS.length - 1);
    expect(useMotionStore.getState().playing).toBe(false);
  });

  it('skips line steps in map mode', async () => {
    await loadSteps();
    const s = useMotionStore.getState();
    s.stepForward();
    expect(useMotionStore.getState().index).toBe(2);
    s.stepForward();
    expect(useMotionStore.getState().index).toBe(4);
    s.stepBack();
    expect(useMotionStore.getState().index).toBe(2);
  });

  it('jumps to the exception and closes', async () => {
    await loadSteps();
    useMotionStore.getState().jumpToException();
    expect(useMotionStore.getState().index).toBe(4);
    useAppStore.getState().setOverlay('motion', { priority: 50, nodes: {}, edges: {} });
    useMotionStore.getState().close();
    expect(useMotionStore.getState()).toMatchObject({ status: 'idle', steps: [], traceId: null });
    expect(unloadTrace).toHaveBeenCalledWith('t1');
    expect(useAppStore.getState().overlays.motion).toBeUndefined();
  });

  it('records then loads, or reports a missing trace', async () => {
    vi.mocked(recordRun).mockResolvedValueOnce({ trace_path: 'C:/t.jsonl', trace_exists: false, exit_code: 2, stdout: '', stderr: "can't open file 'main.py'", timed_out: false, cancelled: false });
    await useMotionStore.getState().record();
    expect(useMotionStore.getState()).toMatchObject({ status: 'error', error: "can't open file 'main.py'" });
    expect(recordRun).toHaveBeenCalledWith('C:/code/demo', 'main.py');

    vi.mocked(recordRun).mockResolvedValueOnce({ trace_path: 'C:/t.jsonl', trace_exists: true, exit_code: 0, stdout: 'hi', stderr: '', timed_out: false, cancelled: false });
    vi.mocked(loadTrace).mockResolvedValue(summary(STEPS.length));
    vi.mocked(getSteps).mockResolvedValue({ total: STEPS.length, steps: STEPS });
    await useMotionStore.getState().record();
    expect(useMotionStore.getState()).toMatchObject({ status: 'ready', run: { stdout: 'hi' } });
    expect(loadTrace).toHaveBeenCalledWith('p1', 'C:/t.jsonl');
  });

  it('plays a walkthrough without an engine trace', () => {
    useMotionStore.getState().loadWalkthrough(STEPS.slice(0, 3));
    expect(useMotionStore.getState()).toMatchObject({ status: 'ready', source: 'walkthrough', total: 3, traceId: null });
  });
});
