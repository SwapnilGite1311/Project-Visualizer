import { useRef, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as THREE from 'three';
import type { ViewGraph } from '../../view/model';
import type { GraphRenderer, RendererEvent, RendererEventPayload } from '../../view/renderer-types';
import { SemanticZoom } from '../../view/semantic-zoom';
import { GraphScene, type SceneBridge, type SceneState } from './GraphScene';
import { screenShare, toScene } from './scene-data';

// An element counts as "filling the view" (so a few more wheel steps open it) once it covers this share of the map.
export const FILLS_VIEW = 0.32;

class SceneStore {
  private state: SceneState = { scene: null, selected: null, hovered: null, fitRequest: 0, focusRequest: 0, hint: null };
  private readonly listeners = new Set<() => void>();
  get = () => this.state;
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  set(patch: Partial<SceneState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
}

interface ViewProps {
  store: SceneStore;
  bridge: React.MutableRefObject<SceneBridge>;
  emit(event: RendererEvent, nodeId: string | null, at: { clientX: number; clientY: number }): void;
  onFitted(distance: number): void;
}

function R3fView({ store, bridge, emit, onFitted }: ViewProps) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const last = useRef<string | null>(null);
  return (
    <GraphScene
      state={state}
      bridge={bridge}
      onFitted={onFitted}
      onBackground={(at) => emit('backgroundClick', null, at)}
      onNode={(event, id, at) => {
        if (event === 'nodeHover') {
          if (id === last.current) return;
          last.current = id;
          store.set({ hovered: id });
        }
        emit(event, id, at);
      }}
    />
  );
}

// The new architecture's 3D view: React Three Fiber with instanced spheres, tube links with arrowheads, name chips,
// focus on hover/selection, positions from the engine's 3D force layout, and "zoom = abstraction" like the 2D view.
export class R3fRenderer implements GraphRenderer {
  private readonly store = new SceneStore();
  private readonly listeners = new Map<RendererEvent, Set<(p: RendererEventPayload) => void>>();
  private readonly bridge: React.MutableRefObject<SceneBridge> = {
    current: { camera: null, controls: null, size: { width: 1, height: 1 }, fitDistance: 0 },
  };
  private root: Root | null = null;
  private host: HTMLDivElement | null = null;
  private readonly semantic = new SemanticZoom(
    (event, nodeId, at) => this.emit(event, nodeId, at),
    (hint) => this.store.set({ hint }),
  );

  // Zoom = abstraction: 1 at the fitted view, larger when closer. Zooming toward an element that can open (the
  // wheel zooms toward the pointer) opens it once it is close; zooming far out goes up a level.
  private readonly onWheel = (e: WheelEvent) => {
    const { camera, controls, size, fitDistance } = this.bridge.current;
    const { scene, hovered } = this.store.get();
    if (!camera || !controls || !scene || fitDistance <= 0) return;
    const zoom = fitDistance / Math.max(1e-6, camera.position.distanceTo(controls.target));
    let target = null;
    const i = hovered ? scene.ids.indexOf(hovered) : -1;
    if (i >= 0) {
      const meta = scene.nodes[i];
      const dist = camera.position.distanceTo(new THREE.Vector3().fromArray(scene.positions, i * 3));
      const share = screenShare(meta.radius, dist, camera.fov, size.width / Math.max(1, size.height));
      target = { id: meta.id, label: meta.label, canOpen: meta.canOpen, fillsView: share >= FILLS_VIEW };
    }
    this.semantic.wheel(e, zoom, target);
  };

  mount(container: HTMLElement): void {
    const host = document.createElement('div');
    host.className = 'pv-r3f-root';
    host.dataset.renderer = 'r3f';
    host.style.cssText = 'position:absolute;inset:0;';
    container.appendChild(host);
    this.host = host;
    host.addEventListener('wheel', this.onWheel, { capture: true, passive: true });
    this.root = createRoot(host);
    this.root.render(<R3fView store={this.store} bridge={this.bridge} emit={(ev, id, at) => this.emit(ev, id, at)} onFitted={() => this.semantic.fitted(1)} />);
  }

  setGraph(graph: ViewGraph): void {
    const s = this.store.get();
    this.store.set({ scene: toScene(graph), hovered: null, fitRequest: s.fitRequest + 1 });
  }

  updateStyles(graph: ViewGraph): void {
    this.store.set({ scene: toScene(graph) });
  }

  select(nodeId: string | null): void {
    const s = this.store.get();
    if (nodeId === s.selected) return;
    this.store.set({ selected: nodeId, focusRequest: nodeId ? s.focusRequest + 1 : s.focusRequest });
  }

  fit(): void {
    this.store.set({ fitRequest: this.store.get().fitRequest + 1 });
  }

  on(event: RendererEvent, cb: (p: RendererEventPayload) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  destroy(): void {
    this.host?.removeEventListener('wheel', this.onWheel, { capture: true });
    this.semantic.dispose();
    const root = this.root;
    this.root = null;
    queueMicrotask(() => root?.unmount()); // R3F disposes geometries and the WebGL context on unmount
    this.host?.remove();
    this.host = null;
    this.listeners.clear();
  }

  /** Exposed for tests: the current scene state. */
  get state(): SceneState {
    return this.store.get();
  }

  private emit(event: RendererEvent, nodeId: string | null, e: { clientX: number; clientY: number }): void {
    const payload: RendererEventPayload = { nodeId, x: e.clientX, y: e.clientY };
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }
}
