import type { MainContext } from './context';
export interface HandlerModule { default?: (ctx: MainContext) => void }
const discovered = import.meta.glob<HandlerModule>(['../handlers/*.ts', '!../handlers/*.test.ts'], { eager: true });
export function loadHandlers(ctx: MainContext, modules: Record<string, HandlerModule> = discovered): string[] {
  const paths = Object.keys(modules).sort();
  for (const path of paths) {
    const register = modules[path].default;
    if (typeof register !== 'function') throw new Error(`handler module has no default export: ${path}`);
    register(ctx);
  }
  return paths;
}
