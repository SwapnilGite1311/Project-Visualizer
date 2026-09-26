import { useEffect, useRef } from 'react';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { RecommendationPanel } from './RecommendationPanel';
import { useRecommendInputs } from './recommend-inputs';

// Signals belong to one project: forget them when another project opens. Going into a simulation sandbox (sim:) and
// back to the same project is still the same decision, so the simulation result is kept then.
export function RecommendInputsReset() {
  const projectId = useAppStore((s) => s.projectId);
  const root = useAppStore((s) => s.projectRoot);
  const base = useRef<string | null>(null);
  useEffect(() => {
    if (root?.startsWith('sim:')) return;
    if (projectId === base.current) return;
    base.current = projectId;
    useRecommendInputs.getState().reset();
  }, [projectId, root]);
  return null;
}

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'recommendation', title: 'Decision', area: 'right', order: 40, component: RecommendationPanel });
  app.addGlobal({ id: 'recommend-inputs-reset', component: RecommendInputsReset });
}
