import { afterEach, describe, expect, it, vi } from 'vitest';
import { EngineClient, type EngineTransport } from './engine-client';
import { encodeMessage, FrameDecoder } from './framing';
import { RpcError } from './json-rpc';

class FakeTransport implements EngineTransport {
  writes: Array<{ id: number; method: string; params: unknown }> = [];
  private cb: ((chunk: Buffer) => void) | null = null;
  private readonly decoder = new FrameDecoder();

  write(data: Buffer): void {
    for (const text of this.decoder.push(data)) this.writes.push(JSON.parse(text));
  }
  onData(cb: (chunk: Buffer) => void): void {
    this.cb = cb;
  }
  feed(obj: unknown): void {
    this.cb?.(encodeMessage(JSON.stringify(obj)));
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('EngineClient', () => {
  it('resolves a request with its result', async () => {
    const t = new FakeTransport();
    const client = new EngineClient(t);
    const p = client.request('engine.ping');
    expect(t.writes[0]).toMatchObject({ id: 1, method: 'engine.ping', params: {} });
    t.feed({ jsonrpc: '2.0', id: 1, result: { protocol: 1 } });
    await expect(p).resolves.toEqual({ protocol: 1 });
  });

  it('rejects with RpcError on an error response', async () => {
    const t = new FakeTransport();
    const client = new EngineClient(t);
    const p = client.request('graph.node', { node_id: 'x' });
    t.feed({ jsonrpc: '2.0', id: 1, error: { code: -32002, message: 'node not found: x' } });
    await expect(p).rejects.toBeInstanceOf(RpcError);
    await expect(p).rejects.toMatchObject({ code: -32002 });
  });

  it('delivers notifications to every listener until unsubscribed', () => {
    const t = new FakeTransport();
    const client = new EngineClient(t);
    const a = vi.fn();
    const b = vi.fn();
    const offA = client.onNotification(a);
    client.onNotification(b);
    t.feed({ jsonrpc: '2.0', method: 'project.progress', params: { files_done: 1 } });
    expect(a).toHaveBeenCalledWith('project.progress', { files_done: 1 });
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    t.feed({ jsonrpc: '2.0', method: 'project.progress', params: {} });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('times out', async () => {
    vi.useFakeTimers();
    const client = new EngineClient(new FakeTransport(), { timeoutMs: 100 });
    const p = client.request('slow.method');
    vi.advanceTimersByTime(101);
    await expect(p).rejects.toThrow('engine request timed out: slow.method');
  });

  it('fails all pending requests', async () => {
    const client = new EngineClient(new FakeTransport());
    const p1 = client.request('a');
    const p2 = client.request('b');
    client.failAll('engine stopped');
    await expect(p1).rejects.toThrow('engine stopped');
    await expect(p2).rejects.toThrow('engine stopped');
  });

  it('ignores unknown ids and invalid JSON', async () => {
    const t = new FakeTransport();
    const client = new EngineClient(t);
    const p = client.request('a');
    t.feed({ jsonrpc: '2.0', id: 99, result: 1 });
    (t as unknown as { cb: (c: Buffer) => void }).cb(encodeMessage('not json'));
    t.feed({ jsonrpc: '2.0', id: 1, result: 'ok' });
    await expect(p).resolves.toBe('ok');
  });
});
