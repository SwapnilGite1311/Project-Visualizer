import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type SecretCrypto, SecretStore } from './secret-store';

const reverse = (s: string) => [...s].reverse().join('');
const fakeCrypto = (available = true): SecretCrypto => ({
  isAvailable: () => available,
  encrypt: (plain) => Buffer.from(reverse(plain), 'utf8'),
  decrypt: (data) => reverse(data.toString('utf8')),
});

describe('SecretStore', () => {
  it('sets, gets, checks and deletes', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'pv-')), 'secrets.json');
    const s = new SecretStore(file, fakeCrypto());
    s.set('ai.apiKey', 'sk-secret-123');
    expect(s.has('ai.apiKey')).toBe(true);
    expect(s.get('ai.apiKey')).toBe('sk-secret-123');
    expect(new SecretStore(file, fakeCrypto()).get('ai.apiKey')).toBe('sk-secret-123');
    s.delete('ai.apiKey');
    expect(s.has('ai.apiKey')).toBe(false);
    expect(s.get('ai.apiKey')).toBeNull();
  });

  it('never writes the plain value to disk', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'pv-')), 'secrets.json');
    new SecretStore(file, fakeCrypto()).set('k', 'plain-value');
    expect(readFileSync(file, 'utf8')).not.toContain('plain-value');
  });

  it('refuses to store without secure storage', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'pv-')), 'secrets.json');
    expect(() => new SecretStore(file, fakeCrypto(false)).set('k', 'v')).toThrow('secure storage not available');
  });
});
