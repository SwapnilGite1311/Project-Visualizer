import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fakeContext } from '../core/test-context';
import register from './snippet';

const userData = mkdtempSync(join(tmpdir(), 'pv-ud-'));
vi.mock('electron', () => ({ app: { getPath: () => userData } }));

describe('snippet handler', () => {
  it('creates a snippet project under userData/snippets', async () => {
    const ctx = fakeContext();
    register(ctx);
    const { root_path } = (await ctx.call('pv:snippet.create', { code: 'x = 1\n', file_name: 'demo.py' })) as { root_path: string };
    expect(root_path.startsWith(join(userData, 'snippets'))).toBe(true);
    expect(readdirSync(root_path)).toEqual(['demo.py']);
    await expect(ctx.call('pv:snippet.create', { code: '  ' })).rejects.toThrow('code is required');
  });
});
