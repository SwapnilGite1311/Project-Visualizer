import type { ReactNode } from 'react';
import styles from './ui.module.css';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  children: ReactNode;
  title?: string;
}

export function Button({ variant = 'secondary', size = 'md', disabled, onClick, type = 'button', children, title }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
