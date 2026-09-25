import { describe, expect, it } from 'vitest';
import { otlpToEvents } from './otlp';

// Shaped like what the OpenTelemetry JS/Python OTLP-HTTP-JSON exporters send.
const sample = {
  resourceSpans: [
    {
      resource: { attributes: [{ key: 'service.name', value: { stringValue: 'orders-api' } }] },
      scopeSpans: [
        {
          scope: { name: '@opentelemetry/instrumentation-http' },
          spans: [
            {
              traceId: '5b8efff798038103d269b633813fc60c',
              spanId: 'eee19b7ec3c1b174',
              name: 'GET /orders/:id',
              kind: 2,
              startTimeUnixNano: '1727000000000000000',
              endTimeUnixNano: '1727000000012500000',
              attributes: [
                { key: 'http.request.method', value: { stringValue: 'GET' } },
                { key: 'http.response.status_code', value: { intValue: '500' } },
              ],
              status: { code: 2, message: 'Internal error' },
            },
            {
              traceId: '5b8efff798038103d269b633813fc60c',
              spanId: 'aaa19b7ec3c1b175',
              parentSpanId: 'eee19b7ec3c1b174',
              name: 'loadOrder',
              kind: 'SPAN_KIND_INTERNAL',
              startTimeUnixNano: '1727000000001000000',
              endTimeUnixNano: '1727000000004000000',
              attributes: [
                { key: 'code.filepath', value: { stringValue: '/srv/app/orders.js' } },
                { key: 'code.lineno', value: { intValue: 42 } },
                { key: 'cached', value: { boolValue: false } },
                { key: 'ratio', value: { doubleValue: 0.5 } },
                { key: 'list', value: { arrayValue: { values: [] } } },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe('otlpToEvents', () => {
  it('converts server and internal spans', () => {
    const [server, inner] = otlpToEvents(sample, 'otlp');
    expect(server).toMatchObject({
      v: 1,
      event_id: 'eee19b7ec3c1b174-1727000000000000000',
      trace_id: '5b8efff798038103d269b633813fc60c',
      span_id: 'eee19b7ec3c1b174',
      parent_span_id: null,
      kind: 'http_in',
      name: 'GET /orders/:id',
      file_path: '',
      line: 0,
      duration_ns: 12_500_000,
      status: 'error',
      error: { type: 'Error', message: 'Internal error', stack: '' },
      attrs: { 'http.request.method': 'GET', 'http.response.status_code': 500 },
      service: 'orders-api',
    });
    expect(Math.abs(server.start_ns - 1727000000000000000)).toBeLessThan(1000);
    expect(inner).toMatchObject({
      parent_span_id: 'eee19b7ec3c1b174',
      kind: 'call',
      file_path: '/srv/app/orders.js',
      line: 42,
      duration_ns: 3_000_000,
      status: 'ok',
      error: null,
      attrs: {
        'code.filepath': '/srv/app/orders.js',
        'code.lineno': 42,
        cached: false,
        ratio: 0.5,
      },
    });
  });

  it('maps client spans and uses the fallback service', () => {
    const span = (attributes: unknown[]) => ({
      traceId: 't',
      spanId: 's',
      name: 'q',
      kind: 3,
      startTimeUnixNano: '1',
      endTimeUnixNano: '2',
      attributes,
    });
    const body = {
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [span([{ key: 'db.system', value: { stringValue: 'postgresql' } }]), span([])],
            },
          ],
        },
      ],
    };
    const events = otlpToEvents(body, 'otlp');
    expect(events.map((e) => e.kind)).toEqual(['db_query', 'http_out']);
    expect(events[0].service).toBe('otlp');
  });

  it('ignores malformed input', () => {
    expect(otlpToEvents(null, 'otlp')).toEqual([]);
    expect(
      otlpToEvents(
        { resourceSpans: [{ scopeSpans: [{ spans: [{ name: 'no ids' }, null] }] }] },
        'otlp',
      ),
    ).toEqual([]);
  });

  it('keeps at most 30 attributes', () => {
    const attributes = Array.from({ length: 40 }, (_, i) => ({
      key: 'k' + i,
      value: { intValue: i },
    }));
    const [e] = otlpToEvents(
      { resourceSpans: [{ scopeSpans: [{ spans: [{ traceId: 't', spanId: 's', attributes }] }] }] },
      'x',
    );
    expect(Object.keys(e.attrs!)).toHaveLength(30);
  });
});
