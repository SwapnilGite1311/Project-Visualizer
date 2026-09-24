import type { Envelope } from '../../../shared/bridge';

export class ApiError extends Error {
  constructor(
    public code: string | number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function unwrap<T>(env: Envelope<unknown>): T {
  if (env.ok) return env.value as T;
  throw new ApiError(env.error.code, env.error.message);
}

export async function rpc<T>(method: string, params?: unknown): Promise<T> {
  return unwrap<T>(await window.pv.rpc(method, params));
}

export async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return unwrap<T>(await window.pv.invoke(channel, payload));
}

export function onEngineNotification(method: string, cb: (params: unknown) => void): () => void {
  return window.pv.onNotification((m, params) => {
    if (m === method) cb(params);
  });
}

export function onMainEvent(channel: string, cb: (payload: unknown) => void): () => void {
  return window.pv.on(channel, cb);
}
