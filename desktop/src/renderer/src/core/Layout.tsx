import { type CSSProperties, useEffect, useRef } from 'react';
import { Tabs } from '../ui/Tabs';
import { ErrorBoundary } from './ErrorBoundary';
import styles from './Layout.module.css';
import { sizeVariables, usePanelSizes } from './panel-sizes';
import { type AppRegistry, appRegistry, type PanelArea, type RegistryReader } from './registry';
import { Splitter } from './Splitter';
import { useAppStore } from './store';
import { WorkspaceRail } from './WorkspaceRail';
import { panelsFor, workspaceWith } from './workspaces';

type Registry = AppRegistry & RegistryReader;

function Area({ area, registry }: { area: PanelArea; registry: Registry }) {
  const activeId = useAppStore((s) => s.activePanel[area]);
  const showPanel = useAppStore((s) => s.showPanel);
  const workspace = useAppStore((s) => s.workspace);
  const panels = panelsFor(registry, area, workspace);
  if (panels.length === 0) return <div className={`${styles.area} ${styles[area]}`} />;
  const active = panels.find((p) => p.id === activeId) ?? panels[0];
  const Component = active.component;
  return (
    <div className={`${styles.area} ${styles[area]}`} data-area={area}>
      {area !== 'center' && <Splitter area={area} />}
      {panels.length > 1 && (
        <Tabs
          tabs={panels.map((p) => ({ id: p.id, title: p.title }))}
          active={active.id}
          onChange={(id) => showPanel(area, id)}
        />
      )}
      <div className={styles.areaBody}>
        <ErrorBoundary key={active.id} name={active.title}>
          <Component />
        </ErrorBoundary>
      </div>
    </div>
  );
}

// A feature asked for a panel (showPanel) that the open dashboard hides: go to a dashboard that has it.
function useFollowPanelRequests(registry: Registry) {
  const activePanel = useAppStore((s) => s.activePanel);
  const previous = useRef(activePanel);
  useEffect(() => {
    const before = previous.current;
    previous.current = activePanel;
    const { workspace, setWorkspace } = useAppStore.getState();
    for (const area of Object.keys(activePanel) as PanelArea[]) {
      const id = activePanel[area];
      if (!id || id === before[area]) continue;
      if (panelsFor(registry, area, workspace).some((p) => p.id === id)) continue;
      const target = workspaceWith(registry, area, id);
      if (target && target.id !== workspace) setWorkspace(target.id, { ...target.start, [area]: id });
      return;
    }
  }, [activePanel, registry]);
}

export function Layout({ registry = appRegistry }: { registry?: Registry }) {
  const workspace = useAppStore((s) => s.workspace);
  const sizes = usePanelSizes((s) => s.sizes);
  useFollowPanelRequests(registry);
  const has = (area: PanelArea) => panelsFor(registry, area, workspace).length > 0;
  const hasBottom = has('bottom');
  const hasRail = registry.workspaces().length > 0;
  const vars: Record<string, string> = { ...(sizeVariables(sizes) as Record<string, string>) };
  if (!has('left')) vars['--left-w'] = '0px';
  if (!has('right')) vars['--right-w'] = '0px';
  if (!hasRail) vars['--rail-w'] = '0px';
  return (
    <div className={`${styles.root} ${hasBottom ? '' : styles.noBottom}`} style={vars as CSSProperties} data-workspace={workspace}>
      <div className={styles.toolbar}>
        {registry.toolbarItems('left').map(({ id, component: Item }) => (
          <Item key={id} />
        ))}
        <div className={styles.spacer} />
        {registry.toolbarItems('right').map(({ id, component: Item }) => (
          <Item key={id} />
        ))}
      </div>
      {hasRail && <WorkspaceRail registry={registry} />}
      {has('left') && <Area area="left" registry={registry} />}
      <Area area="center" registry={registry} />
      {has('right') && <Area area="right" registry={registry} />}
      {hasBottom && <Area area="bottom" registry={registry} />}
      <div className={styles.status}>
        {registry.statusItems().map(({ id, component: Item }) => (
          <Item key={id} />
        ))}
      </div>
    </div>
  );
}
