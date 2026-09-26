// Channels: pv:history.isRepo {root}; pv:history.commits {root, limit}; pv:history.open {root, sha} → {project_id, path};
// pv:history.close {root, path, project_id}.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import type { MainContext } from '../core/context';
import { isGitRepo, listCommits } from '../history/git-history';
import { run } from '../history/run';
import { closeCommit, openCommit } from '../history/worktrees';

function str(p: unknown, key: string): string {
  const v = (p as Record<string, unknown> | null)?.[key];
  if (typeof v !== 'string' || !v) throw new Error(`${key} is required`);
  return v;
}

export default function register(ctx: MainContext): void {
  ctx.handle('pv:history.isRepo', (p) => isGitRepo(str(p, 'root'), run));
  ctx.handle('pv:history.commits', (p) => {
    const limit = Number((p as { limit?: unknown } | null)?.limit ?? 200);
    return listCommits(str(p, 'root'), limit, run);
  });
  ctx.handle('pv:history.open', async (p) => {
    const root = str(p, 'root');
    const base = join(app.getPath('userData'), 'history');
    mkdirSync(base, { recursive: true });
    const path = await openCommit(root, str(p, 'sha'), base, run, existsSync);
    const { project_id } = await ctx.engine.request<{ project_id: string }>('project.open', { root_path: path });
    return { project_id, path };
  });
  ctx.handle('pv:history.close', async (p) => {
    const projectId = (p as { project_id?: unknown } | null)?.project_id;
    if (typeof projectId === 'string' && projectId) {
      await ctx.engine.request('project.close', { project_id: projectId }).catch(() => undefined);
    }
    return closeCommit(str(p, 'root'), str(p, 'path'), run);
  });
}
