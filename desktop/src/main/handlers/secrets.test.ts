import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SecretStore } from '../core/secret-store';
import { fakeContext } from '../core/test-context';
import register from './secrets';

describe('secrets handlers', () => {
  it('sets, checks and deletes without ever returning the value', async () => {
    const secrets = new SecretStore(join(mkdtempSync(join(tmpdir(), 'pv-')), 'secrets.json'), {
      isAvailable: () => true,
      encrypt: (s) => Buffer.from(s, 'utf8'),
      decrypt: (b) => b.toString('utf8'),
    });
    const ctx = fakeContext({ secrets });
    register(ctx);
    await expect(ctx.call('pv:secrets.set', { name: 'ai.apiKey', value: 'sk-1' })).resolves.toBe(true);
    await expect(ctx.call('pv:secrets.has', { name: 'ai.apiKey' })).resolves.toBe(true);
    await expect(ctx.call('pv:secrets.delete', { name: 'ai.apiKey' })).resolves.toBe(true);
    await expect(ctx.call('pv:secrets.has', { name: 'ai.apiKey' })).resolves.toBe(false);
    expect([...ctx.handlers.keys()].sort()).toEqual(['pv:secrets.delete', 'pv:secrets.has', 'pv:secrets.set']);
    expect(ctx.handlers.has('pv:secrets.get')).toBe(false);
  });
});
