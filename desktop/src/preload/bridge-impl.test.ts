import { describe, expect, it, vi } from 'vitest';
import { CHANNEL_NOTIFICATION, CHANNEL_RPC } from '../shared/bridge';
import { createBridge, type IpcLike } from './bridge-impl';

type Listener = (event: unknown, ...args: unknown[]) => void;

class FakeIpc implements IpcLike {
  invoke = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ ok: true, value: 'done' }));
  listeners = new Map<string, Set<Listener>>();
  on(channel: string, listener: Listener): void {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(listener);
  }
  removeListener(channel: string, listener: Listener): void {
    this.listeners.get(channel)?.delete(listener);
  }
  emit(channel: string, ...args: unknown[]): void {
    for (const l of this.listeners.get(channel) ?? []) l({}, ...args);
  }
}

describe('createBridge', () => {
  it('rpc forwards to the rpc channel', async () => {
    const ipc = new FakeIpc();
    await createBridge(ipc).rpc('engine.ping', { a: 1 });
    expect(ipc.invoke).toHaveBeenCalledWith(CHANNEL_RPC, { method: 'engine.ping', params: { a: 1 } });
  });

  it('invoke only allows pv: channels', async () => {
    const ipc = new FakeIpc();
    const bridge = createBridge(ipc);
    await expect(bridge.invoke('evil')).resolves.toEqual({
      ok: false,
      error: { code: 'bad_channel', message: 'channel must start with pv:' },
    });
    expect(ipc.invoke).not.toHaveBeenCalled();
    await bridge.invoke('pv:app.info', 1);
    expect(ipc.invoke).toHaveBeenCalledWith('pv:app.info', 1);
  });

  it('onNotification delivers method and params until removed', () => {
    const ipc = new FakeIpc();
    const cb = vi.fn();
    const off = createBridge(ipc).onNotification(cb);
    ipc.emit(CHANNEL_NOTIFICATION, { method: 'project.progress', params: { n: 1 } });
    expect(cb).toHaveBeenCalledWith('project.progress', { n: 1 });
    off();
    ipc.emit(CHANNEL_NOTIFICATION, { method: 'x', params: {} });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('on subscribes to pv: channels only', () => {
    const ipc = new FakeIpc();
    const bridge = createBridge(ipc);
    expect(() => bridge.on('other', () => undefined)).toThrow('channel must start with pv:');
    const cb = vi.fn();
    const off = bridge.on('pv:engine.status', cb);
    ipc.emit('pv:engine.status', { status: 'ready' });
    expect(cb).toHaveBeenCalledWith({ status: 'ready' });
    off();
    ipc.emit('pv:engine.status', { status: 'crashed' });
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
