import type { ViewGraph } from './model';

// zoomIn / zoomOut: the user keeps zooming past the level ("zoom = abstraction"): zoomIn carries the element under the
// pointer to open, zoomOut asks to go up one level. Renderers emit them; Canvas decides what to open.
export type RendererEvent = 'nodeClick' | 'nodeDoubleClick' | 'nodeHover' | 'nodeContext' | 'backgroundClick' | 'zoomIn' | 'zoomOut';
export interface RendererEventPayload { nodeId: string | null; x: number; y: number } // x,y = client (page) coordinates
export interface GraphRenderer {
  mount(container: HTMLElement): void;
  setGraph(graph: ViewGraph): void; // replace everything and run layout
  updateStyles(graph: ViewGraph): void; // same ids; update visual fields only; no layout
  select(nodeId: string | null): void;
  fit(): void;
  on(event: RendererEvent, cb: (p: RendererEventPayload) => void): () => void;
  destroy(): void;
}
export interface RendererEntry {
  mode: '2d' | '3d';
  create: () => GraphRenderer;
  id?: string; // default: the renderer's folder name
  label?: string; // shown in Settings → Graph view
  preferred?: boolean; // the default for its mode when the user chose nothing
  layout?: 'renderer' | 'engine'; // 'engine' = positions come from layout.compute in ViewGraph.positions
}
