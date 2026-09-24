import { join } from 'node:path';

export function validateGitUrl(url: string): boolean {
  if (!url || /\s/.test(url) || url.startsWith('-')) return false;
  return url.startsWith('https://') || url.startsWith('ssh://') || /^git@[^:]+:.+/.test(url);
}

export function repoFolderName(url: string): string {
  const last = url.replace(/[/\\]+$/, '').split(/[/:]/).pop() ?? '';
  const name = last.replace(/\.git$/, '');
  return name || 'repo';
}

export async function cloneRepo(
  url: string,
  branch: string | undefined,
  destParent: string,
  deps: {
    run(cmd: string, args: string[]): Promise<{ code: number; stderr: string }>;
    exists(p: string): boolean;
    mkdir(p: string): void;
  },
): Promise<string> {
  if (!validateGitUrl(url)) throw new Error('Not a valid Git URL');
  deps.mkdir(destParent);
  const name = repoFolderName(url);
  let dest = join(destParent, name);
  for (let n = 2; deps.exists(dest); n++) dest = join(destParent, `${name}-${n}`);
  const args = ['clone', '--depth', '1', '--single-branch', ...(branch ? ['--branch', branch] : []), url, dest];
  const result = await deps.run('git', args);
  if (result.code !== 0) throw new Error('git clone failed: ' + result.stderr.slice(-300));
  return dest;
}
