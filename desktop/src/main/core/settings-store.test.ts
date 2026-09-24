import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SettingsStore } from './settings-store';

const tempFile = () => join(mkdtempSync(join(tmpdir(), 'pv-')), 'sub', 'settings.json');

describe('SettingsStore', () => {
  it('sets and gets values', () => {
    const s = new SettingsStore(tempFile());
    expect(s.get('theme', 'dark')).toBe('dark');
    s.set('theme', 'light');
    expect(s.get('theme', 'dark')).toBe('light');
  });

  it('persists across instances', () => {
    const file = tempFile();
    new SettingsStore(file).set('recent', ['a', 'b']);
    expect(new SettingsStore(file).get<string[]>('recent', [])).toEqual(['a', 'b']);
  });

  it('treats a corrupt file as empty', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'pv-')), 'settings.json');
    writeFileSync(file, '{ not json');
    expect(new SettingsStore(file).all()).toEqual({});
  });

  it('all() returns a copy', () => {
    const s = new SettingsStore(tempFile());
    s.set('x', { y: 1 });
    const copy = s.all();
    (copy.x as { y: number }).y = 2;
    expect(s.get<{ y: number }>('x', { y: 0 }).y).toBe(1);
  });
});
