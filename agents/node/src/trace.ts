// trace(name, fn): records one important function exactly (sync or async), nested calls become children.
import type { Config } from './config.js';
import { currentSpan, parseStack, type SpanContext, spanStorage } from './context.js';
import { type Emit, errorInfo, makeEvent, newSpanId, newTraceId, nowNs } from './events.js';

let active: { config: Config; emit: Emit } | null = null;

export function setTraceTarget(target: { config: Config; emit: Emit } | null): void {
  active = target;
}

function isPromiseLike(v: unknown): v is PromiseLike<unknown> {
  return typeof v === 'object' && v !== null && typeof (v as { then?: unknown }).then === 'function';
}

/** Runs fn and, when the agent is running, records it as a call. Returns what fn returns (and re-throws its errors). */
export function trace<T>(name: string, fn: () => T): T {
  const target = active;
  if (!target) return fn();
  const caller = parseStack(new Error().stack)[1]; // [0] is this function
  const parent = currentSpan();
  const span: SpanContext = {
    traceId: parent?.traceId ?? newTraceId(),
    spanId: newSpanId(),
    sampled: parent ? parent.sampled : Math.random() < target.config.sampleRate,
  };
  const start = nowNs();
  const finish = (error: unknown | undefined) => {
    if (!span.sampled) return;
    target.emit(
      makeEvent(target.config, 'call', name, {
        trace_id: span.traceId,
        span_id: span.spanId,
        parent_span_id: parent?.spanId ?? null,
        file_path: caller?.file ?? '',
        line: caller?.line ?? 0,
        start_ns: start,
        duration_ns: nowNs() - start,
        status: error === undefined ? 'ok' : 'error',
        error: error === undefined ? null : errorInfo(error),
      }),
    );
  };

  let result: T;
  try {
    result = spanStorage.run(span, fn);
  } catch (e) {
    finish(e ?? new Error('undefined thrown'));
    throw e;
  }
  if (isPromiseLike(result)) {
    return Promise.resolve(result).then(
      (value) => {
        finish(undefined);
        return value;
      },
      (e: unknown) => {
        finish(e ?? new Error('rejected'));
        throw e;
      },
    ) as T;
  }
  finish(undefined);
  return result;
}
