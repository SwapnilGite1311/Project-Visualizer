import { useEffect } from 'react';
import { invoke } from '../../api/bridge';
import { notify } from '../../core/notify';
import type { AppRegistry, NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { BridgeStatus } from './BridgeStatus';
import { startBridgeWatcher } from './bridge-watcher';

export function BridgeWatcher() {
  useEffect(() => startBridgeWatcher(), []);
  return null;
}

export async function openInVsCode(n: NodeRef): Promise<void> {
  const root = useAppStore.getState().projectRoot;
  if (!root) return;
  const r = await invoke<{ sent: boolean }>('pv:bridge.openInIde', { file_path: root + '/' + n.file_path, line: n.span.start_line || 1 });
  if (!r.sent) notify.info('VS Code extension not connected', 'Install the Project Visualizer extension.');
}

export default function register(app: AppRegistry): void {
  app.addGlobal({ id: 'bridge-watcher', component: BridgeWatcher });
  app.addStatusItem({ id: 'bridge', order: 20, component: BridgeStatus });
  app.addNodeAction({ id: 'open-in-vscode', title: 'Open in VS Code (extension)', order: 91, when: (n) => n.file_path !== '', run: openInVsCode });
}
