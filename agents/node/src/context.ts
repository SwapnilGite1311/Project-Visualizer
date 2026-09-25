// The current trace and span, carried across await/callbacks with AsyncLocalStorage.
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'node:url';

export interface SpanContext {
  traceId: string;
  spanId: string;
  sampled: boolean;
}

export const spanStorage = new AsyncLocalStorage<SpanContext>();

export const currentSpan = (): SpanContext | undefined => spanStorage.getStore();

export function normalizePath(p: string): string {
  let path = p;
  if (path.startsWith('file://')) {
    try {
      path = fileURLToPath(path);
    } catch {
      // keep as written
    }
  }
  return path.replace(/\\/g, '/');
}

export interface StackFrame {
  file: string;
  line: number;
}

// "    at fn (C:\\app\\a.js:10:5)", "    at file:///C:/app/a.mjs:3:1", "    at async fn (/srv/a.js:4:2)"
const FRAME = /^\s*at (?:.*? \()?(.+?):(\d+):\d+\)?\s*$/;

export function parseStack(stack: string | undefined): StackFrame[] {
  const frames: StackFrame[] = [];
  for (const line of (stack ?? '').split('\n')) {
    const m = FRAME.exec(line);
    if (m && !m[1].startsWith('node:') && m[1] !== 'native') frames.push({ file: normalizePath(m[1]), line: Number(m[2]) });
  }
  return frames;
}

export function inProject(file: string, projectRoot: string): boolean {
  const windows = process.platform === 'win32';
  const f = windows ? file.toLowerCase() : file;
  const root = (windows ? projectRoot.toLowerCase() : projectRoot).replace(/\/+$/, '') + '/';
  return f.startsWith(root) && !f.includes('/node_modules/') && !f.includes('/agents/node/dist/') && !f.includes('/@pv/agent-node/');
}

/** The innermost frame of the stack that is in the project. */
export function projectFrame(stack: string | undefined, projectRoot: string): StackFrame | null {
  return parseStack(stack).find((f) => inProject(f.file, projectRoot)) ?? null;
}
