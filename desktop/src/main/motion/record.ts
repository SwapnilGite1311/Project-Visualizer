import { delimiter } from 'node:path';
import type { PythonInfo } from './python-finder';

const MAX_OUTPUT = 20000;

export function parseCommand(text: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;
  let hasToken = false;
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      hasToken = true;
    } else if (/\s/.test(ch)) {
      if (hasToken) parts.push(current);
      current = '';
      hasToken = false;
    } else {
      current += ch;
      hasToken = true;
    }
  }
  if (quote) throw new Error('Unclosed quote');
  if (hasToken) parts.push(current);
  if (parts.length === 0) throw new Error('Enter a command, for example: main.py');
  return parts;
}

export interface RecordOptions {
  python: PythonInfo;
  recorderDir: string;
  root: string;
  command: string[];
  outFile: string;
  maxEvents: number;
  timeoutMs: number;
}

export interface RecordResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  cancelled: boolean;
}

interface Emitter {
  on(event: string, listener: (arg: unknown) => void): unknown;
}
export interface ChildLike extends Emitter {
  stdout: Emitter | null;
  stderr: Emitter | null;
  kill(): unknown;
}
export type SpawnFn = (cmd: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }) => ChildLike;

export function recordingArgs(o: RecordOptions): string[] {
  return [...o.python.args, '-m', 'pv_trace', '--root', o.root, '--out', o.outFile, '--max-events', String(o.maxEvents), '--', ...o.command];
}

const tail = (text: string) => (text.length > MAX_OUTPUT ? text.slice(-MAX_OUTPUT) : text);

export function startRecording(o: RecordOptions, spawnFn: SpawnFn): { result: Promise<RecordResult>; cancel(): void } {
  const existing = process.env.PYTHONPATH;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONPATH: existing ? o.recorderDir + delimiter + existing : o.recorderDir,
    PYTHONIOENCODING: 'utf-8',
    PYTHONUNBUFFERED: '1',
    PYTHONDONTWRITEBYTECODE: '1',
  };
  const state = { stdout: '', stderr: '', timedOut: false, cancelled: false };
  const child = spawnFn(o.python.command, recordingArgs(o), { cwd: o.root, env });
  const result = new Promise<RecordResult>((resolve) => {
    let done = false;
    const finish = (exitCode: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ exitCode, stdout: state.stdout, stderr: state.stderr, timedOut: state.timedOut, cancelled: state.cancelled });
    };
    const timer = setTimeout(() => {
      state.timedOut = true;
      child.kill();
    }, o.timeoutMs);
    child.stdout?.on('data', (d) => (state.stdout = tail(state.stdout + String(d))));
    child.stderr?.on('data', (d) => (state.stderr = tail(state.stderr + String(d))));
    child.on('error', (e) => {
      state.stderr = tail(state.stderr + (e instanceof Error ? e.message : String(e)));
      finish(null);
    });
    child.on('exit', (code) => finish(typeof code === 'number' ? code : null));
  });
  return {
    result,
    cancel() {
      state.cancelled = true;
      child.kill();
    },
  };
}
