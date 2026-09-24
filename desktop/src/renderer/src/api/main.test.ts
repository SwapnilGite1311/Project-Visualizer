// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { installFakeBridge } from './fake-bridge';
import { getSetting, openFolderDialog, openInEditor } from './main';

describe('main channel wrappers', () => {
  it('getSetting sends key and fallback', async () => {
    const fake = installFakeBridge();
    fake.invokeHandlers.set('pv:settings.get', (p) => (p as { fallback: string }).fallback);
    await expect(getSetting('theme', 'dark')).resolves.toBe('dark');
    expect(fake.invokeCalls[0]).toEqual({ channel: 'pv:settings.get', payload: { key: 'theme', fallback: 'dark' } });
  });

  it('openFolderDialog returns null when cancelled', async () => {
    const fake = installFakeBridge();
    fake.invokeHandlers.set('pv:dialog.openFolder', () => null);
    await expect(openFolderDialog()).resolves.toBeNull();
  });

  it('openInEditor unwraps opened_with', async () => {
    const fake = installFakeBridge();
    fake.invokeHandlers.set('pv:editor.open', () => ({ opened_with: 'vscode' }));
    await expect(openInEditor('C:/code/a.py', 4)).resolves.toBe('vscode');
    expect(fake.invokeCalls[0].payload).toEqual({ file_path: 'C:/code/a.py', line: 4 });
  });
});
