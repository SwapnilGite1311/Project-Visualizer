import { onEngineNotification } from '../../api/bridge';
import { projectStatus } from '../../api/engine';
import type { ProgressParams, ProjectStatus } from '../../api/types';

export function waitForReady(
  projectId: string,
  onProgress: (p: ProgressParams) => void,
  timeoutMs = 600000,
): Promise<ProjectStatus> {
  return new Promise<ProjectStatus>((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      off();
      clearInterval(poll);
      clearTimeout(timeout);
      fn();
    };
    const check = async () => {
      try {
        const status = await projectStatus(projectId);
        if (status.state === 'ready') finish(() => resolve(status));
        else if (status.state === 'error') finish(() => reject(new Error(status.error_message || 'Loading failed')));
      } catch (e) {
        finish(() => reject(e instanceof Error ? e : new Error(String(e))));
      }
    };
    const off = onEngineNotification('project.progress', (params) => {
      const p = params as ProgressParams;
      if (p.project_id !== projectId) return;
      onProgress(p);
      if (p.state === 'ready' || p.state === 'error') void check();
    });
    const poll = setInterval(() => void check(), 1000);
    const timeout = setTimeout(() => finish(() => reject(new Error('Loading timed out'))), timeoutMs);
    void check();
  });
}
