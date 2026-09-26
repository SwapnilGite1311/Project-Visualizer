import { create } from 'zustand';
import type { RecommendRequest } from './local-rules';

// Signals other features push for the decision (simulation results, failure predictions, forecasts).
interface RecommendInputs {
  simulation: RecommendRequest['simulation'];
  failurePredictions: RecommendRequest['failure_predictions'];
  forecasts: RecommendRequest['forecasts'];
  setSimulation(v: RecommendRequest['simulation']): void;
  setFailurePredictions(v: RecommendRequest['failure_predictions']): void;
  setForecasts(v: RecommendRequest['forecasts']): void;
  reset(): void;
}

export const useRecommendInputs = create<RecommendInputs>()((set) => ({
  simulation: null,
  failurePredictions: null,
  forecasts: null,
  setSimulation: (simulation) => set({ simulation }),
  setFailurePredictions: (failurePredictions) => set({ failurePredictions }),
  setForecasts: (forecasts) => set({ forecasts }),
  reset: () => set({ simulation: null, failurePredictions: null, forecasts: null }),
}));
