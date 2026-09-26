import { join } from 'node:path';
import type { Run } from './run';

// Short, stable folder name part for a repository root (FNV-1a, 8 hex).
export function rootHash(root: string): string {
  let h = 0x811c9dc5;
  for (const ch of root.replace(/\\/g, '/').toLowerCase()) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// A folder with the code of an old commit, made with `git worktree` (the user's working copy is not touched).
export async function openCommit(root: string, sha: string, baseDir: string, run: Run, exists: (p: string) => boolean): Promise<string> {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error('not a commit id: ' + sha);
  const path = join(baseDir, `${rootHash(root)}-${sha.slice(0, 10)}`);
  if (exists(path)) return path;
  const r = await run('git', ['-C', root, 'worktree', 'add', '--detach', path, sha]);
  if (r.code !== 0) throw new Error('git worktree add failed: ' + r.stderr.slice(-300));
  return path;
}

export async function closeCommit(root: string, path: string, run: Run): Promise<boolean> {
  const r = await run('git', ['-C', root, 'worktree', 'remove', '--force', path]);
  return r.code === 0;
}
