import '@xyflow/react/dist/style.css';
import './rf2d.css';
import { ReactFlow, ReactFlowProvider, type ReactFlowInstance, type Viewport } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ViewGraph } from '../../view/model';
import type { GraphRenderer, RendererEvent, RendererEventPayload } from '../../view/renderer-types';
import { SemanticZoom, type ZoomHint } from '../../view/semantic-zoom';
import { FlowEdge, FlowParticles } from './FlowEdge';
import { PvNode } from './PvNode';
import { type PvFlowEdge, type PvFlowNode, toFlow } from './rf-elements';

// Fitting a tiny level must not zoom in so far that boxes become huge (same rule as the Cytoscape view).
export const MAX_FIT_ZOOM = 1.5;

const nodeTypes = { pv: PvNode };
const edgeTypes = { flow: FlowEdge };

interface State {
  graph: ViewGraph | null;
  selected: string | null;
  fitRequest: number; // bumped to ask the view to fit
  hint: ZoomHint | null; // semantic zoom: what keeps zooming will do
}

// A tiny external store: the imperative GraphRenderer API writes, the React view reads.
class RendererStore {
  private state: State = { graph: null, selected: null, fitRequest: 0, hint: null };
  private readonly listeners = new Set<() => void>();
  get = () => this.state;
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  set(patch: Partial<State>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
}

interface ViewProps {
  store: RendererStore;
  emit(event: RendererEvent, nodeId: string | null, e: { clientX: number; clientY: number }): void;
  onUserMove(): void;
  onReady(instance: ReactFlowInstance<PvFlowNode, PvFlowEdge>): void;
  onFitted(zoom: number): void;
}

function RfView({ store, emit, onUserMove, onReady, onFitted }: ViewProps) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const { nodes, edges } = useMemo(
    () => (state.graph ? toFlow(state.graph, state.selected) : { nodes: [], edges: [] }),
    [state.graph, state.selected],
  );
  const instance = useRef<ReactFlowInstance<PvFlowNode, PvFlowEdge> | null>(null);
  const moveStart = useRef<Viewport | null>(null);
  const init = useCallback(
    (i: ReactFlowInstance<PvFlowNode, PvFlowEdge>) => {
      instance.current = i;
      onReady(i);
    },
    [onReady],
  );
  // Fit only when asked (new level, resize, Ctrl+0) — never on overlay updates, so a user's zoom stays.
  useEffect(() => {
    if (state.fitRequest === 0) return;
    const run = () => {
      const i = instance.current;
      if (!i) return;
      void i.fitView({ padding: 0.12, maxZoom: MAX_FIT_ZOOM }).then(() => onFitted(i.getZoom()));
    };
    if (typeof requestAnimationFrame === 'function') {
      const handle = requestAnimationFrame(run); // after React Flow has placed the new nodes
      return () => cancelAnimationFrame(handle);
    }
    run();
  }, [state.fitRequest, onFitted]);

  return (
    <ReactFlow<PvFlowNode, PvFlowEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onInit={init}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      onlyRenderVisibleElements
      minZoom={0.05}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(e, n) => emit('nodeClick', n.id, e)}
      onNodeDoubleClick={(e, n) => emit('nodeDoubleClick', n.id, e)}
      onNodeContextMenu={(e, n) => {
        e.preventDefault();
        emit('nodeContext', n.id, e);
      }}
      onNodeMouseEnter={(e, n) => emit('nodeHover', n.id, e)}
      onNodeMouseLeave={(e) => emit('nodeHover', null, e)}
      onPaneClick={(e) => emit('backgroundClick', null, e)}
      onMoveStart={(e, vp) => {
        moveStart.current = e ? vp : null; // null event = a programmatic move such as fitView
      }}
      onMoveEnd={(e, vp) => {
        const from = moveStart.current;
        moveStart.current = null;
        // A click also starts a "move"; only a real pan or zoom by the user keeps the view on resize.
        if (e && from && (Math.abs(from.x - vp.x) > 1 || Math.abs(from.y - vp.y) > 1 || Math.abs(from.zoom - vp.zoom) > 1e-3)) {
          onUserMove();
        }
      }}
      zoomOnDoubleClick={false}
    >
      <FlowParticles />
      {state.hint && (
        <div className="pv-rf-zoom-hint" role="status" style={{ left: state.hint.x + 14, top: state.hint.y + 14 }}>
          {state.hint.text}
        </div>
      )}
    </ReactFlow>
  );
}

