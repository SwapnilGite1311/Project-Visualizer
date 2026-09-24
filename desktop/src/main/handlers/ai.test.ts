import { describe, expect, it } from 'vitest';
import { fakeContext } from '../core/test-context';
import type { EngineService } from '../engine/engine-service';
import type { SecretStore } from '../core/secret-store';
import type { SettingsStore } from '../core/settings-store';
import register from './ai';

describe('ai handlers', () => {
  it('registers the channels and lists both built-in providers', async () => {
    const ctx = fakeContext({
      engine: {} as EngineService,
      settings: { get: <T,>(_k: string, f: T) => f } as unknown as SettingsStore,
      secrets: { get: () => null } as unknown as SecretStore,
    });
    register(ctx);
    expect([...ctx.handlers.keys()].sort()).toEqual(['pv:ai.explainNode', 'pv:ai.providers', 'pv:ai.testConnection']);
    const providers = (await ctx.call('pv:ai.providers')) as { id: string; needsApiKey: boolean }[];
    expect(providers.map((p) => p.id)).toEqual(['anthropic', 'openai']);
    expect(providers[0].needsApiKey).toBe(true);
  });

  it('validates explainNode params', async () => {
    const ctx = fakeContext({
      engine: {} as EngineService,
      settings: { get: <T,>(_k: string, f: T) => f } as unknown as SettingsStore,
      secrets: { get: () => null } as unknown as SecretStore,
    });
    register(ctx);
    await expect(ctx.call('pv:ai.explainNode', {})).rejects.toThrow('project_id and node_id are required');
  });
});
