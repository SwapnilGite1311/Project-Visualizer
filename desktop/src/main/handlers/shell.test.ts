import { beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { shell } from 'electron';
import { fakeContext } from '../core/test-context';
import register from './shell';

vi.mock('electron', () => ({ shell: { showItemInFolder: vi.fn() } }));
vi.mock('node:fs', () => ({ existsSync: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('shell handler', () => {
  it('shows an existing file in its folder', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const ctx = fakeContext();
    register(ctx);
    const file = process.platform === 'win32' ? 'C:\\code\\app\\a.py' : '/code/app/a.py';
    expect(await ctx.call('pv:shell.showItemInFolder', { path: file })).toBe(true);
    expect(shell.showItemInFolder).toHaveBeenCalledWith(file);
  });

  it('rejects relative or missing paths', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const ctx = fakeContext();
    register(ctx);
    await expect(ctx.call('pv:shell.showItemInFolder', { path: 'a.py' })).rejects.toThrow('file not found');
    await expect(ctx.call('pv:shell.showItemInFolder', { path: process.platform === 'win32' ? 'C:\\nope.py' : '/nope.py' })).rejects.toThrow(
      'file not found',
    );
    expect(shell.showItemInFolder).not.toHaveBeenCalled();
  });
});
