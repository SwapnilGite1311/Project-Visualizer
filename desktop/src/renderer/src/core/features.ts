import type { AppRegistry } from './registry';

export interface FeatureModule { default?: (app: AppRegistry) => void }

const discovered = import.meta.glob<FeatureModule>('../features/*/register.{ts,tsx}', { eager: true });

export function loadFeatures(app: AppRegistry, modules: Record<string, FeatureModule> = discovered): string[] {
  const paths = Object.keys(modules).sort();
  for (const path of paths) {
    const register = modules[path].default;
    if (typeof register !== 'function') throw new Error(`feature module has no default export: ${path}`);
    register(app);
  }
  return paths;
}
