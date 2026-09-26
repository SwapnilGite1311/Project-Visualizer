// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { useHealthStore } from '../health/health-store';
import { useRecommendInputs } from '../recommend/recommend-inputs';
import { HOUR, useForecastStore, worseThan } from './forecast-store';

const series = (values: number[]) => values.map((v, i) => ({ t: i * HOUR, v }));
const NODE = (id: string) => ({ id, kind: 'module', name: id, qualified_name: id, file_path: '', language: '', level: 2, parent_id: 'project:', metrics: {} });

let fake: FakeBridge;
let data: Record<string, Record<string, number[]>>;

beforeEach(() => {
  fake = installFakeBridge();
  data = {};
  fake.rpcHandlers.set('metrics.series', (p) => {
    const q = p as { node_id: string; metric: string };
    const own = data[q.node_id] ?? {};
    // Traffic in every hour that has a value, unless the case says otherwise.
    const calls = own.calls ?? Array.from({ length: Math.max(0, ...Object.values(own).map((v) => v.length)) }, () => 1);
    return { points: series(q.metric === 'calls' ? calls : (own[q.metric] ?? [])) };
  });
  fake.invokeHandlers.set('pv:ml.available', () => false);
  fake.invokeHandlers.set('pv:ml.anomalies', () => ({ results: [] }));
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/app');
  useHealthStore.setState({ states: {} });
  useRecommendInputs.getState().reset();
  useForecastStore.getState().clear();
});

describe('forecast store', () => {
  it('forecasts both metrics of a node locally for 24 hours from 48 hours of history', async () => {
    data.n = { error_rate: [0.01, 0.02, 0.03, 0.04], p95_ms: [100, 100, 100, 100] };
    await useForecastStore.getState().forecastNode('n');
    const s = useForecastStore.getState();
    expect(s.method).toBe('local');
    expect(s.metrics.error_rate?.history).toHaveLength(4);
    expect(s.metrics.error_rate?.forecast).toHaveLength(24);
    expect(s.metrics.error_rate?.state).toBe('error');
    expect(s.metrics.p95_ms?.state).toBe('ok');
    expect(s.metrics.p95_ms?.confidence).toBeCloseTo(4 / 48, 3);
    const q = fake.rpcCalls.find((c) => c.method === 'metrics.series')?.params as { from_ms: number; to_ms: number; bucket_ms: number };
    expect(q.to_ms - q.from_ms).toBe(48 * HOUR);
    expect(q.bucket_ms).toBe(HOUR);
  });

  it('only counts the hours with requests as history', async () => {
    data.n = { calls: [0, 0, 5, 0, 5], error_rate: [0, 0, 0.2, 0, 0.4], p95_ms: [0, 0, 30, 0, 50] };
    await useForecastStore.getState().forecastNode('n');
    const s = useForecastStore.getState();
    expect(s.metrics.error_rate?.history).toEqual([
      { t: 2 * HOUR, v: 0.2 },
      { t: 4 * HOUR, v: 0.4 },
    ]);
    expect(s.metrics.p95_ms?.confidence).toBeCloseTo(2 / 48, 3);
  });

  it('uses the cloud forecast when signed in and keeps the anomalies', async () => {
    data.n = { error_rate: [0.1, 0.2], p95_ms: [] };
    fake.invokeHandlers.set('pv:ml.available', () => true);
    fake.invokeHandlers.set('pv:ml.forecast', (p) => {
      expect((p as { series: unknown[]; horizon: number }).series).toHaveLength(1);
      return { forecasts: [{ node_id: 'n', metric: 'error_rate', points: [{ t: 1, v: 0.3, lower: 0.2, upper: 0.4 }], predicted_state: 'error', confidence: 0.9 }] };
    });
    fake.invokeHandlers.set('pv:ml.anomalies', () => ({ results: [{ node_id: 'n', metric: 'error_rate', anomalies: [{ t: HOUR, v: 0.2, score: 5, direction: 'up' }] }] }));
    await useForecastStore.getState().forecastNode('n');
    const s = useForecastStore.getState();
    expect(s.method).toBe('cloud');
    expect(s.metrics.error_rate).toMatchObject({ state: 'error', confidence: 0.9, anomalies: [{ t: HOUR, v: 0.2 }] });
    expect(s.metrics.p95_ms).toMatchObject({ history: [], forecast: [], state: 'unknown' });
  });

  it('marks visible modules heading to a worse state and feeds the decision', async () => {
    fake.rpcHandlers.set('graph.level_view', () => ({ parent: NODE('project:'), nodes: [NODE('a'), NODE('b'), NODE('c'), NODE('d')], edges: [] }));
    data.a = { error_rate: [0, 0.02, 0.04, 0.06] }; // rising to error
    data.b = { error_rate: [0.2, 0.2, 0.2] }; // already failing
    data.c = { error_rate: [0, 0, 0] }; // quiet
    useHealthStore.setState({ states: { b: { state: 'error', calls: 1, errors: 1, error_rate: 0.2, p95_ms: 1, stalled: false, reason: '' } } });
    await useForecastStore.getState().refreshIndicators();
    expect(useForecastStore.getState().risingIds).toEqual(['a']);
    expect(useAppStore.getState().overlays.forecast).toEqual({ priority: 32, nodes: { a: { badge: 'risk up' } }, edges: {} });
    expect(useRecommendInputs.getState().forecasts?.forecasts.map((f) => f.node_id)).toEqual(['a', 'b', 'c']);
  });

  it('compares health states', () => {
    expect(worseThan('error', 'warning')).toBe(true);
    expect(worseThan('warning', 'ok')).toBe(true);
    expect(worseThan('warning', 'error')).toBe(false);
    expect(worseThan('ok', 'unknown')).toBe(false);
  });
});
