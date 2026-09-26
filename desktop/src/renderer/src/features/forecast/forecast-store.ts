import { create } from 'zustand';
import { invoke, rpc } from '../../api/bridge';
import { getLevelView } from '../../api/engine';
import type { NodeStyle } from '../../core/overlay';
import { useAppStore } from '../../core/store';
import { useHealthStore } from '../health/health-store';
import { useRecommendInputs } from '../recommend/recommend-inputs';
import {
  confidenceOf,
  type ForecastMetric,
  type ForecastPoint,
  forecastPoints,
  type PredictedState,
  predictedState,
  type SeriesPoint,
} from './local-models';

export const HOUR = 3_600_000;
export const HISTORY_HOURS = 48;
export const HORIZON_HOURS = 24;
export const MAX_INDICATORS = 30;
export const FORECAST_OVERLAY = 'forecast';
const METRICS: ForecastMetric[] = ['error_rate', 'p95_ms'];

export interface MetricForecast {
  history: SeriesPoint[];
  forecast: ForecastPoint[];
  state: PredictedState;
  confidence: number;
  anomalies: Array<{ t: number; v: number }>;
}
interface SeriesIn {
  node_id: string;
  metric: string;
  points: SeriesPoint[];
}
interface ForecastOut {
  node_id: string;
  metric: string;
  points: ForecastPoint[];
  predicted_state: PredictedState;
  confidence: number;
}

interface ForecastState {
  nodeId: string | null;
  metrics: Partial<Record<ForecastMetric, MetricForecast>>;
  method: 'cloud' | 'local' | null;
  loading: boolean;
  error: string | null;
  checking: boolean;
  risingIds: string[];
  forecastNode(nodeId: string): Promise<void>;
  refreshIndicators(): Promise<void>;
  clear(): void;
}

async function series(projectId: string, nodeId: string, metric: string, now: number): Promise<SeriesPoint[]> {
  const r = await rpc<{ points: SeriesPoint[] }>('metrics.series', {
    project_id: projectId,
    node_id: nodeId,
    metric,
    from_ms: now - HISTORY_HOURS * HOUR,
    to_ms: now,
    bucket_ms: HOUR,
  });
  return r.points;
}

// The engine returns every hour of the window (0 when nothing ran); only the hours with requests are history.
async function history(projectId: string, nodeId: string, metrics: ForecastMetric[], now: number): Promise<SeriesIn[]> {
  const [calls, ...values] = await Promise.all(['calls', ...metrics].map((m) => series(projectId, nodeId, m, now)));
  const active = new Set(calls.filter((p) => p.v > 0).map((p) => p.t));
  return metrics.map((metric, i) => ({ node_id: nodeId, metric, points: values[i].filter((p) => active.has(p.t)) }));
}

function forecastLocally(series: SeriesIn[]): ForecastOut[] {
  return series.map((s) => {
    const points = forecastPoints(s.points, HORIZON_HOURS, HOUR, s.metric);
    return {
      node_id: s.node_id,
      metric: s.metric,
      points,
      predicted_state: s.points.length ? predictedState(s.metric, points) : 'unknown',
      confidence: confidenceOf(s.points.length),
    };
  });
}

// The cloud model when signed in, else (or when it fails) the local one.
async function forecastAll(series: SeriesIn[]): Promise<{ forecasts: ForecastOut[]; method: 'cloud' | 'local' }> {
  const withData = series.filter((s) => s.points.length > 0);
  if (withData.length > 0 && (await invoke<boolean>('pv:ml.available').catch(() => false))) {
    try {
      const r = await invoke<{ forecasts: ForecastOut[] }>('pv:ml.forecast', { series: withData, horizon: HORIZON_HOURS, step_ms: HOUR });
      const empty = forecastLocally(series.filter((s) => s.points.length === 0));
      return { forecasts: [...r.forecasts, ...empty], method: 'cloud' };
    } catch {
      // fall through to the local model
    }
  }
  return { forecasts: forecastLocally(series), method: 'local' };
}

const RANK: Record<string, number> = { unknown: -1, ok: 0, warning: 1, stalled: 2, error: 2 };
export const worseThan = (predicted: string, current: string) => (RANK[predicted] ?? -1) > (RANK[current] ?? -1) && predicted !== 'ok';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
let requestSeq = 0;

export const useForecastStore = create<ForecastState>()((set) => ({
  nodeId: null,
  metrics: {},
  method: null,
  loading: false,
  error: null,
  checking: false,
  risingIds: [],

  async forecastNode(nodeId) {
    const pid = useAppStore.getState().projectId;
    if (!pid) return;
    const seq = ++requestSeq;
    set({ nodeId, loading: true, error: null });
    try {
      const now = Date.now();
      const input = await history(pid, nodeId, METRICS, now);
      const [{ forecasts, method }, anomalies] = await Promise.all([
        forecastAll(input),
        invoke<{ results: Array<{ metric: string; anomalies: Array<{ t: number; v: number }> }> }>('pv:ml.anomalies', {
          series: input.filter((s) => s.points.length > 0),
        }).catch(() => ({ results: [] })),
      ]);
      if (seq !== requestSeq) return; // another node was selected meanwhile
      const metrics: ForecastState['metrics'] = {};
      for (const s of input) {
        const f = forecasts.find((x) => x.metric === s.metric);
        metrics[s.metric as ForecastMetric] = {
          history: s.points,
          forecast: f?.points ?? [],
          state: f?.predicted_state ?? 'unknown',
          confidence: f?.confidence ?? 0,
          anomalies: (anomalies.results.find((r) => r.metric === s.metric)?.anomalies ?? []).map(({ t, v }) => ({ t, v })),
        };
      }
      set({ metrics, method, loading: false });
    } catch (e) {
      if (seq === requestSeq) set({ loading: false, error: message(e) });
    }
  },

  // Error-rate forecasts for the elements on screen; the ones heading to a worse state than now get a badge (above the
  // health colors, which show the state now).
  async refreshIndicators() {
    const app = useAppStore.getState();
    const pid = app.projectId;
    if (!pid) return;
    set({ checking: true, error: null });
    try {
      const view = await getLevelView(pid, app.currentParentId);
      const nodes = view.nodes.slice(0, MAX_INDICATORS);
      const now = Date.now();
      const input = await Promise.all(
        nodes.map(async (n) => (await history(pid, n.id, ['error_rate'], now).catch(() => []))[0] ?? { node_id: n.id, metric: 'error_rate', points: [] }),
      );
      const { forecasts } = await forecastAll(input.filter((s) => s.points.length > 0));
      const health = useHealthStore.getState().states;
      const risingIds = forecasts.filter((f) => worseThan(f.predicted_state, health[f.node_id]?.state ?? 'ok')).map((f) => f.node_id);
      const styles: Record<string, NodeStyle> = Object.fromEntries(risingIds.map((id) => [id, { badge: 'risk up' }]));
      useAppStore.getState().setOverlay(FORECAST_OVERLAY, risingIds.length ? { priority: 32, nodes: styles, edges: {} } : null);
      useRecommendInputs.getState().setForecasts({
        forecasts: forecasts.map((f) => ({ node_id: f.node_id, predicted_state: f.predicted_state, confidence: f.confidence })),
      });
      set({ checking: false, risingIds });
    } catch (e) {
      set({ checking: false, error: message(e) });
    }
  },

  clear() {
    requestSeq++;
    useAppStore.getState().setOverlay(FORECAST_OVERLAY, null);
    useRecommendInputs.getState().setForecasts(null);
    set({ nodeId: null, metrics: {}, method: null, loading: false, error: null, checking: false, risingIds: [] });
  },
}));
