// Runtime events in the R12 format (contracts/events/runtime-event.schema.json).
import { randomBytes, randomUUID } from 'node:crypto';
import { threadId } from 'node:worker_threads';
import type { Config } from './config.js';

export type EventKind = 'call' | 'http_in' | 'http_out' | 'db_query' | 'message' | 'error' | 'stall' | 'log';

export interface RuntimeEvent {
  v: 1;
  event_id: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  kind: EventKind;
  name: string;
  file_path: string;
  line: number;
  start_ns: number;
  duration_ns: number;
  status: 'ok' | 'error';
  error: { type: string; message: string; stack: string } | null;
  attrs: Record<string, string | number | boolean>;
  service: string;
  pid: number;
  thread: string;
}

export type Emit = (event: RuntimeEvent) => void;

export const newTraceId = () => randomBytes(16).toString('hex');
export const newSpanId = () => randomBytes(8).toString('hex');

/** Wall-clock time in nanoseconds (sub-millisecond precision from the monotonic clock). */
export const nowNs = (): number => Math.round((performance.timeOrigin + performance.now()) * 1e6);

const MAX_STACK = 16384;

export function errorInfo(e: unknown): { type: string; message: string; stack: string } {
  if (e instanceof Error) {
    return { type: e.name || e.constructor?.name || 'Error', message: String(e.message).slice(0, 4096), stack: String(e.stack ?? '').slice(0, MAX_STACK) };
  }
  let message = '';
  try {
    message = String(e);
  } catch {
    message = '?';
  }
  return { type: typeof e === 'object' && e !== null ? 'Error' : typeof e, message: message.slice(0, 4096), stack: '' };
}

export function makeEvent(
  config: Pick<Config, 'service'>,
  kind: EventKind,
  name: string,
  fields: Partial<Omit<RuntimeEvent, 'v' | 'event_id' | 'kind' | 'name' | 'service' | 'pid' | 'thread'>> & { start_ns: number },
): RuntimeEvent {
  return {
    v: 1,
    event_id: randomUUID().replace(/-/g, ''),
    trace_id: fields.trace_id ?? newTraceId(),
    span_id: fields.span_id ?? newSpanId(),
    parent_span_id: fields.parent_span_id ?? null,
    kind,
    name,
    file_path: fields.file_path ?? '',
    line: Math.max(0, Math.trunc(fields.line ?? 0)),
    start_ns: fields.start_ns,
    duration_ns: Math.max(0, Math.round(fields.duration_ns ?? 0)),
    status: fields.status ?? 'ok',
    error: fields.error ?? null,
    attrs: fields.attrs ?? {},
    service: config.service,
    pid: process.pid,
    thread: threadId === 0 ? 'main' : `worker-${threadId}`,
  };
}
