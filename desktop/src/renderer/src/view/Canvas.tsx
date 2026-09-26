import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../core/store';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { canvasBus } from './canvas-bus';
import { buildViewGraph, type ViewGraph } from './model';
import { NodeContextMenu } from './NodeContextMenu';
import type { GraphRenderer } from './renderer-types';
import { getRenderer } from './renderers';
import { useLevelView } from './use-level-view';
import { useViewPrefs } from './view-prefs';

export interface CanvasProps { rendererFactory?: (mode: '2d' | '3d') => GraphRenderer | undefined }

export function Canvas({ rendererFactory }: CanvasProps) {
  const viewMode = useAppStore((s) => s.viewMode);
  const overlays = useAppStore((s) => s.overlays);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const choice = useViewPrefs((s) => (viewMode === '2d' ? s.renderer2d : s.renderer3d));
  useEffect(() => {
    void useViewPrefs.getState().load();
  }, []);
  // The renderer for this mode (Settings → Graph view); a factory passed in (tests) wins.
  const entry = useMemo(() => (rendererFactory ? undefined : getRenderer(viewMode, undefined, choice)), [rendererFactory, viewMode, choice]);
  const factory = useMemo(() => rendererFactory ?? (() => entry?.create()), [rendererFactory, entry]);
  const { view, layout, loading, error, reload } = useLevelView(entry?.layout === 'engine' ? viewMode : null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const graphRef = useRef<ViewGraph | null>(null);
  const shownViewRef = useRef<unknown>(null);
  const [hasRenderer, setHasRenderer] = useState(true);
  const [menu, setMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);

  // Create the renderer for the current mode.
  useEffect(() => {
    const container = containerRef.current;
    const renderer = factory(viewMode);
    setHasRenderer(Boolean(renderer));
    if (!renderer || !container) return;
    renderer.mount(container);
    rendererRef.current = renderer;
    shownViewRef.current = null;
    const store = useAppStore.getState;
    const offs = [
      renderer.on('nodeClick', (p) => store().select(p.nodeId)),
      renderer.on('nodeDoubleClick', (p) => {
        const node = graphRef.current?.nodes.find((n) => n.id === p.nodeId);
        if (node?.hasChildren) store().setParent(node.id);
      }),
      renderer.on('nodeHover', (p) => store().hover(p.nodeId)),
      renderer.on('nodeContext', (p) => {
        if (p.nodeId) setMenu({ nodeId: p.nodeId, x: p.x, y: p.y });
      }),
      renderer.on('backgroundClick', () => {
        store().select(null);
        setMenu(null);
      }),
    ];
    canvasBus.fit = () => renderer.fit();
    return () => {
      offs.forEach((off) => off());
      canvasBus.fit = () => {};
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [viewMode, factory]);

  // New level → full redraw; overlay change only → style update.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !view) return;
    const graph = buildViewGraph(view, overlays);
    if (layout) {
      graph.positions = layout.positions;
      graph.edgePoints = layout.edges;
    }
    graphRef.current = graph;
    if (shownViewRef.current !== view) {
      shownViewRef.current = view;
      renderer.setGraph(graph);
      renderer.select(useAppStore.getState().selectedNodeId);
    } else {
      renderer.updateStyles(graph);
    }
  }, [view, layout, overlays, viewMode, factory]);

  useEffect(() => {
    rendererRef.current?.select(selectedNodeId);
  }, [selectedNodeId]);

  const menuNode = menu ? graphRef.current?.nodes.find((n) => n.id === menu.nodeId)?.data : undefined;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} data-testid="canvas-container" style={{ position: 'absolute', inset: 0 }} />
      {!hasRenderer && (
        <Overlaid>
          <EmptyState title={`No renderer available for ${viewMode}`} />
        </Overlaid>
      )}
      {loading && !view && (
        <Overlaid>
          <Spinner />
        </Overlaid>
      )}
      {error && (
        <Overlaid>
          <EmptyState
            title="Could not load this level"
            detail={error}
            action={
              <Button size="sm" onClick={reload}>
                Retry
              </Button>
            }
          />
        </Overlaid>
      )}
      {view && !error && view.nodes.length === 0 && (
        <Overlaid>
          <EmptyState
            title="Nothing inside this element"
            action={
              <Button size="sm" onClick={() => useAppStore.getState().setParent(view.parent.parent_id || 'project:')}>
                Go up
              </Button>
            }
          />
        </Overlaid>
      )}
      {menu && menuNode && <NodeContextMenu node={menuNode} x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
    </div>
  );
}

function Overlaid({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto' }}>{children}</div>
    </div>
  );
}
