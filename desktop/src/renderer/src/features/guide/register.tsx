import { useEffect } from 'react';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { HelpButton } from './HelpButton';
import { HelpDialog } from './HelpDialog';
import { openSampleProject } from './sample';
import { TOPICS } from './topics';
import { Tour } from './Tour';
import { useHelpStore, useTourStore } from './tour-store';

// The first time a project is open, the tour starts by itself (once).
export function FirstRunTour() {
  const screen = useAppStore((s) => s.screen);
  useEffect(() => {
    if (screen !== 'workspace') return;
    const t = setTimeout(() => void useTourStore.getState().maybeStartFirstTime(), 900);
    return () => clearTimeout(t);
  }, [screen]);
  return null;
}

export default function register(app: AppRegistry): void {
  app.addToolbarItem({ id: 'help-button', order: 95, side: 'right', component: HelpButton });
  app.addGlobal({ id: 'help-dialog', component: HelpDialog });
  app.addGlobal({ id: 'tour', component: Tour });
  app.addGlobal({ id: 'first-run-tour', component: FirstRunTour });
  app.addCommand({ id: 'help.open', title: 'Help — how do I…', shortcut: 'F1', run: () => useHelpStore.getState().show() });
  app.addCommand({ id: 'help.tour', title: 'Take the tour', run: () => useTourStore.getState().start() });
  for (const t of TOPICS) app.addCommand({ id: `help.${t.id}`, title: `Help: ${t.title}`, run: () => useHelpStore.getState().show(t.id) });
  app.addWelcomeAction({
    id: 'sample-project',
    title: 'Try a sample project',
    description: 'A small online shop to explore — no project of your own needed',
    order: 5,
    run: () => void openSampleProject(),
  });
}
