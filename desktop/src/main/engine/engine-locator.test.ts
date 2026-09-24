import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { locateEngine, type LocateOptions } from './engine-locator';

function options(existing: string[], overrides: Partial<LocateOptions> = {}): LocateOptions {
  const set = new Set(existing);
  return {
    env: {},
    isPackaged: false,
    resourcesPath: join('/res'),
    appPath: join('/repo', 'desktop'),
    platform: 'win32',
    exists: (p) => set.has(p),
    ...overrides,
  };
}

describe('locateEngine', () => {
  it('prefers PV_ENGINE_PATH when it exists', () => {
    const custom = join('/custom', 'pv-engine.exe');
    expect(locateEngine(options([custom], { env: { PV_ENGINE_PATH: custom } }))).toBe(custom);
  });

  it('uses the packaged resources path', () => {
    const packaged = join('/res', 'engine', 'pv-engine.exe');
    expect(locateEngine(options([packaged], { isPackaged: true }))).toBe(packaged);
  });

  it('finds the Windows Debug build in development', () => {
    const debug = join('/repo', 'engine', 'build', 'app', 'Debug', 'pv-engine.exe');
    expect(locateEngine(options([debug]))).toBe(debug);
  });

  it('finds the Linux build in development', () => {
    const linux = join('/repo', 'engine', 'build', 'app', 'pv-engine');
    expect(locateEngine(options([linux], { platform: 'linux' }))).toBe(linux);
  });

  it('returns null when nothing exists', () => {
    expect(locateEngine(options([]))).toBeNull();
  });
});
