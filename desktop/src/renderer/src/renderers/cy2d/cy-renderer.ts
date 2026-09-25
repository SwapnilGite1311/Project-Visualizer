import cytoscape, { type Core, type EventObject, type LayoutOptions } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { ViewGraph } from '../../view/model';
import type { GraphRenderer, RendererEvent, RendererEventPayload } from '../../view/renderer-types';
import { toElements } from './cy-elements';
import { buildStylesheet } from './cy-style';

// Fitting a small level (1-3 nodes) would zoom to maxZoom, where nodes and labels become huge.
// Fit, then never stay above this zoom.
export const MAX_FIT_ZOOM = 1.5;

export function fitCapped(cy: Core): void {
  cy.fit(undefined, 40);
  if (cy.zoom() > MAX_FIT_ZOOM) {
    cy.zoom(MAX_FIT_ZOOM);
    cy.center();
  }
}

let dagreRegistered = false;
function ensureDagre(): void {
  if (dagreRegistered) return;
  cytoscape.use(dagre);
  dagreRegistered = true;
}

export class CyRenderer implements GraphRenderer {
  private cy: Core | null = null;
  private container: HTMLElement | null = null;
  private readonly listeners = new Map<RendererEvent, Set<(p: RendererEventPayload) => void>>();
  private animationFrame: number | null = null;
  private dashOffset = 0;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;
  private fitting = false;
  private userMoved = false; // the user zoomed or panned since the last automatic fit: keep their view on resize

  constructor(private readonly options: { headless?: boolean } = {}) {
    ensureDagre();
  }

  /** Exposed for tests. */
  get core(): Core | null {
    return this.cy;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    const cy = cytoscape({
      container: this.options.headless ? undefined : container,
      headless: this.options.headless,
      style: buildStylesheet(),
      elements: [],
      wheelSensitivity: 0.2,
      minZoom: 0.1,
      maxZoom: 3,
    });
    this.cy = cy;
    cy.on('tap', 'node', (evt) => this.emit('nodeClick', evt));
    cy.on('dbltap', 'node', (evt) => this.emit('nodeDoubleClick', evt));
    cy.on('cxttap', 'node', (evt) => this.emit('nodeContext', evt));
    cy.on('mouseover', 'node', (evt) => this.emit('nodeHover', evt));
    cy.on('mouseout', 'node', (evt) => this.emit('nodeHover', evt, true));
    cy.on('tap', (evt) => {
      if (evt.target === cy) this.emit('backgroundClick', evt, true);
    });
    cy.on('viewport', () => {
      if (!this.fitting) this.userMoved = true;
    });
    if (!this.options.headless && typeof ResizeObserver !== 'undefined') {
      // The map area changes with the window, dragged panels and the bottom panel: redraw and re-fit.
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeFrame !== null || typeof requestAnimationFrame !== 'function') return;
        this.resizeFrame = requestAnimationFrame(() => {
          this.resizeFrame = null;
          this.handleResize();
        });
      });
      this.resizeObserver.observe(container);
    }
  }

  handleResize(): void {
    const cy = this.cy;
    if (!cy) return;
    cy.resize();
    if (!this.userMoved) this.autoFit();
  }

  setGraph(graph: ViewGraph): void {
    const cy = this.cy;
    if (!cy) return;
    cy.elements().remove();
    cy.add(toElements(graph));
    const count = graph.nodes.length;
    const layout: LayoutOptions =
      count <= 300
        ? ({
            name: 'dagre',
            rankDir: 'LR',
            nodeSep: 30,
            rankSep: 80,
            animate: false,
          } as LayoutOptions)
        : count <= 1000
          ? { name: 'cose', animate: false }
          : { name: 'grid' };
    cy.layout(layout).run();
    this.autoFit();
    this.syncAnimation();
  }

  updateStyles(graph: ViewGraph): void {
    const cy = this.cy;
    if (!cy) return;
    const byId = new Map(toElements(graph).map((el) => [el.data.id as string, el]));
    cy.batch(() => {
      cy.elements().forEach((ele) => {
        const el = byId.get(ele.id());
        if (!el) return;
        const fields: Record<string, unknown> = { ...el.data };
        delete fields.id;
        delete fields.source;
        delete fields.target;
        ele.data(fields);
        ele.classes(el.classes as string);
      });
    });
    this.syncAnimation();
  }

  select(nodeId: string | null): void {
    const cy = this.cy;
    if (!cy) return;
    cy.elements().unselect();
    if (nodeId) cy.getElementById(nodeId).select();
  }

  fit(): void {
    this.autoFit();
  }

  on(event: RendererEvent, cb: (p: RendererEventPayload) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  destroy(): void {
    this.stopAnimation();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeFrame !== null && typeof cancelAnimationFrame === 'function')
      cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = null;
    this.cy?.destroy();
    this.cy = null;
    this.listeners.clear();
  }

  private autoFit(): void {
    if (!this.cy) return;
    this.fitting = true;
    try {
      fitCapped(this.cy);
    } finally {
      this.fitting = false;
    }
    this.userMoved = false;
  }

  private emit(event: RendererEvent, evt: EventObject, noNode = false): void {
    const rect =
      this.options.headless || !this.container
        ? { left: 0, top: 0 }
        : this.container.getBoundingClientRect();
    const pos = evt.renderedPosition ?? { x: 0, y: 0 };
    const payload: RendererEventPayload = {
      nodeId: noNode ? null : evt.target.id(),
      x: pos.x + rect.left,
      y: pos.y + rect.top,
    };
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }

  private syncAnimation(): void {
    const hasAnimated = (this.cy?.edges('.animated').length ?? 0) > 0;
    if (
      hasAnimated &&
      this.animationFrame === null &&
      typeof requestAnimationFrame === 'function'
    ) {
      const step = () => {
        const animated = this.cy?.edges('.animated');
        if (!animated || animated.length === 0) {
          this.animationFrame = null;
          return;
        }
        this.dashOffset = (this.dashOffset + 1) % 1000;
        animated.style('line-dash-offset', -this.dashOffset);
        this.animationFrame = requestAnimationFrame(step);
      };
      this.animationFrame = requestAnimationFrame(step);
    } else if (!hasAnimated) {
      this.stopAnimation();
    }
  }

  private stopAnimation(): void {
    if (this.animationFrame !== null && typeof cancelAnimationFrame === 'function')
      cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }
}
