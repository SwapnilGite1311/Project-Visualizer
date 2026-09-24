import { useId } from 'react';
import styles from './ui.module.css';

export interface TextInputProps {
  label: string;
  value: string;
  onChange(value: string): void;
  type?: 'text' | 'password' | 'url';
  placeholder?: string;
  multiline?: boolean;
}

export function TextInput({ label, value, onChange, type = 'text', placeholder, multiline }: TextInputProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className={styles.input}
          value={value}
          placeholder={placeholder}
          rows={6}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className={styles.input}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
