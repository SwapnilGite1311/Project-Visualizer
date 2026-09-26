// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { useChangeStore } from '../change-preview/change-store';
import { SimulationPanel } from './SimulationPanel';
import { useSimStore } from './sim-store';
import { fakeSimEngine } from './sim-test-data';

let fake: FakeBridge;

beforeEach(() => {
  fake = installFakeBridge();
  fakeSimEngine(fake);
  useAppStore.setState(useAppStore.getInitialState());
  useSimStore.setState(useSimStore.getInitialState());
  useChangeStore.setState(useChangeStore.getInitialState());
  useAppStore.getState().openedProject('base', 'C:/code/app');
});
afterEach(cleanup);

describe('SimulationPanel', () => {
  it('opens a sandbox, then compares real and simulated behaviour with a decision', async () => {
    render(<SimulationPanel />);
    fireEvent.change(screen.getByLabelText('Sandbox name'), { target: { value: 'no validation' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open a sandbox' }));
    await screen.findByText(/Sandbox/);
    await act(() => useSimStore.getState().apply({ kind: 'delete_node', node_id: 'function:app/utils.py#is_valid' }));
    expect(screen.getByRole('list', { name: 'Changes' }).textContent).toContain('Remove is_valid');

    fireEvent.click(screen.getAllByRole('button', { name: 'Run simulation' })[0]);
    expect(await screen.findByText('Replayed 100 recorded requests.')).toBeTruthy();
    const table = screen.getByRole('table', { name: 'Real and simulated' });
    expect(table.textContent).toContain('Failed requests012');
    expect(screen.getByRole('table', { name: 'Effects per element' }).textContent).toContain('0 → 100');
    expect(screen.getByRole('list', { name: 'Failed requests' }).textContent).toContain('t1');
    expect(screen.getByText('No-go')).toBeTruthy(); // 12 of 100 extra failures
  });

  it('explains the static mode when there is no runtime data', async () => {
    fake.rpcHandlers.set('sim.run', () => ({
      mode: 'static',
      traces_total: 0,
      traces_failed_real: 0,
      traces_failed_sim: 0,
      latency_p95_real_ms: 0,
      latency_p95_sim_ms: 0,
      node_effects: [],
      failed_trace_ids: [],
      broken_node_ids: ['x'],
    }));
    render(<SimulationPanel />);
    await act(() => useSimStore.getState().start());
    await act(() => useSimStore.getState().apply({ kind: 'delete_node', node_id: 'a' }));
    await act(() => useSimStore.getState().run());
    expect(screen.getByText(/No runtime data — showing static impact only/)).toBeTruthy();
  });
});
