import { describe, expect, it } from 'vitest';
import { isGitRepo, listCommits } from './git-history';
import type { Run } from './run';

const fakeRun =
  (stdout: string, code = 0): Run =>
  async () => ({ code, stdout, stderr: code ? 'fatal: not a git repository' : '' });

describe('git history', () => {
  it('detects a repository', async () => {
    expect(await isGitRepo('C:/x', fakeRun('true\n'))).toBe(true);
    expect(await isGitRepo('C:/x', fakeRun('', 128))).toBe(false);
  });

  it('lists commits newest first and clamps the limit', async () => {
    const calls: string[][] = [];
    const run: Run = async (_cmd, args) => {
      calls.push(args);
      return {
        code: 0,
        stdout: 'a1b2\u001fAna\u001f2026-09-20T10:00:00+05:30\u001ffix: login\r\nc3d4\u001fBo\u001f2026-09-19T09:00:00+05:30\u001finit',
        stderr: '',
      };
    };
    const commits = await listCommits('C:/x', 10000, run);
    expect(commits).toEqual([
      { sha: 'a1b2', author: 'Ana', date: '2026-09-20T10:00:00+05:30', subject: 'fix: login' },
      { sha: 'c3d4', author: 'Bo', date: '2026-09-19T09:00:00+05:30', subject: 'init' },
    ]);
    expect(calls[0]).toContain('500');
  });

  it('reports git errors', async () => {
    await expect(listCommits('C:/x', 5, fakeRun('', 128))).rejects.toThrow(/git log failed/);
  });
});
