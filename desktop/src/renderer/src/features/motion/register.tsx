import { notify } from '../../core/notify';
import type { AppRegistry, NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { InsideView } from './InsideView';
import { MapMotionSync } from './MapMotionSync';
import { MotionPanel } from './MotionPanel';
import { useMotionStore } from './motion-store';
import { startWalkthrough } from './walkthrough';

const RUNNABLE = new Set(['function', 'method', 'module']);

export function watchInside(node: NodeRef): void {
  const { steps } = useMotionStore.getState();
  const first = steps.find((s) => s.kind === 'call' && s.node_id === node.id);
  if (!first) {
    notify.info(`${node.name} did not run in this recording`);
    return;
  }
  const motion = useMotionStore.getState();
  motion.pause();
  motion.setMode('inside');
  motion.seek(first.i);
  useAppStore.getState().showPanel('center', 'motion-inside');
}

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'motion', title: 'Code Motion', area: 'bottom', order: 20, component: MotionPanel });
  app.addPanel({ id: 'motion-inside', title: 'Inside view', area: 'center', order: 20, component: InsideView });
  app.addGlobal({ id: 'motion-map-sync', component: MapMotionSync });
  app.addCommand({
    id: 'motion.open',
    title: 'Code Motion: record and play',
    shortcut: 'Ctrl+Shift+M',
    run: () => useAppStore.getState().showPanel('bottom', 'motion'),
  });
  app.addNodeAction({
    id: 'motion-walkthrough',
    title: 'Walk through from here',
    order: 35,
    when: (n) => RUNNABLE.has(n.kind),
    run: (n) => {
      useAppStore.getState().showPanel('bottom', 'motion');
      return startWalkthrough(n).catch((e: unknown) => {
        notify.error('Could not walk through', e instanceof Error ? e.message : String(e));
      });
    },
  });
  app.addNodeAction({
    id: 'motion-watch',
    title: 'Watch this run inside',
    order: 36,
    when: (n) => (n.kind === 'function' || n.kind === 'method') && useMotionStore.getState().status === 'ready',
    run: watchInside,
  });
}
