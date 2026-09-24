import styles from './ui.module.css';

export function Spinner() {
  return <span role="status" aria-label="Loading" className={styles.spinner} />;
}
