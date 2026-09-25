import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCommand, type RecordOptions, recordingArgs, type SpawnFn, startRecording } from './record';

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn(() => this.emit('exit', null));
}

const options = (over: Partial<RecordOptions> = {}): RecordOptions => ({
  python: { command: 'py', args: ['-3'], version: '3.12.4', executable: 'C:/py/python.exe' },
  recorderDir: 'C:/ud/recorder',
  root: 'C:/code/demo',
  command: ['main.py'],
  outFile: 'C:/ud/traces/t.jsonl',
  maxEvents: 200000,
  timeoutMs: 120000,
  ...over,
});

afterEach(() => vi.useRealTimers());

describe('parseCommand', () => {
  it('splits words and keeps quoted parts together', () => {
    expect(parseCommand('main.py')).toEqual(['main.py']);
    expect(parseCommand('  -m pytest tests/test_a.py -q ')).toEqual(['-m', 'pytest', 'tests/test_a.py', '-q']);
    expect(parseCommand('app.py --name "Ada Lovelace"')).toEqual(['app.py', '--name', 'Ada Lovelace']);
    expect(parseCommand("app.py ''")).toEqual(['app.py', '']);
  });

  it('rejects empty commands and unclosed quotes', () => {
    expect(() => parseCommand('   ')).toThrow('Enter a command, for example: main.py');
    expect(() => parseCommand('"abc')).toThrow('Unclosed quote');
  });
});

describe('startRecording', () => {
  it('builds the recorder command line', () => {
    expect(recordingArgs(options())).toEqual([
      '-3', '-m', 'pv_trace', '--root', 'C:/code/demo', '--out', 'C:/ud/traces/t.jsonl', '--max-events', '200000', '--', 'main.py',
    ]);
  });

  it('runs in the project folder with the recorder on PYTHONPATH and collects output', async () => {
    const child = new FakeChild();
    const spawn = vi.fn<SpawnFn>(() => child);
    const run = startRecording(options(), spawn);
    const [cmd, , opts] = spawn.mock.calls[0];
    expect(cmd).toBe('py');
    expect(opts.cwd).toBe('C:/code/demo');
    expect(opts.env.PYTHONPATH?.startsWith('C:/ud/recorder')).toBe(true);
    expect(opts.env.PYTHONDONTWRITEBYTECODE).toBe('1');
    child.stdout.emit('data', Buffer.from('alice\n'));
    child.stderr.emit('data', 'warn\n');
    child.emit('exit', 0);
    expect(await run.result).toEqual({ exitCode: 0, stdout: 'alice\n', stderr: 'warn\n', timedOut: false, cancelled: false });
  });

  it('kills the program after the timeout', async () => {
    vi.useFakeTimers();
    const child = new FakeChild();
    const run = startRecording(options({ timeoutMs: 1000 }), () => child);
    vi.advanceTimersByTime(1000);
    const result = await run.result;
    expect(child.kill).toHaveBeenCalled();
    expect(result.timedOut).toBe(true);
  });

  it('can be cancelled and reports spawn errors', async () => {
    const child = new FakeChild();
    const run = startRecording(options(), () => child);
    run.cancel();
    expect((await run.result).cancelled).toBe(true);

    const broken = new FakeChild();
    const failed = startRecording(options(), () => broken);
    broken.emit('error', new Error('spawn py ENOENT'));
    expect(await failed.result).toMatchObject({ exitCode: null, stderr: 'spawn py ENOENT' });
  });
});
