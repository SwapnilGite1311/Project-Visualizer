import { getSetting } from '../../api/main';

export type ThemeChoice = 'system' | 'light' | 'dark';

export function applyTheme(theme: ThemeChoice): void {
  let resolved: 'light' | 'dark' = theme === 'light' ? 'light' : 'dark';
  if (theme === 'system') {
    const prefersLight = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;
    resolved = prefersLight ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = resolved;
}

export async function loadAndApplyTheme(): Promise<void> {
  try {
    applyTheme(await getSetting<ThemeChoice>('ui.theme', 'system'));
  } catch {
    applyTheme('system');
  }
}