// The new architecture's 2D view: React Flow for nodes and interaction, D3 for edge curves and flow particles,
// positions from the engine (layout.compute).
export class RfRenderer implements GraphRenderer {
  private readonly store = new RendererStore();
  private readonly listeners = new Map<RendererEvent, Set<(p: RendererEventPayload) => void>>();
  private root: Root | null = null;
  private host: HTMLDivElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private userMoved = false;
  private instance: ReactFlowInstance<PvFlowNode, PvFlowEdge> | null = null;
  private readonly semantic = new SemanticZoom(
    (event, nodeId, at) => this.emit(event, nodeId, at),
    (hint) => this.store.set({ hint }),
  );
  // Zoom = abstraction: watch the wheel (without taking it from React Flow) to open or leave levels.
  private readonly onWheel = (e: WheelEvent) => {
    const host = this.host;
    if (!host || !this.instance) return;
    const el = (e.target as Element | null)?.closest?.('.react-flow__node');
    const id = el?.getAttribute('data-id') ?? null;
    const node = id ? this.store.get().graph?.nodes.find((n) => n.id === id) : undefined;
    let target = null;
    if (el && node) {
      const r = el.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      target = { id: node.id, label: node.label, canOpen: node.hasChildren, fillsView: r.width >= h.width * 0.4 || r.height >= h.height * 0.4 };
    }
    this.semantic.wheel(e, this.instance.getZoom(), target);
  };

  mount(container: HTMLElement): void {
    const host = document.createElement('div');
    host.className = 'pv-rf-root';
    host.dataset.renderer = 'rf2d';
    container.appendChild(host);
    this.host = host;
    host.addEventListener('wheel', this.onWheel, { capture: true, passive: true });
    this.root = createRoot(host);
    this.root.render(
      <ReactFlowProvider>
        <RfView
          store={this.store}
          emit={(event, nodeId, e) => this.emit(event, nodeId, e)}
          onUserMove={() => (this.userMoved = true)}
          onReady={(i) => (this.instance = i)}
          onFitted={this.onFitted}
        />
      </ReactFlowProvider>,
    );
    if (typeof ResizeObserver !== 'undefined') {
      // Window size, dragged dividers and the bottom panel change the map area: fit again unless the user moved.
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.userMoved) this.requestFit();
      });
      this.resizeObserver.observe(container);
    }
  }

  setGraph(graph: ViewGraph): void {
    this.userMoved = false;
    this.store.set({ graph });
    this.requestFit();
  }

  updateStyles(graph: ViewGraph): void {
    this.store.set({ graph });
  }

  select(nodeId: string | null): void {
    this.store.set({ selected: nodeId });
  }

  fit(): void {
    this.userMoved = false;
    this.requestFit();
  }

  on(event: RendererEvent, cb: (p: RendererEventPayload) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  destroy(): void {
    this.host?.removeEventListener('wheel', this.onWheel, { capture: true });
    this.semantic.dispose();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    const root = this.root;
    this.root = null;
    // Unmount after the current render pass (React warns when unmounting during one).
    queueMicrotask(() => root?.unmount());
    this.host?.remove();
    this.host = null;
    this.instance = null;
    this.listeners.clear();
  }

  /** Exposed for tests and real-app checks: the React Flow instance (null until the view is ready). */
  get flow(): ReactFlowInstance<PvFlowNode, PvFlowEdge> | null {
    return this.instance;
  }

  private readonly onFitted = (zoom: number) => this.semantic.fitted(zoom);

  private requestFit(): void {
    this.store.set({ fitRequest: this.store.get().fitRequest + 1 });
  }

  private emit(event: RendererEvent, nodeId: string | null, e: { clientX: number; clientY: number }): void {
    const payload: RendererEventPayload = { nodeId, x: e.clientX, y: e.clientY };
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }
}
