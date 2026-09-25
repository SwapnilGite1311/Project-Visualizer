import type { BridgeInfo } from './bridge-info';

export interface SocketLike {
  send(data: string): void;
  close(): void;
  on(event: 'open' | 'message' | 'close' | 'error', cb: (...args: unknown[]) => void): void;
}

interface Options {
  readInfo(): BridgeInfo | null;
  createSocket(url: string): SocketLike;
  onOpen(file: string, line: number): void;
  onStatus(connected: boolean): void;
  setTimer?: (cb: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

// Retry delays after a failed or lost connection; the last one repeats.
export const RETRY_MS = [1000, 2000, 5000, 10000];
const VERSION = '0.1.0';

export class BridgeClient {
  private socket: SocketLike | null = null;
  private connected = false;
  private attempts = 0;
  private timer: unknown = null;
  private disposed = false;

  constructor(private readonly opts: Options) {}

  connect(): void {
    if (this.disposed) return;
    this.clearRetry();
    const info = this.opts.readInfo();
    if (!info) {
      this.scheduleRetry();
      return;
    }
    const socket = this.opts.createSocket(`ws://127.0.0.1:${info.port}`);
    this.socket = socket;
    socket.on('open', () => socket.send(JSON.stringify({ type: 'hello', token: info.token, client: 'vscode', version: VERSION })));
    socket.on('message', (data) => this.onMessage(String(data)));
    socket.on('close', () => this.lost(socket));
    socket.on('error', () => this.lost(socket));
  }

  reveal(file: string, line: number): boolean {
    return this.request('reveal', file, line);
  }

  explain(file: string, line: number): boolean {
    return this.request('explain', file, line);
  }

  // Drops the current connection (if any) and connects again right away.
  reconnect(): void {
    this.disposed = false;
    this.clearRetry();
    const socket = this.socket;
    this.socket = null;
    this.setConnected(false);
    socket?.close();
    this.attempts = 0;
    this.connect();
  }

  isConnected(): boolean {
    return this.connected;
  }

  dispose(): void {
    this.disposed = true;
    this.clearRetry();
    const socket = this.socket;
    this.socket = null;
    this.setConnected(false);
    socket?.close();
  }

  private request(type: 'reveal' | 'explain', file: string, line: number): boolean {
    if (!this.connected || !this.socket) return false;
    this.socket.send(JSON.stringify({ type, file_path: file, line }));
    return true;
  }

  private onMessage(text: string): void {
    let message: { type?: unknown; file_path?: unknown; line?: unknown };
    try {
      message = JSON.parse(text) as typeof message;
    } catch {
      return;
    }
    if (message.type === 'welcome') {
      this.attempts = 0;
      this.setConnected(true);
    } else if (message.type === 'open' && typeof message.file_path === 'string' && typeof message.line === 'number') {
      this.opts.onOpen(message.file_path, message.line);
    }
  }

  private lost(socket: SocketLike): void {
    if (socket !== this.socket) return;
    this.socket = null;
    this.setConnected(false);
    this.scheduleRetry();
  }

  private setConnected(connected: boolean): void {
    if (this.connected === connected) return;
    this.connected = connected;
    this.opts.onStatus(connected);
  }

  private scheduleRetry(): void {
    if (this.disposed || this.timer) return;
    const delay = RETRY_MS[Math.min(this.attempts, RETRY_MS.length - 1)];
    this.attempts++;
    const setTimer = this.opts.setTimer ?? setTimeout;
    this.timer = setTimer(() => {
      this.timer = null;
      this.connect();
    }, delay);
  }

  private clearRetry(): void {
    if (!this.timer) return;
    const clearTimer = this.opts.clearTimer ?? ((t: unknown) => clearTimeout(t as ReturnType<typeof setTimeout>));
    clearTimer(this.timer);
    this.timer = null;
  }
}
