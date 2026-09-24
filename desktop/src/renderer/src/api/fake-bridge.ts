// Test helper: installs a fake window.pv whose rpc/invoke answers come from handler maps.
import type { Envelope, PvBridge } from '../../../shared/bridge';

type Handler = (payload: unknown) => unknown;

export interface FakeBridge {
  rpcCalls: Array<{ method: string; params: unknown }>;
  invokeCalls: Array<{ channel: string; payload: unknown }>;
  rpcHandlers: Map<string, Handler>;
  invokeHandlers: Map<string, Handler>;
  emitNotification(method: string, params: unknown): void;
  emitEvent(channel: string, payload: unknown): void;
}

async function answer(handler: Handler | undefined, name: string, payload: unknown): Promise<Envelope<unknown>> {
  if (!handler) return { ok: false, error: { code: 'no_handler', message: `no fake handler for ${name}` } };
  try {
    return { ok: true, value: await handler(payload) };
  } catch (e) {
    const err = e as { code?: string | number; message?: string };
    return { ok: false, error: { code: err.code ?? 'error', message: err.message ?? String(e) } };
  }
}

export function installFakeBridge(): FakeBridge {
  const notificationListeners = new Set<(method: string, params: unknown) => void>();
  const eventListeners = new Map<string, Set<(payload: unknown) => void>>();
  const fake: FakeBridge = {
    rpcCalls: [],
    invokeCalls: [],
    rpcHandlers: new Map(),
    invokeHandlers: new Map(),
    emitNotification: (method, params) => notificationListeners.forEach((l) => l(method, params)),
    emitEvent: (channel, payload) => eventListeners.get(channel)?.forEach((l) => l(payload)),
  };
  const bridge: PvBridge = {
    rpc: (method, params) => {
      fake.rpcCalls.push({ method, params });
      return answer(fake.rpcHandlers.get(method), method, params);
    },
    invoke: (channel, payload) => {
      fake.invokeCalls.push({ channel, payload });
      return answer(fake.invokeHandlers.get(channel), channel, payload);
    },
    onNotification: (cb) => {
      notificationListeners.add(cb);
      return () => notificationListeners.delete(cb);
    },
    on: (channel, cb) => {
      if (!eventListeners.has(channel)) eventListeners.set(channel, new Set());
      eventListeners.get(channel)!.add(cb);
      return () => eventListeners.get(channel)?.delete(cb);
    },
  };
  (globalThis as unknown as { window: { pv: PvBridge } }).window.pv = bridge;
  return fake;
}
