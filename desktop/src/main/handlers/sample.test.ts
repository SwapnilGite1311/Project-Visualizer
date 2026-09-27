import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fakeContext } from '../core/test-context';
import { SAMPLE_FILES } from '../sample/sample-project';
import register from './sample';

const userData = mkdtempSync(join(tmpdir(), 'pv-ud-'));
vi.mock('electron', () => ({ app: { getPath: () => userData } }));

describe('sample project handler', () => {
  it('writes a fresh sample shop under userData/sample-project', async () => {
    const ctx = fakeContext();
    register(ctx);
    const stale = join(userData, 'sample-project', 'old.py');
    mkdirSync(join(userData, 'sample-project'), { recursive: true });
    writeFileSync(stale, 'x = 1\n');
    const { root_path } = (await ctx.call('pv:sample.create')) as { root_path: string };
    expect(root_path).toBe(join(userData, 'sample-project'));
    expect(existsSync(stale)).toBe(false); // replaced, not merged
    for (const rel of Object.keys(SAMPLE_FILES)) expect(existsSync(join(root_path, rel)), rel).toBe(true);
    expect(readFileSync(join(root_path, 'shop', 'checkout.py'), 'utf8')).toContain('from payments.card import charge');
  });
});
