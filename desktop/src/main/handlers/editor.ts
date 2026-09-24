// Channel: pv:editor.open {file_path, line} → {opened_with: 'vscode' | 'default'}.
import { spawn } from 'node:child_process';
import { shell } from 'electron';
import type { MainContext } from '../core/context';

export async function openInEditor(
  file: string,
  line: number,
  deps: { spawnCode: (args: string[]) => Promise<boolean>; openPath: (p: string) => Promise<string> },
): Promise<'vscode' | 'default'> {
  if (await deps.spawnCode(['-g', `${file}:${line}`])) return 'vscode';
  await deps.openPath(file);
  return 'default';
}

function spawnCode(args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' ? 'code.cmd' : 'code';
    try {
      const child = spawn(command, args, { shell: false, stdio: 'ignore', windowsHide: true });
      child.on('error', () => resolve(false));
      child.on('exit', (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
}

export default function register(ctx: MainContext): void {
  ctx.handle('pv:editor.open', async (p) => {
    const { file_path, line } = (p ?? {}) as { file_path?: unknown; line?: unknown };
    if (typeof file_path !== 'string' || file_path === '') throw new Error('file_path is required');
    const safeLine = typeof line === 'number' && line >= 1 ? Math.floor(line) : 1;
    const opened_with = await openInEditor(file_path, safeLine, { spawnCode, openPath: (f) => shell.openPath(f) });
    return { opened_with };
  });
}
