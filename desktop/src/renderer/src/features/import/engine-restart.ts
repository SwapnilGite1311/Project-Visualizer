import { onMainEvent } from '../../api/bridge';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { openProjectFlow } from './open-project';

// The engine service reports restarting → starting → ready after a crash; reopen the project on that ready.
export function watchEngineRestarts(): () => void {
  let restarting = false;
  return onMainEvent('pv:engine.status', (payload) => {
    const status = (payload as { status: string }).status;
    if (status === 'restarting') {
      restarting = true;
      return;
    }
    if (status !== 'ready' || !restarting) return;
    restarting = false;
    const root = useAppStore.getState().projectRoot;
    if (!root) return;
    void openProjectFlow(root).then((ok) => {
      if (ok) notify.info('The analysis engine restarted', 'Your project was reloaded.');
    });
  });
}
