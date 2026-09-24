import type { ForceGraph3DInstance } from '3d-force-graph';
import type { ViewGraph } from '../../view/model';
import type { GraphRenderer, RendererEvent, RendererEventPayload } from '../../view/renderer-types';
import { type FgLink, type FgNode, toGraphData } from './fg-data';

const SELECTED_COLOR = '#fbbf24';
const DOUBLE_CLICK_MS = 300;

type Graph = ForceGraph3DInstance<FgNode, FgLink>;
type Listener = (p: RendererEventPayload) => void;

export class Fg3dRenderer implements GraphRenderer {
  private graph: Graph | null = null;
  // The graph that setGraph received before the library finished loading.
  private pending: ViewGraph | null = null;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;
  private container: HTMLElement | null = null;
  private listeners = new Map<RendererEvent, Set<Listener>>();
  private selectedId: string | null = null;
  private lastClick: { id: string; time: number } | null = null;
  // Hover callbacks carry no mouse event, so the last pointer position is tracked separately.
  private pointer = { x: 0, y: 0 };
  private onPointerMove = (e: MouseEvent) => {
    this.pointer = { x: e.clientX, y: e.clientY };
  };

  // 3d-force-graph reads `window` at import time, so it is loaded only when a 3D view is mounted.
  mount(container: HTMLElement): void {
    this.container = container;
    container.addEventListener('mousemove', this.onPointerMove);
    void import('3d-force-graph').then(({ default: ForceGraph3D }) => {
      if (!this.destroyed) this.create(new ForceGraph3D(container) as unknown as Graph, container);
    });
  }

  private create(graph: Graph, container: HTMLElement): void {
    graph
      .width(container.clientWidth || 800)
      .height(container.clientHeight || 600)
      .backgroundColor('#0f1320')
      .nodeLabel((n) => n.name + (n.badge ? ' [' + n.badge + ']' : ''))
      .nodeVal((n) => n.val)
      .nodeOpacity(0.9)
      .linkWidth((l) => l.width)
      .linkDirectionalArrowLength(3)
      .linkDirectionalParticles((l) => (l.animated ? 4 : 0))
      .onNodeClick((n, e) => this.handleClick(n, e))
      .onNodeRightClick((n, e) => this.emit('nodeContext', { nodeId: n.id, x: e.clientX, y: e.clientY }))
      .onNodeHover((n) => this.emit('nodeHover', { nodeId: n ? n.id : null, ...this.pointer }))
      .onBackgroundClick((e) => this.emit('backgroundClick', { nodeId: null, x: e.clientX, y: e.clientY }));
    this.graph = graph;
    this.applyColors();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (container.clientWidth && container.clientHeight) graph.width(container.clientWidth).height(container.clientHeight);
      });
      this.resizeObserver.observe(container);
    }
    if (this.pending) {
      this.setGraph(this.pending);
      this.fit();
    }
  }

  setGraph(g: ViewGraph): void {
    if (!this.graph) {
      this.pending = g;
      return;
    }
    this.pending = null;
    this.graph.graphData(toGraphData(g));
  }

  updateStyles(g: ViewGraph): void {
    if (!this.graph) {
      this.pending = g;
      return;
    }
    const fresh = toGraphData(g);
    const nodes = new Map(fresh.nodes.map((n) => [n.id, n]));
    const links = new Map(fresh.links.map((l) => [l.id, l]));
    const current = this.graph.graphData();
    for (const n of current.nodes) {
      const f = nodes.get(n.id);
      if (f) Object.assign(n, { color: f.color, val: f.val, opacity: f.opacity, badge: f.badge, name: f.name });
    }
    for (const l of current.links) {
      const f = links.get(l.id);
      if (f) Object.assign(l, { color: f.color, width: f.width, animated: f.animated });
    }
    this.applyColors();
    this.graph.nodeVal(this.graph.nodeVal()).linkWidth(this.graph.linkWidth());
  }

  select(nodeId: string | null): void {
    this.selectedId = nodeId;
    this.applyColors();
  }

  fit(): void {
    this.graph?.zoomToFit(400);
  }

  on(event: RendererEvent, cb: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.container?.removeEventListener('mousemove', this.onPointerMove);
    this.graph?._destructor();
    if (this.container) this.container.innerHTML = '';
    this.graph = null;
    this.container = null;
    this.listeners.clear();
  }

  private handleClick(n: FgNode, e: MouseEvent): void {
    const now = Date.now();
    const p = { nodeId: n.id, x: e.clientX, y: e.clientY };
    if (this.lastClick && this.lastClick.id === n.id && now - this.lastClick.time < DOUBLE_CLICK_MS) {
      this.lastClick = null;
      this.emit('nodeDoubleClick', p);
      return;
    }
    this.lastClick = { id: n.id, time: now };
    this.emit('nodeClick', p);
  }

  // Re-setting the accessors makes the library re-read the colors.
  private applyColors(): void {
    this.graph?.nodeColor((n) => (n.id === this.selectedId ? SELECTED_COLOR : n.color)).linkColor((l) => l.color);
  }

  private emit(event: RendererEvent, p: RendererEventPayload): void {
    this.listeners.get(event)?.forEach((cb) => cb(p));
  }
}
