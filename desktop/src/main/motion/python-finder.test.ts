import { describe, expect, it, vi } from 'vitest';
import { findPython, pythonCandidates, type RunFn } from './python-finder';

function fakeRun(answers: Record<string, { code: number; stdout: string } | Error>): RunFn {
  return vi.fn(async (cmd: string) => {
    const a = answers[cmd];
    if (!a || a instanceof Error) throw a ?? new Error('ENOENT');
    return a;
  });
}

describe('python finder', () => {
  it('orders candidates per platform', () => {
    expect(pythonCandidates('win32').map((c) => c.command)).toEqual(['py', 'python', 'python3']);
    expect(pythonCandidates('linux').map((c) => c.command)).toEqual(['python3', 'python']);
    expect(pythonCandidates('darwin', '/opt/py/bin/python')[0]).toEqual({ command: '/opt/py/bin/python', args: [] });
  });

  it('tries the override first', async () => {
    const run = fakeRun({ 'C:/py/python.exe': { code: 0, stdout: '3.12.4\r\nC:\\py\\python.exe\r\n' } });
    expect(await findPython(run, 'win32', 'C:/py/python.exe')).toEqual({
      command: 'C:/py/python.exe',
      args: [],
      version: '3.12.4',
      executable: 'C:\\py\\python.exe',
    });
  });

  it('skips old versions and missing commands', async () => {
    const run = fakeRun({ python: { code: 0, stdout: '3.8.10\n/usr/bin/python\n' }, python3: { code: 0, stdout: '3.11.9\n/usr/bin/python3\n' } });
    const found = await findPython(run, 'win32');
    expect(found?.command).toBe('python3');
    expect(vi.mocked(run).mock.calls[0]).toEqual(['py', ['-3', '-c', expect.stringContaining('sys.version_info')]]);
  });

  it('returns null when nothing works', async () => {
    const run = fakeRun({ python3: { code: 9009, stdout: '' } });
    expect(await findPython(run, 'linux')).toBeNull();
  });
});
