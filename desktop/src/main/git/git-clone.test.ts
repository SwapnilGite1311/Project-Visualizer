import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { cloneRepo, repoFolderName, validateGitUrl } from './git-clone';

function deps(existing: string[] = [], result = { code: 0, stderr: '' }) {
  const set = new Set(existing);
  return {
    run: vi.fn(async () => result),
    exists: (p: string) => set.has(p),
    mkdir: vi.fn(),
  };
}

describe('git clone', () => {
  it('validates URLs', () => {
    expect(validateGitUrl('https://github.com/pallets/flask')).toBe(true);
    expect(validateGitUrl('git@github.com:pallets/flask.git')).toBe(true);
    expect(validateGitUrl('ssh://git@host/repo.git')).toBe(true);
    expect(validateGitUrl('--upload-pack=evil')).toBe(false);
    expect(validateGitUrl('https://x.com/a b')).toBe(false);
    expect(validateGitUrl('file:///etc')).toBe(false);
  });

  it('derives folder names', () => {
    expect(repoFolderName('https://github.com/pallets/flask.git')).toBe('flask');
    expect(repoFolderName('git@github.com:owner/repo')).toBe('repo');
    expect(repoFolderName('')).toBe('repo');
  });

  it('clones shallowly into a free folder', async () => {
    const d = deps([join('/repos', 'flask')]);
    const dest = await cloneRepo('https://github.com/pallets/flask', 'main', '/repos', d);
    expect(dest).toBe(join('/repos', 'flask-2'));
    expect(d.mkdir).toHaveBeenCalledWith('/repos');
    expect(d.run).toHaveBeenCalledWith('git', [
      'clone', '--depth', '1', '--single-branch', '--branch', 'main', 'https://github.com/pallets/flask', join('/repos', 'flask-2'),
    ]);
  });

  it('rejects invalid URLs and reports failures', async () => {
    await expect(cloneRepo('not a url', undefined, '/repos', deps())).rejects.toThrow('Not a valid Git URL');
    await expect(
      cloneRepo('https://github.com/x/y', undefined, '/repos', deps([], { code: 128, stderr: 'fatal: repository not found' })),
    ).rejects.toThrow('git clone failed: fatal: repository not found');
  });
});
