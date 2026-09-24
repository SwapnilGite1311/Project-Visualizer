import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { IconButton } from '../../ui/IconButton';
import { AiSettings } from './AiSettings';
import { GeneralSettings } from './GeneralSettings';
import { SettingsModal } from './SettingsModal';
import { loadAndApplyTheme } from './theme';

function SettingsButton() {
  return (
    <IconButton label="Settings" onClick={() => useAppStore.getState().setSettingsOpen(true)}>
      ⚙
    </IconButton>
  );
}

function SettingsModalHost() {
  return <SettingsModal />;
}

export default function register(app: AppRegistry): void {
  app.addSettingsSection({ id: 'ai', title: 'AI', order: 10, component: AiSettings });
  app.addSettingsSection({ id: 'general', title: 'General', order: 20, component: GeneralSettings });
  app.addGlobal({ id: 'settings-modal', component: SettingsModalHost });
  app.addToolbarItem({ id: 'settings-button', order: 100, side: 'right', component: SettingsButton });
  app.addCommand({
    id: 'settings.open',
    title: 'Open settings',
    shortcut: 'Ctrl+,',
    run: () => useAppStore.getState().setSettingsOpen(true),
  });
  void loadAndApplyTheme();
}
