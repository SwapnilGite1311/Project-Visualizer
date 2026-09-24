import type { AiProviderFactory } from './types';

export interface ProviderModule { provider?: AiProviderFactory }

const discovered = import.meta.glob<ProviderModule>(['../ai-providers/*/index.ts'], { eager: true });

export function listProviders(modules: Record<string, ProviderModule> = discovered): AiProviderFactory[] {
  return Object.values(modules)
    .map((m) => m.provider)
    .filter((p): p is AiProviderFactory => p !== undefined)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function getProvider(id: string, modules?: Record<string, ProviderModule>): AiProviderFactory | undefined {
  return listProviders(modules).find((p) => p.id === id);
}
