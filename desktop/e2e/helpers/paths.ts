import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// desktop/e2e/helpers → repository root.
export const repoRoot = resolve(__dirname, '..', '..', '..');
export const desktopDir = join(repoRoot, 'desktop');
export const fixtureSmall = join(repoRoot, 'engine', 'modules', 'lang_python', 'tests', 'fixtures', 'pyproj_small');
export const contractsDir = join(repoRoot, 'contracts');

// Same order as the development candidates in src/main/engine/engine-locator.ts.
export function enginePath(): string {
  const env = process.env.PV_ENGINE_PATH;
  if (env && existsSync(env)) return env;
  const exe = process.platform === 'win32' ? 'pv-engine.exe' : 'pv-engine';
  const engineDir = join(repoRoot, 'engine');
  const candidates = [
    join(engineDir, 'build', 'app', 'Debug', exe),
    join(engineDir, 'build', 'app', 'Release', exe),
    join(engineDir, 'build', 'app', exe),
    join(engineDir, 'build-release', 'app', exe),
  ];
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error('pv-engine not found; build the engine first (see engine/README.md)');
  return found;
}
