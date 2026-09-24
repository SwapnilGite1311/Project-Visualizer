import { describe, expect, it } from 'vitest';
import { RpcError } from '../engine/json-rpc';
import type { EngineService } from '../engine/engine-service';
import type { SecretStore } from './secret-store';
import type { SettingsStore } from './settings-store';
import { createMainContext, type IpcMainLike, toEnvelope } from './context';

describe('toEnvelope', () => {
  it('wraps success', async () => {
    await expect(toEnvelope((p) => (p as number) + 1)(1)).resolves.toEqual({ ok: true, value: 2 });
  });

  it('wraps errors and keeps a numeric code', async () => {
    const env = await toEnvelope(() => {
      throw new RpcError(-32002, 'node not found: x');
    })(null);
    expect(env).toEqual({ ok: false, error: { code: -32002, message: 'node not found: x' } });
    const plain = await toEnvelope(async () => {
      throw new Error('boom');
    })(null);
    expect(plain).toEqual({ ok: false, error: { code: 'error', message: 'boom' } });
  });
});

describe('createMainContext', () => {
  function make() {
    const handlers = new Map<string, (event: unknown, payload: unknown) => unknown>();
    const ipc: IpcMainLike = { handle: (channel, listener) => handlers.set(channel, listener) };
    const ctx = createMainContext({
      ipc,
      engine: {} as EngineService,
      settings: {} as SettingsStore,
      secrets: {} as SecretStore,
      log: () => undefined,
      getWindow: () => null,
    });
    return { ctx, handlers };
  }

  it('registers handlers that return envelopes', async () => {
    const { ctx, handlers } = make();
    ctx.handle('pv:test.echo', (p) => p);
    await expect(handlers.get('pv:test.echo')!({}, 'hi')).resolves.toEqual({ ok: true, value: 'hi' });
  });

  it('rejects channels without the pv: prefix', () => {
    const { ctx } = make();
    expect(() => ctx.handle('bad', () => 1)).toThrow('channel must start with pv:');
  });

  it('send does nothing without a window', () => {
    const { ctx } = make();
    expect(() => ctx.send('pv:x', 1)).not.toThrow();
  });
});
