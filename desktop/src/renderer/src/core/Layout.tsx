import { Tabs } from '../ui/Tabs';
import { ErrorBoundary } from './ErrorBoundary';
import styles from './Layout.module.css';
import { type AppRegistry, appRegistry, type PanelArea, type RegistryReader } from './registry';
import { useAppStore } from './store';

type Registry = AppRegistry & RegistryReader;

function Area({ area, registry }: { area: PanelArea; registry: Registry }) {
  const activeId = useAppStore((s) => s.activePanel[area]);
  const showPanel = useAppStore((s) => s.showPanel);
  const panels = registry.panels(area);
  if (panels.length === 0) return <div className={`${styles.area} ${styles[area]}`} />;
  const active = panels.find((p) => p.id === activeId) ?? panels[0];
  const Component = active.component;
  return (
    <div className={`${styles.area} ${styles[area]}`} data-area={area}>
      {panels.length > 1 && (
        <Tabs tabs={panels.map((p) => ({ id: p.id, title: p.title }))} active={active.id} onChange={(id) => showPanel(area, id)} />
      )}
      <div className={styles.areaBody}>
        <ErrorBoundary key={active.id} name={active.title}>
          <Component />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export function Layout({ registry = appRegistry }: { registry?: Registry }) {
  const hasBottom = registry.panels('bottom').length > 0;
  return (
    <div className={`${styles.root} ${hasBottom ? '' : styles.noBottom}`}>
      <div className={styles.toolbar}>
        {registry.toolbarItems('left').map(({ id, component: Item }) => (
          <Item key={id} />
        ))}
        <div className={styles.spacer} />
        {registry.toolbarItems('right').map(({ id, component: Item }) => (
          <Item key={id} />
        ))}
      </div>
      <Area area="left" registry={registry} />
      <Area area="center" registry={registry} />
      <Area area="right" registry={registry} />
      {hasBottom && <Area area="bottom" registry={registry} />}
      <div className={styles.status}>
        {registry.statusItems().map(({ id, component: Item }) => (
          <Item key={id} />
        ))}
      </div>
    </div>
  );
}
