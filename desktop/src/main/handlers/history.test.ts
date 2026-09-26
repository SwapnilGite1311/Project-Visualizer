import { describe, expect, it, vi } from 'vitest';
import type { MainContext } from '../core/context';
import { fakeContext } from '../core/test-context';
import { closeCommit, openCommit } from '../history/worktrees';
import register from './history';

vi.mock('electron', () => ({ app: { getPath: () => '/user-data' } }));
vi.mock('node:fs', async (orig) => ({ ...(await orig<typeof import('node:fs')>()), mkdirSync: vi.fn() }));
vi.mock('../history/git-history', () => ({
  isGitRepo: vi.fn(async () => true),
  listCommits: vi.fn(async () => [{ sha: 'abc1234', author: 'Ana', date: '2026-09-01', subject: 'first' }]),
}));
vi.mock('../history/worktrees', () => ({
  openCommit: vi.fn(async () => '/user-data/history/12345678-abc1234'),
  closeCommit: vi.fn(async () => true),
}));

function withEngine() {
  const request = vi.fn(async (method: string) => (method === 'project.open' ? { project_id: 'p9' } : { ok: true }));
  const ctx = fakeContext({ engine: { request } as unknown as MainContext['engine'] });
  register(ctx);
  return { ctx, request };
}

describe('history handlers', () => {
  it('lists commits of a repository', async () => {
    const { ctx } = withEngine();
    expect(await ctx.call('pv:history.isRepo', { root: 'C:/code/app' })).toBe(true);
    expect(await ctx.call('pv:history.commits', { root: 'C:/code/app', limit: 5 })).toHaveLength(1);
  });

  it('opens a commit as its own project and closes it again', async () => {
    const { ctx, request } = withEngine();
    const opened = await ctx.call('pv:history.open', { root: 'C:/code/app', sha: 'abc1234' });
    expect(opened).toEqual({ project_id: 'p9', path: '/user-data/history/12345678-abc1234' });
    expect(vi.mocked(openCommit).mock.calls[0][2].replace(/\\/g, '/')).toBe('/user-data/history');
    expect(request).toHaveBeenCalledWith('project.open', { root_path: '/user-data/history/12345678-abc1234' });

    expect(await ctx.call('pv:history.close', { root: 'C:/code/app', path: opened.path, project_id: 'p9' })).toBe(true);
    expect(request).toHaveBeenCalledWith('project.close', { project_id: 'p9' });
    expect(closeCommit).toHaveBeenCalledWith('C:/code/app', opened.path, expect.any(Function));
  });

  it('requires a root', async () => {
    const { ctx } = withEngine();
    await expect(ctx.call('pv:history.commits', {})).rejects.toThrow('root is required');
  });
});
