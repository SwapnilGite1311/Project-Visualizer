export type Envelope<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string | number; message: string } };

export interface PvBridge {
  rpc(method: string, params?: unknown): Promise<Envelope<unknown>>;
  invoke(channel: string, payload?: unknown): Promise<Envelope<unknown>>;
  onNotification(cb: (method: string, params: unknown) => void): () => void;
  on(channel: string, cb: (payload: unknown) => void): () => void;
}

export const CHANNEL_RPC = 'pv:rpc';
export const CHANNEL_NOTIFICATION = 'pv:notification';
export const CHANNEL_ENGINE_STATUS = 'pv:engine.status';
