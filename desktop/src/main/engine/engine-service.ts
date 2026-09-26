import { EngineClient } from './engine-client';
import { type EngineProcessHandle, type PipeSpawner, type Spawner, spawnEngine, spawnEngineOverPipe } from './engine-process';
import { pipePath } from './pipe-transport';

export type EngineStatus = 'stopped' | 'starting' | 'ready' | 'crashed' | 'restarting';
export type EngineTransportKind = 'pipe' | 'stdio';

export interface EngineServiceOptions {
  // Starts the engine as a local server (`pv-engine serve`) and connects over a named pipe. Default: the real
  // pipe spawner when the real stdio spawner is used, so tests with fake spawners stay on stdio.
  pipeSpawner?: PipeSpawner;
  // 'pipe' (default) or 'stdio'. Default: env PV_ENGINE_TRANSPORT.
  transport?: () => EngineTransportKind;
  pipeName?: () => string;
  log?: (level: 'info' | 'warn' | 'error', msg: string, extra?: unknown) => void;
}

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
  private _transport: EngineTransportKind = 'stdio';
  private pipeFailed = false;
  private readonly pipeSpawner: PipeSpawner | undefined;

  constructor(
    private readonly enginePath: string,
    private readonly spawner: Spawner,
    private readonly now: () => number = Date.now,
    private readonly options: EngineServiceOptions = {},
  ) {
    this.pipeSpawner = options.pipeSpawner ?? (spawner === spawnEngine ? spawnEngineOverPipe : undefined);
  }

  // How the desktop talks to the engine right now: the named pipe (new architecture) or stdio (fallback).
  get transport(): EngineTransportKind {
    return this._transport;
  }

  get status(): EngineStatus {
    return this._status;
  }

  get path(): string {
    return this.enginePath;
  }

  async start(): Promise<void> {
    this.stopping = false;
    this.setStatus('starting');
    const handle = await this.spawn();
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

  private wantsPipe(): boolean {
    if (!this.pipeSpawner || this.pipeFailed) return false;
    const kind = this.options.transport?.() ?? (process.env.PV_ENGINE_TRANSPORT === 'stdio' ? 'stdio' : 'pipe');
    return kind === 'pipe';
  }

  private async spawn(): Promise<EngineProcessHandle> {
    if (this.wantsPipe() && this.pipeSpawner) {
      try {
        const handle = await this.pipeSpawner(this.enginePath, this.options.pipeName?.() ?? pipePath());
        this._transport = 'pipe';
        return handle;
      } catch (err) {
        // An older engine without `serve`, or the pipe is not usable: stay on stdio for this session.
        this.pipeFailed = true;
        (this.options.log ?? ((_level, msg, extra) => console.warn('[engine]', msg, extra)))('warn', 'engine pipe not available; using stdio', String(err));
      }
    }
    this._transport = 'stdio';
    return this.spawner(this.enginePath, []);
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
