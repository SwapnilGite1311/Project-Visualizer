import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';
import { makeEvent } from './events.js';
import { Transport } from './transport.js';

const config = (extra: Record<string, string> = {}) => loadConfig({ PV_RUNTIME_TOKEN: 't', PV_SERVICE: 'shop', PV_FLUSH_MS: '100000', ...extra })!;
const ev = (i: number) => makeEvent({ service: 'shop' }, 'call', 'f' + i, { start_ns: 1 });

describe('config', () => {
  it('reads the environment with defaults', () => {
    expect(loadConfig({})).toBeNull();
    const c = loadConfig({ PV_RUNTIME_TOKEN: 'abc', PV_RUNTIME_URL: 'http://127.0.0.1:5000/', PV_SAMPLE_RATE: '2', PV_STALL_MS: 'x', PV_PROJECT_ROOT: 'C:\\code\\shop' })!;
    expect(c.url).toBe('http://127.0.0.1:5000');
    expect(c.token).toBe('abc');
    expect(c.sampleRate).toBe(1); // out of range -> default
    expect(c.stallMs).toBe(5000);
    expect(c.maxQueue).toBe(20000);
    expect(c.flushMs).toBe(200);
    expect(c.projectRoot).not.toContain('\\');
    expect(loadConfig({ PV_RUNTIME_TOKEN: 'a', PV_SAMPLE_RATE: '0.25' })!.sampleRate).toBe(0.25);
  });
});

describe('Transport', () => {
  it('sends batches of at most 1000 events with the source', async () => {
    const bodies: string[] = [];
    const t = new Transport(config(), async (b) => void bodies.push(b));
    for (let i = 0; i < 2500; i++) t.emit(ev(i));
    await t.flush();
    const batches = bodies.map((b) => JSON.parse(b));
    expect(batches.map((b) => b.events.length)).toEqual([1000, 1000, 500]);
    expect(batches[0].source).toMatchObject({ agent: 'node', version: '0.1.0', service: 'shop' });
    expect(t.sent).toBe(2500);
    await t.close();
  });

  it('drops the oldest events when the queue is full', async () => {
    const bodies: string[] = [];
    const t = new Transport(config({ PV_MAX_QUEUE: '3' }), async (b) => void bodies.push(b));
    for (let i = 0; i < 5; i++) t.emit(ev(i));
    await t.close();
    expect(JSON.parse(bodies[0]).events.map((e: { name: string }) => e.name)).toEqual(['f2', 'f3', 'f4']);
    expect(t.dropped).toBe(2);
  });

  it('swallows sender failures', async () => {
    const t = new Transport(config(), async () => {
      throw new Error('hub down');
    });
    t.emit(ev(1));
    await expect(t.flush()).resolves.toBeUndefined();
    expect(t.failed).toBe(1);
    await t.close();
  });

  it('posts synchronously before the process exits', async () => {
    const received: string[] = [];
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        received.push(`${req.headers.authorization} ${body}`);
        res.end('{}');
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as AddressInfo).port;
    try {
      const t = new Transport(config({ PV_RUNTIME_URL: `http://127.0.0.1:${port}` }));
      t.emit(ev(7));
      t.flushSync();
      await new Promise((r) => setTimeout(r, 50));
      expect(received).toHaveLength(1);
      expect(received[0]).toMatch(/^Bearer t /);
      expect(JSON.parse(received[0].slice('Bearer t '.length)).events[0].name).toBe('f7');
      await t.close();
    } finally {
      server.close();
    }
  });
});
