// Channel: pv:rpc {method, params?} → forwards one JSON-RPC request to the engine.
import type { MainContext } from '../core/context';

export default function register(ctx: MainContext): void {
  ctx.handle('pv:rpc', (p) => {
    const { method, params } = (p ?? {}) as { method?: unknown; params?: unknown };
    if (typeof method !== 'string') throw new Error('method is required');
    return ctx.engine.request(method, params);
  });
}
