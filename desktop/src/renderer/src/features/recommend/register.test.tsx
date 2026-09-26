// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useChangeStore } from '../change-preview/change-store';
import { RecommendationPanel } from './RecommendationPanel';
import { useRecommendInputs } from './recommend-inputs';
import register, { RecommendInputsReset } from './register';

const SIM = {
  mode: 'replay' as const,
  traces_total: 200,
  traces_failed_real: 0,
  traces_failed_sim: 20,
  latency_p95_real_ms: 10,
  latency_p95_sim_ms: 10,
};

beforeEach(() => {
  installFakeBridge().invokeHandlers.set('pv:settings.get', (p) => (p as { fallback: unknown }).fallback);
  useAppStore.setState(useAppStore.getInitialState());
  useChangeStore.setState(useChangeStore.getInitialState());
  useRecommendInputs.getState().reset();
});
afterEach(cleanup);

describe('recommendation feature', () => {
  it('registers the Decision panel and the reset watcher', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('right')).toEqual([expect.objectContaining({ id: 'recommendation', title: 'Decision', order: 40 })]);
    expect(r.globals().map((g) => g.id)).toEqual(['recommend-inputs-reset']);
  });

  it('shows an empty state, then the verdict for a simulation', () => {
    render(<RecommendationPanel />);
    expect(screen.getByText(/Preview a change or run a simulation/)).toBeTruthy();
    act(() => useRecommendInputs.getState().setSimulation(SIM));
    expect(screen.getByText('No-go')).toBeTruthy();
  });

  it('keeps the simulation while entering and leaving a sandbox, and resets for another project', () => {
    render(<RecommendInputsReset />);
    act(() => useAppStore.getState().openedProject('p1', 'C:/app'));
    act(() => useRecommendInputs.getState().setSimulation(SIM));
    act(() => useAppStore.getState().openedProject('p2', 'sim:try'));
    act(() => useAppStore.getState().openedProject('p1', 'C:/app'));
    expect(useRecommendInputs.getState().simulation).not.toBeNull();
    act(() => useAppStore.getState().openedProject('p3', 'C:/other'));
    expect(useRecommendInputs.getState().simulation).toBeNull();
  });
});
