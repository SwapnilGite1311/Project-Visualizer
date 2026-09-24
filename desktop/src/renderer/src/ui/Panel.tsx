import type { ReactNode } from 'react';
import styles from './ui.module.css';

export interface PanelProps { title?: string; actions?: ReactNode; children: ReactNode }

export function Panel({ title, actions, children }: PanelProps) {
  return (
    <section className={styles.panel}>
      {(title || actions) && (
        <header className={styles.panelHeader}>
          <span className={styles.panelTitle}>{title}</span>
          {actions}
        </header>
      )}
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}
