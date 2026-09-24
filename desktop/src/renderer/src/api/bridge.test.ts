// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { ApiError, invoke, onEngineNotification, onMainEvent, rpc } from './bridge';
import { installFakeBridge } from './fake-bridge';

describe('api bridge', () => {
  it('unwraps ok envelopes', async () => {
    const fake = installFakeBridge();
    fake.rpcHandlers.set('engine.ping', () => ({ protocol: 1 }));
    await expect(rpc('engine.ping')).resolves.toEqual({ protocol: 1 });
    fake.invokeHandlers.set('pv:app.info', () => ({ version: '0.1.0' }));
    await expect(invoke('pv:app.info')).resolves.toEqual({ version: '0.1.0' });
  });

  it('throws ApiError with the code for error envelopes', async () => {
    const fake = installFakeBridge();
    fake.rpcHandlers.set('graph.node', () => {
      throw Object.assign(new Error('node not found: x'), { code: -32002 });
    });
    const err = await rpc('graph.node').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(-32002);
    expect((err as ApiError).message).toBe('node not found: x');
  });

  it('filters engine notifications by method', () => {
    const fake = installFakeBridge();
    const cb = vi.fn();
    const off = onEngineNotification('project.progress', cb);
    fake.emitNotification('other.thing', {});
    fake.emitNotification('project.progress', { files_done: 2 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ files_done: 2 });
    off();
    fake.emitNotification('project.progress', {});
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('subscribes to main events', () => {
    const fake = installFakeBridge();
    const cb = vi.fn();
    onMainEvent('pv:engine.status', cb);
    fake.emitEvent('pv:engine.status', { status: 'ready' });
    expect(cb).toHaveBeenCalledWith({ status: 'ready' });
  });
});
