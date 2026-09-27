import { type KeyboardEvent, useId } from 'react';
import { Icon } from '../ui/Icon';
import styles from './Layout.module.css';
import type { RegistryReader } from './registry';
import { useAppStore } from './store';
import { activeWorkspace } from './workspaces';

// The dashboards, top to bottom on the far left: a picture and a short name each; the description is the tooltip.
export function WorkspaceRail({ registry }: { registry: Pick<RegistryReader, 'workspaces' | 'panels'> }) {
  const current = useAppStore((s) => s.workspace);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const all = registry.workspaces();
  const active = activeWorkspace(registry, current);
  const base = useId();
  if (all.length === 0) return null;

  const open = (i: number) => {
    const w = all[(i + all.length) % all.length];
    setWorkspace(w.id, w.start);
    document.getElementById(`${base}-${w.id}`)?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = all.findIndex((w) => w.id === active?.id);
    if (e.key === 'ArrowDown') open(i + 1);
    else if (e.key === 'ArrowUp') open(i - 1);
    else return;
    e.preventDefault();
  };

  return (
    <nav className={styles.rail} aria-label="Dashboards">
      <div role="tablist" aria-orientation="vertical" aria-label="Dashboards" onKeyDown={onKeyDown} className={styles.railList}>
        {all.map((w) => {
          const selected = w.id === active?.id;
          return (
            <button
              key={w.id}
              id={`${base}-${w.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-describedby={`${base}-${w.id}-d`}
              tabIndex={selected ? 0 : -1}
              title={`${w.title} — ${w.description}`}
              data-workspace={w.id}
              className={`${styles.railItem} ${selected ? styles.railItemActive : ''}`}
              onClick={() => setWorkspace(w.id, w.start)}
            >
              <Icon name={w.icon} size={20} />
              <span className={styles.railLabel}>{w.title}</span>
              <span id={`${base}-${w.id}-d`} hidden>
                {w.description}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
