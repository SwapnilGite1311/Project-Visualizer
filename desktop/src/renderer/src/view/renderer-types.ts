import type { ViewGraph } from './model';

export type RendererEvent = 'nodeClick' | 'nodeDoubleClick' | 'nodeHover' | 'nodeContext' | 'backgroundClick';
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
export interface RendererEntry { mode: '2d' | '3d'; create: () => GraphRenderer }
