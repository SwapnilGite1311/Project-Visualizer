import { EngineClient } from './engine-client';
import type { EngineProcessHandle, Spawner } from './engine-process';

export type EngineStatus = 'stopped' | 'starting' | 'ready' | 'crashed' | 'restarting';

const MAX_RESTARTS = 3;
const RESTART_WINDOW_MS = 60000;

export class EngineService {
  private _status: EngineStatus = 'stopped';
  private handle: EngineProcessHandle | null = null;
  private client: EngineClient | null = null;
  private stopping = false;
  private restarts: number[] = [];
  private readonly notificationListeners = new Set<(method: string, params: unknown) => void>();
  private readonly statusListeners = new Set<(status: EngineStatus) => void>();

  constructor(
    private readonly enginePath: string,
    private readonly spawner: Spawner,
    private readonly now: () => number = Date.now,
  ) {}

  get status(): EngineStatus {
    return this._status;
  }

  get path(): string {
    return this.enginePath;
  }

  async start(): Promise<void> {
    this.stopping = false;
    this.setStatus('starting');
    const handle = this.spawner(this.enginePath, []);
    const client = new EngineClient(handle.transport);
    this.handle = handle;
    this.client = client;
    client.onNotification((method, params) => {
      for (const listener of this.notificationListeners) listener(method, params);
    });
    handle.onExit(() => this.handleExit(handle, client));
    await client.request('engine.ping');
    if (this.handle === handle) this.setStatus('ready');
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (this._status !== 'ready' || !this.client) return Promise.reject(new Error('engine not running'));
    return this.client.request<T>(method, params);
  }

  onNotification(cb: (method: string, params: unknown) => void): () => void {
    this.notificationListeners.add(cb);
    return () => {
      this.notificationListeners.delete(cb);
    };
  }

  onStatus(cb: (status: EngineStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const handle = this.handle;
    const client = this.client;
    if (handle && client) {
      const exited = new Promise<void>((resolve) => handle.onExit(() => resolve()));
      await client.request('engine.shutdown', {}, 2000).catch(() => undefined);
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2000));
      await Promise.race([exited, timeout]);
      handle.kill();
      client.failAll('engine stopped');
    }
    this.handle = null;
    this.client = null;
    this.setStatus('stopped');
  }

  private handleExit(handle: EngineProcessHandle, client: EngineClient): void {
    if (this.stopping || this.handle !== handle) return;
    client.failAll('engine stopped');
    this.handle = null;
    this.client = null;
    this.setStatus('crashed');
    const now = this.now();
    this.restarts = this.restarts.filter((t) => now - t < RESTART_WINDOW_MS);
    if (this.restarts.length >= MAX_RESTARTS) return;
    this.restarts.push(now);
    this.setStatus('restarting');
    this.start().catch(() => {
      if (this._status !== 'stopped') this.setStatus('crashed');
    });
  }

  private setStatus(status: EngineStatus): void {
    this._status = status;
    for (const listener of this.statusListeners) listener(status);
  }
}
