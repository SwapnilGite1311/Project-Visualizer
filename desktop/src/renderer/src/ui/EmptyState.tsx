import type { ReactNode } from 'react';
import styles from './ui.module.css';

export interface EmptyStateProps { title: string; detail?: string; action?: ReactNode }

export function EmptyState({ title, detail, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>{title}</div>
      {detail && <div className={styles.emptyDetail}>{detail}</div>}
      {action}
    </div>
  );
}
