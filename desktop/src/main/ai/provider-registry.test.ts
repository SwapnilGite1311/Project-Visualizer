import { describe, expect, it } from 'vitest';
import { getProvider, listProviders } from './provider-registry';
import type { AiProviderFactory } from './types';

const factory = (id: string): AiProviderFactory => ({
  id,
  label: id,
  needsApiKey: false,
  defaultModel: 'm',
  defaultBaseUrl: 'http://x',
  create: () => ({ id, complete: async () => ({ text: '', model: 'm' }) }),
});

describe('provider registry', () => {
  const modules = {
    '../ai-providers/zeta/index.ts': { provider: factory('zeta') },
    '../ai-providers/alpha/index.ts': { provider: factory('alpha') },
    '../ai-providers/empty/index.ts': {},
  };

  it('lists providers sorted by id and skips modules without one', () => {
    expect(listProviders(modules).map((p) => p.id)).toEqual(['alpha', 'zeta']);
  });

  it('finds a provider by id', () => {
    expect(getProvider('zeta', modules)?.id).toBe('zeta');
    expect(getProvider('nope', modules)).toBeUndefined();
  });

  it('discovers the built-in providers', () => {
    expect(listProviders().map((p) => p.id)).toEqual(['anthropic', 'openai']);
  });
});
