import { useMemo } from 'react';
import { EmptyState } from '../../ui/EmptyState';
import { useChangeStore } from '../change-preview/change-store';
import type { RecommendRequest } from './local-rules';
import { RecommendationCard } from './RecommendationCard';
import { useRecommendInputs } from './recommend-inputs';

// The Decision panel: one place for the go / caution / no-go answer.
export function RecommendationPanel() {
  const preview = useChangeStore((s) => s.preview);
  const simulation = useRecommendInputs((s) => s.simulation);
  const failurePredictions = useRecommendInputs((s) => s.failurePredictions);
  const forecasts = useRecommendInputs((s) => s.forecasts);
  const input = useMemo<RecommendRequest>(
    () => ({ change_preview: preview, simulation, failure_predictions: failurePredictions, forecasts }),
    [preview, simulation, failurePredictions, forecasts],
  );
  if (!preview && !simulation) return <EmptyState title="Preview a change or run a simulation to get a recommendation" />;
  return (
    <div style={{ padding: '8px 12px' }}>
      <RecommendationCard input={input} />
    </div>
  );
}
