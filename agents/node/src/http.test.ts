import { createServer, request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';
import { installErrorHooks } from './errors.js';
import type { RuntimeEvent } from './events.js';
import { instrumentHttp } from './http.js';

const servers: Server[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

async function listen(handler: Parameters<typeof createServer>[1]): Promise<number> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return (server.address() as AddressInfo).port;
}

const settle = () => new Promise((r) => setTimeout(r, 30));

describe('instrumentHttp', () => {
  it('records incoming requests and outgoing fetch calls in one trace', async () => {
    const events: RuntimeEvent[] = [];
    const upstream = await listen((_req, res) => res.end('ok'));
    const app = await listen(async (req, res) => {
      await fetch(`http://127.0.0.1:${upstream}/prices?id=3`); // made while handling the request
      res.statusCode = req.url?.startsWith('/fail') ? 500 : 200;
      res.end('done');
    });
    const config = loadConfig({ PV_RUNTIME_TOKEN: 't', PV_SERVICE: 'shop', PV_RUNTIME_URL: 'http://127.0.0.1:1' })!;
    const stop = instrumentHttp(config, (e) => events.push(e));
    try {
      await (await fetch(`http://127.0.0.1:${app}/orders/7?x=1`)).text();
      await settle();
    } finally {
      stop();
    }
    // both servers run in this process: the app's request and the upstream's request are both incoming
    const inbound = events.filter((e) => e.kind === 'http_in').sort((a, b) => a.name.localeCompare(b.name));
    const outbound = events.filter((e) => e.kind === 'http_out');
    expect(inbound.map((e) => e.name)).toEqual(['GET /orders/7', 'GET /prices']);
    expect(inbound[0]).toMatchObject({
      name: 'GET /orders/7',
      status: 'ok',
      service: 'shop',
      attrs: { 'http.method': 'GET', 'http.route': '/orders/7', 'http.status_code': 200 },
    });
    // the test's own fetch to the app, and the app's fetch upstream (a child of the request)
    expect(outbound).toHaveLength(2);
    const upstreamCall = outbound.find((e) => e.name.endsWith('/prices'))!;
    expect(upstreamCall.name).toBe(`GET 127.0.0.1:${upstream}/prices`);
    expect(upstreamCall.trace_id).toBe(inbound[0].trace_id);
    expect(upstreamCall.parent_span_id).toBe(inbound[0].span_id);
    expect(upstreamCall.attrs['http.status_code']).toBe(200);
  });

  it('records http.request calls, ignores calls to the hub itself, and stops', async () => {
    const events: RuntimeEvent[] = [];
    const target = await listen((_req, res) => {
      res.statusCode = 503;
      res.end();
    });
    const hub = await listen((_req, res) => res.end('{}'));
    const config = loadConfig({ PV_RUNTIME_TOKEN: 't', PV_RUNTIME_URL: `http://127.0.0.1:${hub}` })!;
    const stop = instrumentHttp(config, (e) => events.push(e));
    const get = (port: number, path: string) =>
      new Promise<void>((resolve, reject) => {
        const req = httpRequest({ host: '127.0.0.1', port, path }, (res) => {
          res.resume();
          res.on('end', resolve);
        });
        req.on('error', reject);
        req.end();
      });
    await get(target, '/status');
    await get(hub, '/v1/events');
    await fetch(`http://127.0.0.1:${hub}/v1/events`, { method: 'POST', body: '{}' });
    await settle();
    stop();
    await get(target, '/after-stop');
    await settle();
    const out = events.filter((e) => e.kind === 'http_out');
    expect(out.map((e) => e.name)).toEqual([`GET 127.0.0.1:${target}/status`]);
    expect(out[0].status).toBe('error'); // 5xx
  });
});

describe('installErrorHooks', () => {
  it('reports uncaught exceptions and unhandled rejections with the project frame', () => {
    const events: RuntimeEvent[] = [];
    let flushed = 0;
    const root = process.cwd().replace(/\\/g, '/');
    const config = loadConfig({ PV_RUNTIME_TOKEN: 't', PV_PROJECT_ROOT: root })!;
    const uninstall = installErrorHooks(config, (e) => events.push(e), () => flushed++);
    try {
      const crash = new TypeError('cannot read id');
      process.emit('uncaughtExceptionMonitor', crash, 'uncaughtException');
      process.emit('uncaughtExceptionMonitor', crash, 'uncaughtException'); // reported once
      const rejection = new RangeError('bad page');
      process.emit('unhandledRejection', rejection, Promise.resolve());
    } finally {
      uninstall();
    }
    expect(events.map((e) => [e.kind, e.name, e.status])).toEqual([
      ['error', 'TypeError', 'error'],
      ['error', 'RangeError', 'error'],
    ]);
    expect(events[0].error?.message).toBe('cannot read id');
    expect(events[0].file_path).toMatch(/src\/http\.test\.ts$/);
    expect(events[0].line).toBeGreaterThan(0);
    expect(flushed).toBeGreaterThanOrEqual(2);
  });
});
