import type { ReactNode } from 'react';
import styles from './ui.module.css';

export interface IconButtonProps { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }

export function IconButton({ label, onClick, children, disabled }: IconButtonProps) {
  return (
    <button type="button" className={styles.iconButton} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
