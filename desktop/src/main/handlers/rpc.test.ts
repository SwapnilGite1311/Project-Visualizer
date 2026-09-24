import { describe, expect, it, vi } from 'vitest';
import type { EngineService } from '../engine/engine-service';
import { fakeContext } from '../core/test-context';
import register from './rpc';

describe('pv:rpc', () => {
  it('forwards method and params to the engine', async () => {
    const request = vi.fn(async () => ({ ok: 1 }));
    const ctx = fakeContext({ engine: { request } as unknown as EngineService });
    register(ctx);
    await expect(ctx.call('pv:rpc', { method: 'graph.node', params: { node_id: 'x' } })).resolves.toEqual({ ok: 1 });
    expect(request).toHaveBeenCalledWith('graph.node', { node_id: 'x' });
  });

  it('requires a method', async () => {
    const ctx = fakeContext({ engine: {} as EngineService });
    register(ctx);
    await expect(ctx.call('pv:rpc', {})).rejects.toThrow('method is required');
  });
});
