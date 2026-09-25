import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bridgeInfoPath, generateToken, removeBridgeInfo, writeBridgeInfo } from './bridge-info';

describe('bridge info', () => {
  it('lives in the home folder', () => {
    expect(bridgeInfoPath('/home/u')).toBe(join('/home/u', '.project-visualizer', 'bridge.json'));
  });

  it('writes, protects and removes the file', () => {
    const home = mkdtempSync(join(tmpdir(), 'pv-home-'));
    writeBridgeInfo({ port: 47101, token: 'abc', pid: 42 }, home);
    expect(JSON.parse(readFileSync(bridgeInfoPath(home), 'utf8'))).toEqual({ port: 47101, token: 'abc', pid: 42 });
    if (process.platform !== 'win32') expect(statSync(bridgeInfoPath(home)).mode & 0o777).toBe(0o600);
    removeBridgeInfo(home);
    expect(existsSync(bridgeInfoPath(home))).toBe(false);
    expect(() => removeBridgeInfo(home)).not.toThrow();
  });

  it('generates random 32-character tokens', () => {
    const a = generateToken();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(generateToken()).not.toBe(a);
  });
});
