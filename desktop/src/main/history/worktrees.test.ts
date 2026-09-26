import { describe, expect, it } from 'vitest';
import type { Run } from './run';
import { closeCommit, openCommit, rootHash } from './worktrees';

describe('worktrees', () => {
  it('rejects anything that is not a commit id', async () => {
    const run: Run = async () => ({ code: 0, stdout: '', stderr: '' });
    await expect(openCommit('C:/x', '--help', 'C:/h', run, () => false)).rejects.toThrow(/not a commit id/);
    await expect(openCommit('C:/x', 'HEAD', 'C:/h', run, () => false)).rejects.toThrow(/not a commit id/);
  });

  it('adds a detached worktree once and reuses it', async () => {
    const calls: string[][] = [];
    const run: Run = async (_c, args) => {
      calls.push(args);
      return { code: 0, stdout: '', stderr: '' };
    };
    const path = await openCommit('C:/code/app', 'abcdef1234567', 'C:/h', run, () => false);
    expect(path).toContain(`${rootHash('C:/code/app')}-abcdef1234`);
    expect(calls[0]).toEqual(['-C', 'C:/code/app', 'worktree', 'add', '--detach', path, 'abcdef1234567']);
    const again = await openCommit('C:/code/app', 'abcdef1234567', 'C:/h', run, () => true);
    expect(again).toBe(path);
    expect(calls).toHaveLength(1);
  });

  it('removes a worktree and reports failures', async () => {
    expect(await closeCommit('C:/x', 'C:/h/p', async () => ({ code: 0, stdout: '', stderr: '' }))).toBe(true);
    expect(await closeCommit('C:/x', 'C:/h/p', async () => ({ code: 1, stdout: '', stderr: 'no' }))).toBe(false);
  });

  it('hashes roots the same way whatever the slashes and case', () => {
    expect(rootHash('C:\\Code\\App')).toBe(rootHash('c:/code/app'));
    expect(rootHash('a')).toMatch(/^[0-9a-f]{8}$/);
  });
});
