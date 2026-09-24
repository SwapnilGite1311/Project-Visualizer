import type { RendererEntry } from './renderer-types';

type RendererModule = { renderer?: RendererEntry };

const discovered = import.meta.glob<RendererModule>('../renderers/*/index.ts', { eager: true });

export function listRenderers(modules: Record<string, RendererModule> = discovered): RendererEntry[] {
  return Object.keys(modules)
    .sort()
    .map((path) => modules[path].renderer)
    .filter((r): r is RendererEntry => r !== undefined);
}

export function getRenderer(mode: '2d' | '3d', modules: Record<string, RendererModule> = discovered): RendererEntry | undefined {
  return listRenderers(modules).find((r) => r.mode === mode);
}
