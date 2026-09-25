import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeContext } from '../core/test-context';
import { findPython } from '../motion/python-finder';
import { startRecording } from '../motion/record';
import register from './motion';

const userData = mkdtempSync(join(tmpdir(), 'pv-motion-ud-'));
const project = mkdtempSync(join(tmpdir(), 'pv-motion-proj-'));

vi.mock('electron', () => ({
  app: { getPath: () => userData },
  dialog: { showOpenDialog: vi.fn(async () => ({ canceled: false, filePaths: ['C:/traces/a.jsonl'] })) },
}));
vi.mock('../motion/python-finder', () => ({ findPython: vi.fn() }));
vi.mock('../motion/recorder-files', () => ({ installRecorder: vi.fn(() => 'C:/ud/recorder') }));
vi.mock('../motion/record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../motion/record')>()),
  startRecording: vi.fn(),
}));

const PY = { command: 'python', args: [], version: '3.12.4', executable: '/usr/bin/python' };
const settings = { get: vi.fn((_k: string, fallback: unknown) => fallback), set: vi.fn() };

function setup() {
  const ctx = fakeContext({ settings } as never);
  register(ctx);
  return ctx;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findPython).mockResolvedValue(PY);
});

describe('motion handlers', () => {
  it('registers the channels', () => {
    expect([...setup().handlers.keys()].sort()).toEqual(['pv:motion.cancel', 'pv:motion.pickTrace', 'pv:motion.python', 'pv:motion.record']);
  });

  it('records and returns the trace path', async () => {
    vi.mocked(startRecording).mockReturnValue({
      result: Promise.resolve({ exitCode: 0, stdout: 'alice\n', stderr: '', timedOut: false, cancelled: false }),
      cancel: vi.fn(),
    });
    const ctx = setup();
    const r = (await ctx.call('pv:motion.record', { root: project, command: 'main.py --x 1' })) as Record<string, unknown>;
    const [opts] = vi.mocked(startRecording).mock.calls[0];
    expect(opts).toMatchObject({ python: PY, recorderDir: 'C:/ud/recorder', root: project, command: ['main.py', '--x', '1'], maxEvents: 200000 });
    expect(String(r.trace_path).startsWith(join(userData, 'traces', 'trace-'))).toBe(true);
    expect(r).toMatchObject({ trace_exists: false, exit_code: 0, stdout: 'alice\n', timed_out: false, cancelled: false });
  });

  it('allows one recording at a time and can cancel it', async () => {
    let finish: (v: unknown) => void = () => undefined;
    const cancel = vi.fn();
    vi.mocked(startRecording).mockReturnValue({ result: new Promise((r) => (finish = r)) as never, cancel });
    const ctx = setup();
    const first = ctx.call('pv:motion.record', { root: project, command: 'main.py' });
    await vi.waitFor(() => expect(startRecording).toHaveBeenCalled());
    await expect(ctx.call('pv:motion.record', { root: project, command: 'main.py' })).rejects.toThrow('A recording is already running');
    expect(await ctx.call('pv:motion.cancel')).toBe(true);
    expect(cancel).toHaveBeenCalled();
    finish({ exitCode: null, stdout: '', stderr: '', timedOut: false, cancelled: true });
    await first;
    expect(await ctx.call('pv:motion.cancel')).toBe(false);
  });

  it('explains missing Python and bad input', async () => {
    vi.mocked(findPython).mockResolvedValue(null);
    const ctx = setup();
    await expect(ctx.call('pv:motion.record', { root: project, command: 'main.py' })).rejects.toThrow('Python 3.9 or newer was not found');
    await expect(ctx.call('pv:motion.record', { root: join(project, 'nope'), command: 'main.py' })).rejects.toThrow('Project folder not found');
    await expect(ctx.call('pv:motion.record', { root: project, command: ' ' })).rejects.toThrow('Enter a command');
  });

  it('picks a trace file', async () => {
    expect(await setup().call('pv:motion.pickTrace')).toBe('C:/traces/a.jsonl');
  });
});
