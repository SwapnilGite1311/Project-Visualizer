import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SettingsStore } from '../core/settings-store';
import { fakeContext } from '../core/test-context';
import register from './settings';

function setup() {
  const settings = new SettingsStore(join(mkdtempSync(join(tmpdir(), 'pv-')), 'settings.json'));
  const ctx = fakeContext({ settings });
  register(ctx);
  return ctx;
}

describe('settings handlers', () => {
  it('round trips a value', async () => {
    const ctx = setup();
    await expect(ctx.call('pv:settings.get', { key: 'theme', fallback: 'dark' })).resolves.toBe('dark');
    await expect(ctx.call('pv:settings.set', { key: 'theme', value: 'light' })).resolves.toBe(true);
    await expect(ctx.call('pv:settings.get', { key: 'theme' })).resolves.toBe('light');
    await expect(ctx.call('pv:settings.all')).resolves.toEqual({ theme: 'light' });
  });

  it('requires a key', async () => {
    const ctx = setup();
    await expect(ctx.call('pv:settings.get', { key: '' })).rejects.toThrow('key is required');
    await expect(ctx.call('pv:settings.set', {})).rejects.toThrow('key is required');
  });
});
