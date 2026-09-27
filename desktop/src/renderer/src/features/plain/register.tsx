import { useEffect } from 'react';
import type { AppRegistry } from '../../core/registry';
import { PlainSettings } from './PlainSettings';
import { usePlainWordsStore } from './plain-store';

// Loads the simple-words setting once at start.
export function PlainWordsLoader() {
  useEffect(() => {
    void usePlainWordsStore.getState().load();
  }, []);
  return null;
}

export default function register(app: AppRegistry): void {
  app.addSettingsSection({ id: 'words', title: 'Words', order: 12, component: PlainSettings });
  app.addGlobal({ id: 'plain-words-loader', component: PlainWordsLoader });
}
