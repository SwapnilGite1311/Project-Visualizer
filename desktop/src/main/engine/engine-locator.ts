import { join } from 'node:path';

export interface LocateOptions {
  env: Record<string, string | undefined>;
  isPackaged: boolean;
  resourcesPath: string;
  appPath: string; // app.getAppPath(), in dev this is the desktop/ folder
  platform: NodeJS.Platform;
  exists: (path: string) => boolean;
}

export function locateEngine(o: LocateOptions): string | null {
  const envPath = o.env.PV_ENGINE_PATH;
  if (envPath && o.exists(envPath)) return envPath;
  const exe = o.platform === 'win32' ? 'pv-engine.exe' : 'pv-engine';
  if (o.isPackaged) {
    const packaged = join(o.resourcesPath, 'engine', exe);
    if (o.exists(packaged)) return packaged;
  }
  const engineDir = join(o.appPath, '..', 'engine');
  const candidates = [
    join(engineDir, 'build', 'app', 'Debug', exe),
    join(engineDir, 'build', 'app', 'Release', exe),
    join(engineDir, 'build', 'app', exe),
    join(engineDir, 'build-release', 'app', exe),
  ];
  return candidates.find((c) => o.exists(c)) ?? null;
}
