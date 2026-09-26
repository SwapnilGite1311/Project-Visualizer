import { useEffect, useRef } from 'react';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { ForecastPanel } from './ForecastPanel';
import { useForecastStore } from './forecast-store';

// Forecasts belong to one project (a simulation sandbox keeps them, like the other decision inputs).
export function ForecastReset() {
  const projectId = useAppStore((s) => s.projectId);
  const root = useAppStore((s) => s.projectRoot);
  const base = useRef<string | null>(null);
  useEffect(() => {
    if (root?.startsWith('sim:')) return;
    if (projectId === base.current) return;
    const first = base.current === null;
    base.current = projectId;
    if (!first) useForecastStore.getState().clear();
  }, [projectId, root]);
  return null;
}

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'forecast', title: 'Forecast', area: 'right', order: 50, component: ForecastPanel });
  app.addGlobal({ id: 'forecast-reset', component: ForecastReset });
  app.addCommand({
    id: 'forecast.refresh',
    title: 'Forecast health of the visible modules',
    run: () => {
      useAppStore.getState().showPanel('right', 'forecast');
      return useForecastStore.getState().refreshIndicators();
    },
  });
}
