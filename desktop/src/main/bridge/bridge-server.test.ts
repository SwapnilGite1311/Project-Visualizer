import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { BridgeServer } from './bridge-server';

let server: BridgeServer | null = null;
afterEach(async () => {
  await server?.stop();
  server = null;
});

function client(port: number): Promise<{ ws: WebSocket; messages: unknown[]; closed: Promise<number> }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const messages: unknown[] = [];
    ws.on('message', (d) => messages.push(JSON.parse(String(d))));
    const closed = new Promise<number>((r) => ws.on('close', (code) => r(code)));
    ws.on('open', () => resolve({ ws, messages, closed }));
    ws.on('error', reject);
  });
}

const until = async (check: () => boolean) => vi.waitFor(() => expect(check()).toBe(true), { timeout: 3000 });

describe('BridgeServer', () => {
  it('closes clients with a wrong token', async () => {
    server = new BridgeServer({ token: 'secret', appVersion: '0.1.0', onReveal: vi.fn(), onExplain: vi.fn() });
    const port = await server.start(0);
    const c = await client(port);
    c.ws.send(JSON.stringify({ type: 'hello', token: 'wrong', client: 'test', version: '1' }));
    expect(await c.closed).toBe(4003);
    expect(server.status().clients).toBe(0);
  });

  it('welcomes authenticated clients, forwards requests and broadcasts open', async () => {
    const onReveal = vi.fn();
    const onExplain = vi.fn();
    server = new BridgeServer({ token: 'secret', appVersion: '0.1.0', onReveal, onExplain });
    const port = await server.start(0);
    expect(server.status()).toEqual({ running: true, port, clients: 0 });
    const c = await client(port);
    c.ws.send(JSON.stringify({ type: 'hello', token: 'secret', client: 'test', version: '1' }));
    await until(() => c.messages.length === 1);
    expect(c.messages[0]).toEqual({ type: 'welcome', app_version: '0.1.0' });
    expect(server.status().clients).toBe(1);

    c.ws.send(JSON.stringify({ type: 'reveal', file_path: 'C:/p/a.py', line: 9 }));
    c.ws.send(JSON.stringify({ type: 'explain', file_path: 'C:/p/a.py', line: 4 }));
    c.ws.send('garbage');
    await until(() => onExplain.mock.calls.length === 1 && c.messages.length === 2);
    expect(onReveal).toHaveBeenCalledWith('C:/p/a.py', 9);
    expect(onExplain).toHaveBeenCalledWith('C:/p/a.py', 4);
    expect(c.messages[1]).toEqual({ type: 'error', message: 'unsupported message' });

    expect(server.broadcastOpen('C:/p/a.py', 4)).toBe(1);
    await until(() => c.messages.length === 3);
    expect(c.messages[2]).toEqual({ type: 'open', file_path: 'C:/p/a.py', line: 4 });
    c.ws.close();
  });

  it('uses the next port when the preferred one is taken', async () => {
    const first = new BridgeServer({ token: 't', appVersion: '1', onReveal: vi.fn(), onExplain: vi.fn() });
    const taken = await first.start(0);
    server = new BridgeServer({ token: 't', appVersion: '1', onReveal: vi.fn(), onExplain: vi.fn() });
    try {
      expect(await server.start(taken)).toBe(taken + 1);
    } finally {
      await first.stop();
    }
  });
});
