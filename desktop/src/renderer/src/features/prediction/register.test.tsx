// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { PredictionPanel } from './PredictionPanel';
import { usePredictionStore } from './prediction-store';
import register, { PredictionReset } from './register';

let fake: FakeBridge;

beforeEach(() => {
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:settings.get', (p) => (p as { fallback: unknown }).fallback);
  fake.invokeHandlers.set('pv:settings.set', () => true);
  fake.invokeHandlers.set('pv:ml.available', () => false);
  fake.rpcHandlers.set('analysis.hotspots', () => ({
    hotspots: [{ node_id: 'function:app/a.py#load', kind: 'function', name: 'load', file_path: 'a.py', score: 1, reasons: [], metrics: { loc: 1, complexity: 30, fan_in: 20, fan_out: 0 } }],
  }));
  fake.rpcHandlers.set('metrics.series', (p) => ({ points: [{ t: 0, v: { calls: 4, errors: 2, stalls: 0 }[(p as { metric: string }).metric] ?? 0 }] }));
  fake.rpcHandlers.set('graph.ancestors', () => ({ nodes: [] }));
  useAppStore.setState(useAppStore.getInitialState());
  usePredictionStore.getState().clear();
  usePredictionStore.setState(usePredictionStore.getInitialState());
});
afterEach(cleanup);

describe('prediction feature', () => {
  it('registers the Predictions panel, the command and the reset watcher', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('right')).toEqual([expect.objectContaining({ id: 'prediction', title: 'Predictions', order: 45 })]);
    expect(r.commands().map((c) => c.id)).toEqual(['prediction.run']);
    expect(r.globals().map((g) => g.id)).toEqual(['prediction-reset']);
  });

  it('predicts offline from the panel and lists the likely failures', async () => {
    act(() => useAppStore.getState().openedProject('p1', 'C:/app'));
    render(<PredictionPanel />);
    expect(screen.getByText(/Offline: estimates run on this computer/)).toBeTruthy();
    fireEvent.click(screen.getByText('Predict now'));
    await waitFor(() => expect(screen.getByText('Local estimate')).toBeTruthy());
    // 0.6*0.5 + 0.02 + 0.05
    expect(screen.getByText('37%')).toBeTruthy();
    expect(screen.getByText('recent errors · high complexity · many callers')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: /Failure probability/ })).toBeTruthy();
  });

  it('shows the cloud project field and the training status when signed in', async () => {
    fake.invokeHandlers.set('pv:ml.available', () => true);
    act(() => useAppStore.getState().openedProject('p1', 'C:/app'));
    render(<PredictionPanel />);
    await waitFor(() => expect(screen.getByLabelText('Cloud project for this folder')).toBeTruthy());
    act(() => usePredictionStore.setState({ job: { job_id: 'j', status: 'done', result: { samples: 120, metrics: { auc: 0.81 } } } }));
    expect(screen.getByRole('status').textContent).toBe('Model trained on 120 samples (AUC 0.81)');
  });

  it('forgets predictions when another project opens', async () => {
    render(<PredictionReset />);
    act(() => useAppStore.getState().openedProject('p1', 'C:/app'));
    await act(() => usePredictionStore.getState().predict());
    expect(usePredictionStore.getState().predictions).toHaveLength(1);
    act(() => useAppStore.getState().openedProject('p2', 'sim:try'));
    expect(usePredictionStore.getState().predictions).toHaveLength(1);
    act(() => useAppStore.getState().openedProject('p3', 'C:/other'));
    expect(usePredictionStore.getState().predictions).toHaveLength(0);
    expect(useAppStore.getState().overlays.prediction).toBeUndefined();
  });
});
