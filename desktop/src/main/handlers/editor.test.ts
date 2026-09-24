import { describe, expect, it, vi } from 'vitest';
import { openInEditor } from './editor';

vi.mock('electron', () => ({ shell: { openPath: vi.fn(async () => '') } }));

describe('openInEditor', () => {
  it('uses VS Code when available', async () => {
    const spawnCode = vi.fn(async () => true);
    const openPath = vi.fn(async () => '');
    await expect(openInEditor('C:/code/a.py', 12, { spawnCode, openPath })).resolves.toBe('vscode');
    expect(spawnCode).toHaveBeenCalledWith(['-g', 'C:/code/a.py:12']);
    expect(openPath).not.toHaveBeenCalled();
  });

  it('falls back to the default application', async () => {
    const openPath = vi.fn(async () => '');
    await expect(openInEditor('C:/code/a.py', 3, { spawnCode: async () => false, openPath })).resolves.toBe('default');
    expect(openPath).toHaveBeenCalledWith('C:/code/a.py');
  });
});
