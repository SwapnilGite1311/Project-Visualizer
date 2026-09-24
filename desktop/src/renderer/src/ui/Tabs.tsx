import type { KeyboardEvent } from 'react';
import styles from './ui.module.css';

export interface TabsProps { tabs: { id: string; title: string }[]; active: string | null; onChange(id: string): void }

export function Tabs({ tabs, active, onChange }: TabsProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const index = Math.max(0, tabs.findIndex((t) => t.id === active));
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (next) onChange(next.id);
  };
  return (
    <div role="tablist" className={styles.tabs} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          tabIndex={t.id === active ? 0 : -1}
          className={`${styles.tab} ${t.id === active ? styles.tabActive : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.title}
        </button>
      ))}
    </div>
  );
}
