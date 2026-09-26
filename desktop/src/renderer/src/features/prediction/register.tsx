import { useEffect, useRef } from 'react';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { PredictionPanel } from './PredictionPanel';
import { usePredictionStore } from './prediction-store';

// Predictions belong to one project. A simulation sandbox (sim:) shows the same code, so they stay while in one.
export function PredictionReset() {
  const projectId = useAppStore((s) => s.projectId);
  const root = useAppStore((s) => s.projectRoot);
  const base = useRef<string | null>(null);
  useEffect(() => {
    if (root?.startsWith('sim:')) return;
    if (projectId === base.current) return;
    const first = base.current === null;
    base.current = projectId;
    if (!first) usePredictionStore.getState().clear();
  }, [projectId, root]);
  return null;
}

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'prediction', title: 'Predictions', area: 'right', order: 45, component: PredictionPanel });
  app.addGlobal({ id: 'prediction-reset', component: PredictionReset });
  app.addCommand({
    id: 'prediction.run',
    title: 'Predict failures and bottlenecks',
    run: async () => {
      useAppStore.getState().showPanel('right', 'prediction');
      await usePredictionStore.getState().loadCloud();
      await usePredictionStore.getState().predict();
    },
  });
}
