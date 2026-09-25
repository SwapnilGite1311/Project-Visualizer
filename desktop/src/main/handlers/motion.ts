// Channels: pv:motion.python → PythonInfo | null; pv:motion.record {root, command, maxEvents?} → recording result;
// pv:motion.cancel → boolean; pv:motion.pickTrace → path | null.
import { execFile, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { app, dialog } from 'electron';
import type { MainContext } from '../core/context';
import { findPython, type RunFn } from '../motion/python-finder';
import { parseCommand, startRecording } from '../motion/record';
import { installRecorder } from '../motion/recorder-files';

const KEEP_TRACES = 10;
const TIMEOUT_MS = 120000;

const realRun: RunFn = (cmd, args) =>
  new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, timeout: 10000 }, (error, stdout) => {
      const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
      resolve({ code, stdout: String(stdout) });
    });
  });

function pruneTraces(dir: string): void {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('trace-') && f.endsWith('.jsonl'))
    .map((f) => ({ path: join(dir, f), time: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  for (const old of files.slice(KEEP_TRACES)) {
    try {
      unlinkSync(old.path);
    } catch {
      // still open elsewhere: removed next time
    }
  }
}

export default function register(ctx: MainContext): void {
  let current: { cancel(): void } | null = null;
  const locatePython = () => findPython(realRun, process.platform, ctx.settings.get<string>('motion.python', ''));

  ctx.handle('pv:motion.python', () => locatePython());

  ctx.handle('pv:motion.record', async (p) => {
    const { root, command, maxEvents } = (p ?? {}) as { root?: unknown; command?: unknown; maxEvents?: unknown };
    if (current) throw new Error('A recording is already running');
    if (typeof root !== 'string' || !existsSync(root) || !statSync(root).isDirectory()) throw new Error('Project folder not found');
    const args = parseCommand(typeof command === 'string' ? command : '');
    const python = await locatePython();
    if (!python) throw new Error('Python 3.9 or newer was not found. Install it from python.org and try again.');
    const userData = app.getPath('userData');
    const recorderDir = installRecorder(userData);
    const tracesDir = join(userData, 'traces');
    mkdirSync(tracesDir, { recursive: true });
    const outFile = join(tracesDir, `trace-${Date.now()}.jsonl`);
    const events = typeof maxEvents === 'number' ? Math.min(2000000, Math.max(1000, Math.round(maxEvents))) : 200000;
    const run = startRecording(
      { python, recorderDir, root, command: args, outFile, maxEvents: events, timeoutMs: TIMEOUT_MS },
      (cmd, cmdArgs, opts) => spawn(cmd, cmdArgs, { ...opts, shell: false, windowsHide: true }),
    );
    current = run;
    try {
      const r = await run.result;
      pruneTraces(tracesDir);
      return {
        trace_path: outFile,
        trace_exists: existsSync(outFile),
        exit_code: r.exitCode,
        stdout: r.stdout,
        stderr: r.stderr,
        timed_out: r.timedOut,
        cancelled: r.cancelled,
      };
    } finally {
      current = null;
    }
  });

  ctx.handle('pv:motion.cancel', () => {
    if (!current) return false;
    current.cancel();
    return true;
  });

  ctx.handle('pv:motion.pickTrace', async () => {
    const win = ctx.getWindow();
    const options = { properties: ['openFile' as const], filters: [{ name: 'pv-trace', extensions: ['jsonl'] }] };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });
}
