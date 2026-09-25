// Checks event batches from agents (R12, contracts/events/runtime-batch.schema.json) before they reach the engine.

export const MAX_EVENTS_PER_BATCH = 5000;

export const EVENT_KINDS = [
  'call',
  'http_in',
  'http_out',
  'db_query',
  'message',
  'error',
  'stall',
  'log',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export interface BatchSource {
  agent: string;
  version: string;
  service: string;
  project_root: string;
}

export interface RuntimeEventJson {
  v: 1;
  event_id: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string | null;
  kind: EventKind;
  name: string;
  file_path?: string;
  line?: number;
  start_ns: number;
  duration_ns?: number;
  status?: 'ok' | 'error';
  error?: { type: string; message: string; stack: string } | null;
  attrs?: Record<string, string | number | boolean>;
  service?: string;
  pid?: number;
  thread?: string;
}

export class BatchError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string';
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function cleanAttrs(v: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!isObject(v)) return out;
  for (const [key, value] of Object.entries(v)) {
    if (
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    )
      out[key] = value;
  }
  return out;
}

function cleanError(v: unknown): RuntimeEventJson['error'] {
  if (!isObject(v)) return null;
  return {
    type: isText(v.type) ? v.type : 'Error',
    message: isText(v.message) ? v.message : '',
    stack: isText(v.stack) ? v.stack : '',
  };
}

// Returns the event with only the known fields (the engine contract allows no others), or null when it is invalid.
export function cleanEvent(e: unknown): RuntimeEventJson | null {
  if (!isObject(e)) return null;
  if (
    e.v !== 1 ||
    !isText(e.event_id) ||
    !e.event_id ||
    !isText(e.trace_id) ||
    !e.trace_id ||
    !isText(e.span_id) ||
    !e.span_id
  )
    return null;
  if (!EVENT_KINDS.includes(e.kind as EventKind) || !isText(e.name) || !isCount(e.start_ns))
    return null;
  const out: RuntimeEventJson = {
    v: 1,
    event_id: e.event_id,
    trace_id: e.trace_id,
    span_id: e.span_id,
    parent_span_id: isText(e.parent_span_id) && e.parent_span_id ? e.parent_span_id : null,
    kind: e.kind as EventKind,
    name: e.name,
    file_path: isText(e.file_path) ? e.file_path : '',
    line: isCount(e.line) ? e.line : 0,
    start_ns: e.start_ns,
    duration_ns: isCount(e.duration_ns) ? e.duration_ns : 0,
    status: e.status === 'error' ? 'error' : 'ok',
    error: cleanError(e.error),
    attrs: cleanAttrs(e.attrs),
  };
  if (isText(e.service)) out.service = e.service;
  if (typeof e.pid === 'number' && Number.isInteger(e.pid)) out.pid = e.pid;
  if (isText(e.thread)) out.thread = e.thread;
  return out;
}

export function validateBatch(body: unknown): {
  source: BatchSource;
  events: RuntimeEventJson[];
  rejected: number;
} {
  if (!isObject(body) || !Array.isArray(body.events))
    throw new BatchError('the body must be {"source": {...}, "events": [...]}');
  if (body.events.length > MAX_EVENTS_PER_BATCH)
    throw new BatchError(`at most ${MAX_EVENTS_PER_BATCH} events per batch`);
  const s = isObject(body.source) ? body.source : {};
  const source: BatchSource = {
    agent: isText(s.agent) ? s.agent : 'unknown',
    version: isText(s.version) ? s.version : '',
    service: isText(s.service) ? s.service : '',
    project_root: isText(s.project_root) ? s.project_root : '',
  };
  const events: RuntimeEventJson[] = [];
  let rejected = 0;
  for (const raw of body.events) {
    const event = cleanEvent(raw);
    if (event) {
      if (!event.service && source.service) event.service = source.service;
      events.push(event);
    } else rejected++;
  }
  return { source, events, rejected };
}
