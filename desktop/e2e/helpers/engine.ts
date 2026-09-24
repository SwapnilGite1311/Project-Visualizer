import { spawn } from 'node:child_process';
import { encodeMessage, FrameDecoder } from '../../src/main/engine/framing';
import { enginePath } from './paths';

export interface TestEngine {
  request<T = unknown>(method: string, params?: unknown): Promise<T>;
  close(): Promise<void>;
}

interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
}

// A minimal JSON-RPC client over the engine's stdio, for tests only.
export function startEngine(): TestEngine {
  const child = spawn(enginePath(), [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const decoder = new FrameDecoder();
  const pending = new Map<number, Pending>();
  let nextId = 1;

  child.stdout.on('data', (chunk: Buffer) => {
    for (const text of decoder.push(chunk)) {
      const msg = JSON.parse(text) as { id?: number; result?: unknown; error?: { code: number; message: string } };
      if (msg.id === undefined) continue; // notification
      const p = pending.get(msg.id);
      if (!p) continue;
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`${msg.error.code}: ${msg.error.message}`));
      else p.resolve(msg.result);
    }
  });
  child.stderr.resume();
  child.on('exit', () => {
    for (const p of pending.values()) p.reject(new Error('engine exited'));
    pending.clear();
  });

  return {
    request<T>(method: string, params: unknown = {}) {
      const id = nextId++;
      return new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        child.stdin.write(encodeMessage(JSON.stringify({ jsonrpc: '2.0', id, method, params })));
      });
    },
    close() {
      return new Promise<void>((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.once('exit', () => resolve());
        const id = nextId++;
        child.stdin.write(encodeMessage(JSON.stringify({ jsonrpc: '2.0', id, method: 'engine.shutdown', params: {} })));
        setTimeout(() => child.kill(), 3000);
      });
    },
  };
}
