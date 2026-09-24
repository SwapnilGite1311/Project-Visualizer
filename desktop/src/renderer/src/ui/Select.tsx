import { useId } from 'react';
import styles from './ui.module.css';

export interface SelectProps { label: string; value: string; options: { value: string; label: string }[]; onChange(value: string): void }

export function Select({ label, value, options, onChange }: SelectProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select id={id} className={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
