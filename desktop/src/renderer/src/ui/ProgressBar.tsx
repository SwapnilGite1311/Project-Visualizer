import styles from './ui.module.css';

export interface ProgressBarProps { value: number; max: number; label?: string }

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={styles.progress}
    >
      <div className={styles.progressFill} style={{ width: `${percent}%` }} />
    </div>
  );
}
