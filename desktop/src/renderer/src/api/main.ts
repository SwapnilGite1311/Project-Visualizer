import { invoke } from './bridge';

export interface AppInfo { version: string; platform: string; engineStatus: string; enginePath: string }

export const appInfo = () => invoke<AppInfo>('pv:app.info');
export const restartEngine = () => invoke<boolean>('pv:engine.restart');
export const openFolderDialog = () => invoke<string | null>('pv:dialog.openFolder');
export const getSetting = <T>(key: string, fallback: T) => invoke<T>('pv:settings.get', { key, fallback });
export const setSetting = (key: string, value: unknown) => invoke<boolean>('pv:settings.set', { key, value });
export const allSettings = () => invoke<Record<string, unknown>>('pv:settings.all');
export const setSecret = (name: string, value: string) => invoke<boolean>('pv:secrets.set', { name, value });
export const hasSecret = (name: string) => invoke<boolean>('pv:secrets.has', { name });
export const deleteSecret = (name: string) => invoke<boolean>('pv:secrets.delete', { name });
export async function openInEditor(absPath: string, line: number): Promise<'vscode' | 'default'> {
  const r = await invoke<{ opened_with: 'vscode' | 'default' }>('pv:editor.open', { file_path: absPath, line });
  return r.opened_with;
}
