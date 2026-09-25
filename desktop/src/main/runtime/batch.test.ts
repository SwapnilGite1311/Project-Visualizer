import { describe, expect, it } from 'vitest';
import { BatchError, validateBatch } from './batch';

const good = (id: string, extra: Record<string, unknown> = {}) => ({
  v: 1,
  event_id: id,
  trace_id: 't1',
  span_id: 's' + id,
  kind: 'call',
  name: 'app.main',
  start_ns: 100,
  ...extra,
});

describe('validateBatch', () => {
  it('accepts a good batch and keeps only known fields', () => {
    const r = validateBatch({
      source: { agent: 'python', version: '0.1.0', service: 'shop', project_root: 'C:/p' },
      events: [
        good('1', {
          file_path: 'C:/p/a.py',
          line: 3,
          duration_ns: 50,
          attrs: { n: 1, bad: { x: 1 } },
          extra: 'dropped',
        }),
      ],
    });
    expect(r.rejected).toBe(0);
    expect(r.source).toEqual({
      agent: 'python',
      version: '0.1.0',
      service: 'shop',
      project_root: 'C:/p',
    });
    expect(r.events[0]).toEqual({
      v: 1,
      event_id: '1',
      trace_id: 't1',
      span_id: 's1',
      parent_span_id: null,
      kind: 'call',
      name: 'app.main',
      file_path: 'C:/p/a.py',
      line: 3,
      start_ns: 100,
      duration_ns: 50,
      status: 'ok',
      error: null,
      attrs: { n: 1 },
      service: 'shop',
    });
  });

  it('skips and counts invalid events; a missing source gets defaults', () => {
    const r = validateBatch({
      events: [
        good('1'),
        good('2', { v: 2 }),
        good('3', { kind: 'nope' }),
        good('4', { start_ns: -1 }),
        good('5', { event_id: 5 }),
        'text',
        good('6', { status: 'error', error: { type: 'ValueError', message: 'bad' } }),
      ],
    });
    expect(r.events.map((e) => e.event_id)).toEqual(['1', '6']);
    expect(r.rejected).toBe(5);
    expect(r.events[1].error).toEqual({ type: 'ValueError', message: 'bad', stack: '' });
    expect(r.source).toEqual({ agent: 'unknown', version: '', service: '', project_root: '' });
  });

  it('refuses oversize or malformed batches', () => {
    expect(() =>
      validateBatch({ events: Array.from({ length: 5001 }, (_, i) => good(String(i))) }),
    ).toThrow(BatchError);
    expect(() => validateBatch({ events: {} })).toThrow(BatchError);
    expect(() => validateBatch(null)).toThrow(BatchError);
    expect(
      validateBatch({ events: Array.from({ length: 5000 }, (_, i) => good(String(i))) }).events,
    ).toHaveLength(5000);
  });
});
