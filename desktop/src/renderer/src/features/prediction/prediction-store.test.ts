// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { useRecommendInputs } from '../recommend/recommend-inputs';
import { buildPredictionOverlay, cloudProjectKey, POLL_MS, usePredictionStore } from './prediction-store';

const HOTSPOT = (node_id: string, complexity: number) => ({
  node_id,
  kind: 'function',
  name: node_id,
  file_path: 'a.py',
  score: 1,
  reasons: [],
  metrics: { loc: 1, complexity, fan_in: 0, fan_out: 0 },
});

let fake: FakeBridge;
let settings: Map<string, unknown>;

beforeEach(() => {
  fake = installFakeBridge();
  settings = new Map();
  fake.invokeHandlers.set('pv:settings.get', (p) => {
    const q = p as { key: string; fallback: unknown };
    return settings.has(q.key) ? settings.get(q.key) : q.fallback;
  });
  fake.invokeHandlers.set('pv:settings.set', (p) => {
    const q = p as { key: string; value: unknown };
    settings.set(q.key, q.value);
    return true;
  });
  fake.invokeHandlers.set('pv:ml.available', () => false);
  fake.rpcHandlers.set('analysis.hotspots', () => ({ hotspots: [HOTSPOT('function:a.py#f', 30), HOTSPOT('function:a.py#g', 1)] }));
  fake.rpcHandlers.set('metrics.series', (p) => {
    const q = p as { node_id: string; metric: string };
    if (q.node_id !== 'function:a.py#f') return { points: [] };
    return { points: [{ t: 0, v: { calls: 10, errors: 9, stalls: 1 }[q.metric] ?? 0 }] };
  });
  fake.rpcHandlers.set('graph.ancestors', () => ({ nodes: [{ id: 'file:a.py' }, { id: 'module:app' }] }));
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/app');
  useRecommendInputs.getState().reset();
  usePredictionStore.getState().clear();
  usePredictionStore.setState(usePredictionStore.getInitialState());
});
afterEach(() => vi.useRealTimers());

describe('prediction overlay', () => {
  it('colors by probability and gives containers their riskiest child', () => {
    const o = buildPredictionOverlay(
      [
        { node_id: 'a', probability: 0.75, top_factors: [] },
        { node_id: 'b', probability: 0.45, top_factors: [] },
        { node_id: 'c', probability: 0.25, top_factors: [] },
        { node_id: 'd', probability: 0.1, top_factors: [] },
      ],
      { a: ['mod'], b: ['mod'], c: ['other'] },
    );
    expect(o.priority).toBe(25);
    expect(o.nodes.a).toEqual({ color: '#ef4444', badge: '75%' });
    expect(o.nodes.b.color).toBe('#f97316');
    expect(o.nodes.c.color).toBe('#eab308');
    expect(o.nodes.d).toBeUndefined();
    expect(o.nodes.mod).toEqual({ color: '#ef4444', badge: '75%' });
    expect(o.nodes.other.badge).toBe('25%');
  });
});

describe('prediction store', () => {
  it('predicts locally without the cloud and feeds the map and the decision', async () => {
    await usePredictionStore.getState().loadCloud();
    await usePredictionStore.getState().predict();
    const s = usePredictionStore.getState();
    expect(s.method).toBe('local');
    expect(s.predictions[0]).toMatchObject({ node_id: 'function:a.py#f', top_factors: ['recent errors', 'high complexity', 'stalls'] });
    expect(s.predictions[0].probability).toBeCloseTo(0.66, 6);
    const overlay = useAppStore.getState().overlays.prediction;
    expect(overlay.nodes['function:a.py#f'].badge).toBe('66%');
    expect(overlay.nodes['module:app'].color).toBe('#f97316');
    expect(overlay.nodes['function:a.py#g']).toBeUndefined();
    expect(useRecommendInputs.getState().failurePredictions?.method).toBe('local');
    expect(fake.invokeCalls.some((c) => c.channel === 'pv:ml.predictFailures')).toBe(false);
  });

  it('uses the cloud model when signed in with a cloud project, remembered per folder', async () => {
    fake.invokeHandlers.set('pv:ml.available', () => true);
    fake.invokeHandlers.set('pv:ml.predictFailures', () => ({
      method: 'model',
      predictions: [
        { node_id: 'x', probability: 0.3, top_factors: ['calls'] },
        { node_id: 'y', probability: 0.9, top_factors: ['errors'] },
      ],
    }));
    fake.invokeHandlers.set('pv:ml.predictBottlenecks', () => ({
      bottlenecks: [{ node_id: 'y', current_p95_ms: 10, predicted_p95_ms: 30, trend_ms_per_hour: 2, load_sensitivity: 0.5, confidence: 0.8 }],
    }));
    await usePredictionStore.getState().setCloudProject('cp-1');
    expect(settings.get(cloudProjectKey('C:/app'))).toBe('cp-1');
    usePredictionStore.setState({ cloudProject: '' });
    await usePredictionStore.getState().loadCloud();
    expect(usePredictionStore.getState()).toMatchObject({ cloudAvailable: true, cloudProject: 'cp-1' });

    await usePredictionStore.getState().predict();
    const s = usePredictionStore.getState();
    expect(s.method).toBe('model');
    expect(s.predictions.map((p) => p.node_id)).toEqual(['y', 'x']);
    expect(s.bottlenecks).toHaveLength(1);
    expect(fake.invokeCalls.find((c) => c.channel === 'pv:ml.predictFailures')?.payload).toEqual({ project_id: 'p1', cloud_project_id: 'cp-1' });
  });

  it('falls back to the local estimate when the cloud fails', async () => {
    fake.invokeHandlers.set('pv:ml.available', () => true);
    fake.invokeHandlers.set('pv:ml.predictFailures', () => {
      throw new Error('503');
    });
    usePredictionStore.setState({ cloudProject: 'cp-1' });
    await usePredictionStore.getState().loadCloud();
    usePredictionStore.setState({ cloudProject: 'cp-1' });
    await usePredictionStore.getState().predict();
    expect(usePredictionStore.getState().method).toBe('local');
    expect(usePredictionStore.getState().note).toMatch(/cloud prediction failed/);
  });

  it('trains and polls the job every 3 seconds until it ends', async () => {
    vi.useFakeTimers();
    const states = ['running', 'done'];
    fake.invokeHandlers.set('pv:ml.train', () => ({ job_id: 'j1' }));
    fake.invokeHandlers.set('pv:ml.job', () => ({ status: states.shift(), result: { samples: 10 } }));
    usePredictionStore.setState({ cloudProject: 'cp-1' });
    await usePredictionStore.getState().train();
    expect(usePredictionStore.getState().job).toEqual({ job_id: 'j1', status: 'queued' });
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(usePredictionStore.getState().job?.status).toBe('running');
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(usePredictionStore.getState().job).toMatchObject({ job_id: 'j1', status: 'done', result: { samples: 10 } });
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(fake.invokeCalls.filter((c) => c.channel === 'pv:ml.job')).toHaveLength(2);
  });

  it('clears the overlay and the decision input', async () => {
    await usePredictionStore.getState().predict();
    usePredictionStore.getState().clear();
    expect(useAppStore.getState().overlays.prediction).toBeUndefined();
    expect(useRecommendInputs.getState().failurePredictions).toBeNull();
  });
});
