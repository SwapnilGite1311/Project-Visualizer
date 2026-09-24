import { describe, expect, it, vi } from 'vitest';
import type { EngineService } from '../engine/engine-service';
import { fakeContext } from '../core/test-context';
import register from './app';

vi.mock('electron', () => ({ app: { getVersion: () => '0.1.0' } }));

describe('app handlers', () => {
  it('reports app and engine info', async () => {
    const ctx = fakeContext({ engine: { status: 'ready', path: 'C:/pv-engine.exe' } as unknown as EngineService });
    register(ctx);
    await expect(ctx.call('pv:app.info')).resolves.toEqual({
      version: '0.1.0',
      platform: process.platform,
      engineStatus: 'ready',
      enginePath: 'C:/pv-engine.exe',
    });
  });

  it('restarts the engine', async () => {
    const stop = vi.fn(async () => undefined);
    const start = vi.fn(async () => undefined);
    const ctx = fakeContext({ engine: { stop, start } as unknown as EngineService });
    register(ctx);
    await expect(ctx.call('pv:engine.restart')).resolves.toBe(true);
    expect(stop).toHaveBeenCalled();
    expect(start).toHaveBeenCalled();
  });
});
