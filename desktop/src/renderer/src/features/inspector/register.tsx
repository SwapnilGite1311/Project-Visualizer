import { openInEditor } from '../../api/main';
import { notify } from '../../core/notify';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { InspectorPanel } from './InspectorPanel';

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'inspector', title: 'Details', area: 'right', order: 10, component: InspectorPanel });
  app.addNodeAction({
    id: 'open-in-editor',
    title: 'Open in editor',
    order: 90,
    when: (n) => n.file_path !== '',
    run: async (n) => {
      const root = useAppStore.getState().projectRoot;
      if (!root) return;
      try {
        await openInEditor(`${root}/${n.file_path}`, n.span.start_line || 1);
      } catch (e) {
        notify.error('Could not open the editor', e instanceof Error ? e.message : String(e));
      }
    },
  });
}
