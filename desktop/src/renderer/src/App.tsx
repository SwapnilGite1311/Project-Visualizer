import { useEffect } from 'react';
import { CommandPaletteHost } from './core/CommandPalette';
import { Layout } from './core/Layout';
import { type AppRegistry, appRegistry, type RegistryReader } from './core/registry';
import { installShortcuts } from './core/shortcuts';
import { useAppStore } from './core/store';
import { Toasts } from './core/Toasts';
import { EmptyState } from './ui/EmptyState';

export function App({ registry = appRegistry }: { registry?: AppRegistry & RegistryReader }) {
  const screen = useAppStore((s) => s.screen);

  useEffect(() => installShortcuts(() => registry.commands()), [registry]);

  let content;
  if (screen === 'workspace') {
    content = <Layout registry={registry} />;
  } else {
    const Screen = registry.screen(screen)?.component;
    content = Screen ? <Screen /> : <EmptyState title="Nothing to show" />;
  }

  return (
    <>
      {content}
      {registry.globals().map(({ id, component: Global }) => (
        <Global key={id} />
      ))}
      <Toasts />
      <CommandPaletteHost />
    </>
  );
}
