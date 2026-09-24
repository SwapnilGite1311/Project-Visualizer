import { encodeMessage, FrameDecoder } from './framing';
import { isNotification, isResponse, RpcError } from './json-rpc';

export interface EngineTransport {
  write(data: Buffer): void;
  onData(cb: (chunk: Buffer) => void): void;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class EngineClient {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly listeners = new Set<(method: string, params: unknown) => void>();
  private readonly decoder = new FrameDecoder();
  private readonly timeoutMs: number;

  constructor(
    private readonly transport: EngineTransport,
    options?: { timeoutMs?: number },
  ) {
    this.timeoutMs = options?.timeoutMs ?? 60000;
    transport.onData((chunk) => this.handleData(chunk));
  }

  request<T = unknown>(method: string, params?: unknown, timeoutMs?: number): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`engine request timed out: ${method}`));
      }, timeoutMs ?? this.timeoutMs);
      this.pending.set(id, { resolve: (v) => resolve(v as T), reject, timer });
      this.transport.write(encodeMessage(JSON.stringify({ jsonrpc: '2.0', id, method, params: params ?? {} })));
    });
  }

  onNotification(cb: (method: string, params: unknown) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  failAll(reason: string): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error(reason));
      this.pending.delete(id);
    }
  }

  private handleData(chunk: Buffer): void {
    for (const text of this.decoder.push(chunk)) {
      let msg: unknown;
      try {
        msg = JSON.parse(text);
      } catch {
        continue;
      }
      if (isResponse(msg)) {
        if (typeof msg.id !== 'number') continue;
        const entry = this.pending.get(msg.id);
        if (!entry) continue;
        this.pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.error) entry.reject(new RpcError(msg.error.code, msg.error.message));
        else entry.resolve(msg.result);
      } else if (isNotification(msg)) {
        for (const listener of this.listeners) listener(msg.method, msg.params);
      }
    }
  }
}
