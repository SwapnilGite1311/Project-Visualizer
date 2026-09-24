import type { ReactNode } from 'react';
import styles from './ui.module.css';

export interface BadgeProps { tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; children: ReactNode }

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  const toneClass = tone === 'danger' ? styles.dangerBadge : styles[tone];
  return <span className={`${styles.badge} ${toneClass}`}>{children}</span>;
}
