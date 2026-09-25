// Channel: pv:shell.showItemInFolder {path} → true (opens Explorer/Finder with the file selected).
import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { shell } from 'electron';
import type { MainContext } from '../core/context';

export default function register(ctx: MainContext): void {
  ctx.handle('pv:shell.showItemInFolder', (p) => {
    const path = (p as { path?: unknown } | undefined)?.path;
    if (typeof path !== 'string' || !isAbsolute(path) || !existsSync(path)) throw new Error('file not found');
    shell.showItemInFolder(path);
    return true;
  });
}
