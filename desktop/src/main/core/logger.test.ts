import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createLogger', () => {
  it('appends lines to the log file', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const file = join(mkdtempSync(join(tmpdir(), 'pv-')), 'logs', 'main.log');
    createLogger(file)('error', 'x', { a: 1 });
    const text = readFileSync(file, 'utf8');
    expect(text).toContain('ERROR x {"a":1}');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('logs only to the console without a file', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    createLogger(null)('info', 'hello');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain('INFO hello');
  });
});
