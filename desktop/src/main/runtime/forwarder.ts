// Queues events from agents and sends them to the engine (runtime.ingest) for the project that is open.
import { realpathSync } from 'node:fs';
import type { BatchSource, RuntimeEventJson } from './batch';

export const FORWARD_INTERVAL_MS = 200;
export const CHUNK = 500;
export const MAX_QUEUE = 50_000;

interface EngineLike {
  request(method: string, params: unknown): Promise<unknown>;
}

type SetTimer = (fn: () => void, ms: number) => unknown;

export interface ForwarderStats {
  forwarded: number;
  dropped_no_project: number;
  dropped_other_root: number;
  dropped_overflow: number;
  errors: number;
}

export function normalizeRoot(root: string, windows = process.platform === 'win32'): string {
  const path = root.replace(/\\/g, '/').replace(/\/+$/, '');
  return windows ? path.toLowerCase() : path;
}

const resolvedRoots = new Map<string, string>();

// The same folder can be written differently (Windows short names like SWAPNI~1, links): compare resolved folders.
export function sameFolderKey(root: string): string {
  let resolved = resolvedRoots.get(root);
  if (resolved === undefined) {
    try {
      resolved = realpathSync.native(root);
    } catch {
      resolved = root; // not on this computer (e.g. a remote agent): compare as written
    }
    if (resolvedRoots.size > 1000) resolvedRoots.clear();
    resolvedRoots.set(root, resolved);
  }
  return normalizeRoot(resolved);
}

export class Forwarder {
  private projectId: string | null = null;
  private root: string | null = null;
  private queue: RuntimeEventJson[] = [];
  private sending = false;
  private readonly timer: unknown;
  private readonly counts: ForwarderStats = {
    forwarded: 0,
    dropped_no_project: 0,
    dropped_other_root: 0,
    dropped_overflow: 0,
    errors: 0,
  };

  constructor(
    private readonly engine: EngineLike,
    setTimer: SetTimer = setInterval,
    private readonly clearTimer: (t: unknown) => void = (t) => clearInterval(t as NodeJS.Timeout),
  ) {
    this.timer = setTimer(() => void this.tick(), FORWARD_INTERVAL_MS);
    (this.timer as { unref?: () => void })?.unref?.();
  }

  // Events queued for the previous project are thrown away.
  setActiveProject(projectId: string | null, root: string | null): void {
    if (projectId !== this.projectId) this.queue = [];
    this.projectId = projectId;
    this.root = root ? sameFolderKey(root) : null;
  }

  push(source: BatchSource, events: RuntimeEventJson[]): void {
    if (!this.projectId) {
      this.counts.dropped_no_project += events.length;
      return;
    }
    if (source.project_root && this.root && sameFolderKey(source.project_root) !== this.root) {
      this.counts.dropped_other_root += events.length;
      return;
    }
    this.queue.push(...events);
    const over = this.queue.length - MAX_QUEUE;
    if (over > 0) {
      this.queue.splice(0, over);
      this.counts.dropped_overflow += over;
    }
  }

  async tick(): Promise<void> {
    if (this.sending) return;
    this.sending = true;
    try {
      while (this.queue.length > 0 && this.projectId) {
        const projectId = this.projectId;
        const events = this.queue.splice(0, CHUNK);
        try {
          await this.engine.request('runtime.ingest', { project_id: projectId, events });
          this.counts.forwarded += events.length;
        } catch {
          this.counts.errors++;
        }
      }
    } finally {
      this.sending = false;
    }
  }

  stats(): ForwarderStats {
    return { ...this.counts };
  }

  stop(): void {
    this.clearTimer(this.timer);
    this.queue = [];
  }
}
