// Channels: pv:settings.get {key, fallback?}, pv:settings.set {key, value} → true, pv:settings.all.
import type { MainContext } from '../core/context';

function requireKey(p: unknown): string {
  const key = (p as { key?: unknown } | null)?.key;
  if (typeof key !== 'string' || key === '') throw new Error('key is required');
  return key;
}

export default function register(ctx: MainContext): void {
  ctx.handle('pv:settings.get', (p) => {
    const key = requireKey(p);
    return ctx.settings.get(key, (p as { fallback?: unknown }).fallback ?? null);
  });
  ctx.handle('pv:settings.set', (p) => {
    const key = requireKey(p);
    ctx.settings.set(key, (p as { value?: unknown }).value);
    return true;
  });
  ctx.handle('pv:settings.all', () => ctx.settings.all());
}
