import * as fs from 'node:fs';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { installRecorder, RECORDER_FILES, RECORDER_VERSION } from './recorder-files';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, writeFileSync: vi.fn(actual.writeFileSync) };
});

describe('recorder files', () => {
  it('bundles the recorder package', () => {
    expect(Object.keys(RECORDER_FILES).sort()).toEqual(['__init__.py', '__main__.py', 'cli.py', 'filters.py', 'recorder.py', 'reprs.py', 'writer.py']);
    expect(RECORDER_VERSION).toMatch(/^[0-9a-f]{12}$/);
  });

  it('installs once and reinstalls when the version changes', () => {
    const base = mkdtempSync(join(tmpdir(), 'pv-rec-'));
    const dir = installRecorder(base);
    expect(dir).toBe(join(base, 'recorder'));
    expect(readFileSync(join(dir, 'pv_trace', 'cli.py'), 'utf8')).toContain('def main');

    vi.mocked(fs.writeFileSync).mockClear();
    installRecorder(base);
    expect(fs.writeFileSync).not.toHaveBeenCalled();

    writeFileSync(join(dir, 'VERSION'), 'old');
    vi.mocked(fs.writeFileSync).mockClear();
    installRecorder(base);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(Object.keys(RECORDER_FILES).length + 1);
  });
});
