import { invoke } from '../../api/bridge';
import { notify } from '../../core/notify';
import type { NodeActionDef, NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useComponentStates } from './states-store';

async function copy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  notify.success('Copied');
}

const hasFile = (n: NodeRef) => !!n.file_path;

export function componentActions(): NodeActionDef[] {
  return [
    { id: 'pin', title: 'Pin / unpin', order: 40, run: (n) => useComponentStates.getState().togglePin(n.id) },
    { id: 'copy-name', title: 'Copy name', order: 70, run: (n) => copy(n.name) },
    { id: 'copy-id', title: 'Copy element id', order: 71, run: (n) => copy(n.id) },
    { id: 'copy-path', title: 'Copy file path', order: 72, when: hasFile, run: (n) => copy(n.file_path) },
    {
      id: 'show-in-folder',
      title: 'Show in file explorer',
      order: 80,
      when: hasFile,
      run: async (n) => {
        const root = useAppStore.getState().projectRoot;
        if (!root) return;
        try {
          await invoke('pv:shell.showItemInFolder', { path: root + '/' + n.file_path });
        } catch (e) {
          notify.error('Could not open the folder', e instanceof Error ? e.message : String(e));
        }
      },
    },
  ];
}
