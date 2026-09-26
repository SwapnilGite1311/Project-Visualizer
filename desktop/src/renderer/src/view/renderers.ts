import type { RendererEntry } from './renderer-types';

type RendererModule = { renderer?: RendererEntry };

const discovered = import.meta.glob<RendererModule>('../renderers/*/index.ts', { eager: true });

// Every discovered renderer, with its id filled in from the folder name when it has none.
export function listRenderers(modules: Record<string, RendererModule> = discovered): RendererEntry[] {
  return Object.keys(modules)
    .sort()
    .map((path) => {
      const entry = modules[path].renderer;
      if (!entry) return undefined;
      const folder = /renderers\/([^/]+)\/index\.ts$/.exec(path)?.[1] ?? path;
      return { ...entry, id: entry.id ?? folder };
    })
    .filter((r): r is RendererEntry & { id: string } => r !== undefined);
}

// The renderer for a mode: the user's choice (by id) if it exists, else the preferred one, else the first.
export function getRenderer(
  mode: '2d' | '3d',
  modules: Record<string, RendererModule> = discovered,
  choice?: string,
): RendererEntry | undefined {
  const forMode = listRenderers(modules).filter((r) => r.mode === mode);
  return forMode.find((r) => choice && r.id === choice) ?? forMode.find((r) => r.preferred) ?? forMode[0];
}
