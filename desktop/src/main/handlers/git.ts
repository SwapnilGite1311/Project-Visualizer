// Channels: pv:git.available → boolean; pv:git.clone {url, branch?} → {root_path}.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import type { MainContext } from '../core/context';
import { cloneRepo } from '../git/git-clone';

function run(cmd: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    let stderr = '';
    try {
      const child = spawn(cmd, args, { shell: false, windowsHide: true });
      child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
      child.on('error', (e) => resolve({ code: -1, stderr: stderr + String(e) }));
      child.on('exit', (code) => resolve({ code: code ?? -1, stderr }));
    } catch (e) {
      resolve({ code: -1, stderr: String(e) });
    }
  });
}

export default function register(ctx: MainContext): void {
  ctx.handle('pv:git.available', async () => (await run('git', ['--version'])).code === 0);
  ctx.handle('pv:git.clone', async (p) => {
    const { url, branch } = (p ?? {}) as { url?: unknown; branch?: unknown };
    if (typeof url !== 'string') throw new Error('url is required');
    const root_path = await cloneRepo(url, typeof branch === 'string' && branch ? branch : undefined, join(app.getPath('userData'), 'repos'), {
      run,
      exists: existsSync,
      mkdir: (dir) => mkdirSync(dir, { recursive: true }),
    });
    return { root_path };
  });
}
