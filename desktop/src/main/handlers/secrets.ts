// Channels: pv:secrets.set {name, value} → true, pv:secrets.has {name} → boolean, pv:secrets.delete {name} → true.
// There is deliberately no channel that returns a secret value (SEC-03).
import type { MainContext } from '../core/context';

function requireName(p: unknown): string {
  const name = (p as { name?: unknown } | null)?.name;
  if (typeof name !== 'string' || name === '') throw new Error('name is required');
  return name;
}

export default function register(ctx: MainContext): void {
  ctx.handle('pv:secrets.set', (p) => {
    const value = (p as { value?: unknown }).value;
    if (typeof value !== 'string') throw new Error('value is required');
    ctx.secrets.set(requireName(p), value);
    return true;
  });
  ctx.handle('pv:secrets.has', (p) => ctx.secrets.has(requireName(p)));
  ctx.handle('pv:secrets.delete', (p) => {
    ctx.secrets.delete(requireName(p));
    return true;
  });
}
