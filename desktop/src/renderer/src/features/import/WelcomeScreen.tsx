import { useCallback, useEffect, useState } from 'react';
import { appRegistry, type RegistryReader } from '../../core/registry';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { useImportStore } from './import-store';
import { openFolderFlow, openProjectFlow } from './open-project';
import { ProgressView } from './ProgressView';
import { getRecentProjects, removeRecentProject } from './recent-projects';
import styles from './WelcomeScreen.module.css';

function folderName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function WelcomeScreen({ registry = appRegistry }: { registry?: RegistryReader }) {
  const loading = useImportStore((s) => s.loading);
  const [recent, setRecent] = useState<string[]>([]);

  const refresh = useCallback(() => {
    getRecentProjects()
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);
  useEffect(refresh, [refresh]);

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>Project Visualizer</h1>
          <p className={styles.tagline}>See your codebase as a living map.</p>
        </div>
        <div>
          <Button variant="primary" disabled={loading} onClick={() => void openFolderFlow()}>
            Open folder…
          </Button>
        </div>
        {registry.welcomeActions().length > 0 && (
          <div className={styles.actions}>
            {registry.welcomeActions().map((a) => (
              <button key={a.id} className={styles.action} disabled={loading} onClick={() => void a.run()}>
                <span>{a.title}</span>
                <span className={styles.actionDesc}>{a.description}</span>
              </button>
            ))}
          </div>
        )}
        <ProgressView />
        {recent.length > 0 && (
          <div>
            <h2 className={styles.sectionTitle}>Recent projects</h2>
            <ul className={styles.recent}>
              {recent.map((path) => (
                <li key={path} className={styles.recentItem}>
                  <button className={styles.recentButton} disabled={loading} onClick={() => void openProjectFlow(path)}>
                    <strong>{folderName(path)}</strong>
                    <span className={styles.recentPath}>{path}</span>
                  </button>
                  <IconButton
                    label={`Remove ${folderName(path)} from recent projects`}
                    disabled={loading}
                    onClick={() => void removeRecentProject(path).then(refresh)}
                  >
                    ×
                  </IconButton>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
