import { describe, expect, it, vi } from 'vitest';
import { fakeContext } from '../core/test-context';
import { cloneRepo } from '../git/git-clone';
import register from './git';

vi.mock('electron', () => ({ app: { getPath: () => '/user-data' } }));
vi.mock('../git/git-clone', () => ({ cloneRepo: vi.fn(async () => '/user-data/repos/flask') }));

describe('git handlers', () => {
  it('registers channels and clones into userData/repos', async () => {
    const ctx = fakeContext();
    register(ctx);
    expect([...ctx.handlers.keys()].sort()).toEqual(['pv:git.available', 'pv:git.clone']);
    await expect(ctx.call('pv:git.clone', { url: 'https://github.com/pallets/flask', branch: '' })).resolves.toEqual({
      root_path: '/user-data/repos/flask',
    });
    const [url, branch, dest] = vi.mocked(cloneRepo).mock.calls[0];
    expect(url).toBe('https://github.com/pallets/flask');
    expect(branch).toBeUndefined();
    expect(dest.replace(/\\/g, '/')).toBe('/user-data/repos');
  });

  it('requires a url', async () => {
    const ctx = fakeContext();
    register(ctx);
    await expect(ctx.call('pv:git.clone', {})).rejects.toThrow('url is required');
  });
});
