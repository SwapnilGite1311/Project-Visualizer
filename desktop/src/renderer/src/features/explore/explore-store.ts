import { getLevelView } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { buildFocusOverlay } from './focus-overlay';

const LEVEL_NAMES: Record<number, string> = { 1: 'Packages', 2: 'Modules', 3: 'Classes', 4: 'Functions', 5: 'Statements' };

export function levelName(childLevel: number): string {
  return LEVEL_NAMES[childLevel] ?? 'Elements';
}

let subscribed = false;

// Moving to another level makes the focus meaningless, so it is cleared.
function clearFocusOnParentChange(): void {
  if (subscribed) return;
  subscribed = true;
  useAppStore.subscribe((s, prev) => {
    if (s.currentParentId !== prev.currentParentId && s.focusNodeId) clearFocus();
  });
}

export async function focusOn(nodeId: string): Promise<void> {
  clearFocusOnParentChange();
  const { projectId, currentParentId } = useAppStore.getState();
  if (!projectId) return;
  const view = await getLevelView(projectId, currentParentId);
  const app = useAppStore.getState();
  app.setOverlay('focus', buildFocusOverlay(view, nodeId));
  app.setFocus(nodeId);
}

export function clearFocus(): void {
  const app = useAppStore.getState();
  app.setOverlay('focus', null);
  app.setFocus(null);
}
