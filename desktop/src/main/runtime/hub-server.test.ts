import { afterEach, describe, expect, it, vi } from 'vitest';
import { HubServer } from './hub-server';

let server: HubServer | null = null;

async function startHub() {
  const onEvents = vi.fn();
  server = new HubServer({ token: () => 'secret', onEvents, port: 0 });
  const port = await server.start();
  const url = `http://127.0.0.1:${port}`;
  const post = (path: string, body: string, token: string | null = 'secret') =>
    fetch(url + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token === null ? {} : { Authorization: 'Bearer ' + token }),
      },
      body,
    });
  return { url, post, onEvents };
}

const event = {
  v: 1,
  event_id: 'e1',
  trace_id: 't1',
  span_id: 's1',
  kind: 'call',
  name: 'app.main',
  start_ns: 5,
};
const batch = {
  source: { agent: 'python', version: '0.1.0', service: 'shop', project_root: 'C:/p' },
  events: [event, { v: 9 }],
};

afterEach(async () => {
  await server?.stop();
  server = null;
});

describe('HubServer', () => {
  it('answers health checks without a token and 404 for unknown paths', async () => {
    const { url, post } = await startHub();
    expect(await (await fetch(url + '/healthz')).json()).toEqual({ ok: true });
    expect((await post('/v1/other', '{}')).status).toBe(404);
    expect(server!.status()).toMatchObject({ running: true });
  });

  it('rejects requests without the right token', async () => {
    const { post, onEvents } = await startHub();
    expect((await post('/v1/events', JSON.stringify(batch), null)).status).toBe(401);
    expect((await post('/v1/events', JSON.stringify(batch), 'wrong')).status).toBe(401);
    expect(server!.stats().unauthorized).toBe(2);
    expect(onEvents).not.toHaveBeenCalled();
  });

  it('accepts event batches', async () => {
    const { post, onEvents } = await startHub();
    const res = await post('/v1/events', JSON.stringify(batch));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ accepted: 1, rejected: 1 });
    expect(onEvents).toHaveBeenCalledTimes(1);
    const [source, events] = onEvents.mock.calls[0];
    expect(source.project_root).toBe('C:/p');
    expect(events[0]).toMatchObject({ event_id: 'e1', service: 'shop' });
    expect(server!.stats()).toEqual({ received: 1, rejected: 1, unauthorized: 0 });
  });

  it('accepts OTLP traces', async () => {
    const { post, onEvents } = await startHub();
    const body = {
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 'ab',
                  spanId: 'cd',
                  name: 'work',
                  startTimeUnixNano: '10',
                  endTimeUnixNano: '30',
                },
              ],
            },
          ],
        },
      ],
    };
    const res = await post('/v1/traces', JSON.stringify(body));
    expect(await res.json()).toEqual({ accepted: 1, rejected: 0 });
    expect(onEvents.mock.calls[0][0].agent).toBe('otlp');
    expect(onEvents.mock.calls[0][1][0]).toMatchObject({
      trace_id: 'ab',
      span_id: 'cd',
      duration_ns: 20,
      service: 'otlp',
    });
  });

  it('refuses bad JSON, bad batches and bodies over 5 MB', async () => {
    const { post, onEvents } = await startHub();
    expect((await post('/v1/events', '{not json')).status).toBe(400);
    expect((await post('/v1/events', JSON.stringify({ events: 'x' }))).status).toBe(400);
    expect((await post('/v1/events', 'x'.repeat(6 * 1024 * 1024))).status).toBe(413);
    expect(onEvents).not.toHaveBeenCalled();
  });

  it('uses the next port when the preferred one is busy', async () => {
    const first = new HubServer({ token: () => 't', onEvents: () => undefined, port: 0 });
    const busy = await first.start();
    const second = new HubServer({ token: () => 't', onEvents: () => undefined, port: busy });
    try {
      const port = await second.start();
      expect(port).toBeGreaterThan(busy);
      expect(port).toBeLessThanOrEqual(busy + 9);
    } finally {
      await second.stop();
      await first.stop();
    }
  });
});
