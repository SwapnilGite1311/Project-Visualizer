// "Zoom = abstraction": turns mouse-wheel / pinch zooming into level changes, the same way for every renderer.
// - Zooming in over an element that has something inside it: once the element is big on screen (zoom ≥ drillZoom, or
//   it fills a good part of the view), a few more steps open it (event zoomIn). "Big" = zoomed in by inFactor over the
//   fitted level, or drillZoom, whichever comes first.
// - Zooming out well past the whole level (zoom ≤ fitted zoom × outFactor): a few more steps go up a level (zoomOut).
// A short hint tells the user what will happen, and a cool-down after each change stops runaway jumps.

export interface ZoomTarget {
  id: string;
  label: string;
  canOpen: boolean; // has something inside
  fillsView: boolean; // already covers a large part of the map
}

export interface ZoomHint {
  text: string;
  x: number;
  y: number;
}

export interface SemanticZoomOptions {
  drillZoom: number;
  inFactor: number;
  outFactor: number;
  ticks: number; // wheel steps needed past the limit
  windowMs: number; // steps further apart than this start over
  cooldownMs: number; // quiet time after a level change or a fit
}

export const SEMANTIC_ZOOM_DEFAULTS: SemanticZoomOptions = { drillZoom: 2, inFactor: 1.25, outFactor: 0.6, ticks: 3, windowMs: 800, cooldownMs: 900 };

type Emit = (event: 'zoomIn' | 'zoomOut', nodeId: string | null, at: { clientX: number; clientY: number }) => void;

export class SemanticZoom {
  private fitZoom = 0;
  private cooldownUntil = 0;
  private direction: 'in' | 'out' | null = null;
  private targetId: string | null = null;
  private count = 0;
  private lastTick = 0;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly options: SemanticZoomOptions;

  constructor(
    private readonly emit: Emit,
    private readonly onHint: (hint: ZoomHint | null) => void = () => undefined,
    options: Partial<SemanticZoomOptions> = {},
  ) {
    this.options = { ...SEMANTIC_ZOOM_DEFAULTS, ...options };
  }

  // The renderer fitted a new level: remember that zoom as "the whole level" and pause briefly.
  fitted(zoom: number, now: number = Date.now()): void {
    this.fitZoom = zoom;
    this.cooldownUntil = now + this.options.cooldownMs;
    this.reset();
  }

  wheel(e: { deltaY: number; clientX: number; clientY: number }, zoom: number, target: ZoomTarget | null, now: number = Date.now()): void {
    if (now < this.cooldownUntil || e.deltaY === 0) return;
    if (now - this.lastTick > this.options.windowMs) this.reset();
    this.lastTick = now;
    const at = { clientX: e.clientX, clientY: e.clientY };

    if (e.deltaY < 0) {
      const big = this.fitZoom > 0 ? Math.min(this.options.drillZoom, this.fitZoom * this.options.inFactor) : this.options.drillZoom;
      if (!target || !target.canOpen || (zoom < big - 1e-9 && !target.fillsView)) {
        this.reset();
        return;
      }
      this.step('in', target.id);
      if (this.count >= this.options.ticks) return this.fire('zoomIn', target.id, at, now);
      this.hint({ text: `Keep zooming to open ${target.label}`, x: e.clientX, y: e.clientY });
      return;
    }

    if (this.fitZoom <= 0 || zoom > this.fitZoom * this.options.outFactor + 1e-9) {
      this.reset();
      return;
    }
    this.step('out', null);
    if (this.count >= this.options.ticks) return this.fire('zoomOut', null, at, now);
    this.hint({ text: 'Keep zooming out to go up a level', x: e.clientX, y: e.clientY });
  }

  dispose(): void {
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = null;
  }

  private step(direction: 'in' | 'out', id: string | null): void {
    if (this.direction === direction && this.targetId === id) this.count++;
    else {
      this.direction = direction;
      this.targetId = id;
      this.count = 1;
    }
  }

  private fire(event: 'zoomIn' | 'zoomOut', id: string | null, at: { clientX: number; clientY: number }, now: number): void {
    this.cooldownUntil = now + this.options.cooldownMs;
    this.reset();
    this.emit(event, id, at);
  }

  private reset(): void {
    this.direction = null;
    this.targetId = null;
    this.count = 0;
    this.hint(null);
  }

  private hint(h: ZoomHint | null): void {
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = null;
    this.onHint(h);
    if (h) this.hintTimer = setTimeout(() => this.onHint(null), this.options.windowMs);
  }
}
