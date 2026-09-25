import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeClient, RETRY_MS, type SocketLike } from './bridge-client';

class FakeSocket implements SocketLike {
  sent: string[] = [];
  closed = false;
  private handlers = new Map<string, Array<(...a: unknown[]) => void>>();
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  on(event: string, cb: (...a: unknown[]) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), cb]);
  }
  emit(event: string, ...args: unknown[]) {
    for (const cb of this.handlers.get(event) ?? []) cb(...args);
  }
}

let sockets: FakeSocket[];
let info: { port: number; token: string } | null;
const onOpen = vi.fn();
const onStatus = vi.fn();

function makeClient() {
  return new BridgeClient({
    readInfo: () => info,
    createSocket: (url) => {
      expect(url).toBe('ws://127.0.0.1:47101');
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
    onOpen,
    onStatus,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  sockets = [];
  info = { port: 47101, token: 'tok' };
});
afterEach(() => vi.useRealTimers());

describe('BridgeClient', () => {
  it('says hello, becomes connected and sends requests', () => {
    const c = makeClient();
    c.connect();
    expect(c.reveal('a.py', 1)).toBe(false);
    sockets[0].emit('open');
    expect(JSON.parse(sockets[0].sent[0])).toEqual({ type: 'hello', token: 'tok', client: 'vscode', version: '0.1.0' });
    sockets[0].emit('message', JSON.stringify({ type: 'welcome', app_version: '0.1.0' }));
    expect(onStatus).toHaveBeenLastCalledWith(true);
    expect(c.reveal('C:/p/a.py', 9)).toBe(true);
    expect(c.explain('C:/p/a.py', 4)).toBe(true);
    expect(sockets[0].sent.slice(1).map((s) => JSON.parse(s))).toEqual([
      { type: 'reveal', file_path: 'C:/p/a.py', line: 9 },
      { type: 'explain', file_path: 'C:/p/a.py', line: 4 },
    ]);
    sockets[0].emit('message', JSON.stringify({ type: 'open', file_path: 'C:/p/b.py', line: 3 }));
    expect(onOpen).toHaveBeenCalledWith('C:/p/b.py', 3);
  });

  it('retries with backoff when the app is not running or the connection drops', () => {
    info = null;
    const c = makeClient();
    c.connect();
    expect(sockets).toHaveLength(0);
    vi.advanceTimersByTime(RETRY_MS[0]);
    expect(sockets).toHaveLength(0);
    info = { port: 47101, token: 'tok' };
    vi.advanceTimersByTime(RETRY_MS[1]);
    expect(sockets).toHaveLength(1);
    sockets[0].emit('open');
    sockets[0].emit('message', JSON.stringify({ type: 'welcome' }));
    sockets[0].emit('close');
    expect(onStatus).toHaveBeenLastCalledWith(false);
    expect(c.reveal('a.py', 1)).toBe(false);
    vi.advanceTimersByTime(RETRY_MS[0]);
    expect(sockets).toHaveLength(2);
  });

  it('reconnects on request', () => {
    const c = makeClient();
    c.connect();
    sockets[0].emit('open');
    sockets[0].emit('message', JSON.stringify({ type: 'welcome' }));
    c.reconnect();
    expect(sockets[0].closed).toBe(true);
    expect(onStatus).toHaveBeenLastCalledWith(false);
    expect(sockets).toHaveLength(2);
    sockets[0].emit('close');
    vi.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(2);
  });

  it('stops everything on dispose', () => {
    const c = makeClient();
    c.connect();
    c.dispose();
    expect(sockets[0].closed).toBe(true);
    sockets[0].emit('close');
    vi.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(1);
  });
});
