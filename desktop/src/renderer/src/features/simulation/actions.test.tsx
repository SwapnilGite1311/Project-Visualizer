// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { SimDialogs, simulationActions, useSimDialog } from './actions';
import { useSimStore } from './sim-store';
import { fakeSimEngine, ref } from './sim-test-data';

let fake: FakeBridge;
const fn = ref('function:app/a.py#a');
const ids = (node = fn) => simulationActions().filter((a) => !a.when || a.when(node)).map((a) => a.id);

beforeEach(() => {
  fake = installFakeBridge();
  fakeSimEngine(fake);
  useAppStore.setState(useAppStore.getInitialState());
  useSimStore.setState(useSimStore.getInitialState());
  useSimDialog.getState().close();
  useAppStore.getState().openedProject('base', 'C:/code/app');
});
afterEach(cleanup);

const applied = () => fake.rpcCalls.filter((c) => c.method === 'sim.apply').map((c) => (c.params as { change: unknown }).change);

describe('simulation node actions', () => {
  it('offers a sandbox outside and the simulate actions inside', async () => {
    expect(ids()).toEqual(['sim-start']);
    await useSimStore.getState().start();
    expect(ids()).toEqual(['sim-remove', 'sim-slow', 'sim-fail', 'sim-cut']);
    expect(ids(ref('project:', 'project'))).toEqual([]);
  });

  it('applies removal directly and the others through small dialogs', async () => {
    await useSimStore.getState().start();
    render(<SimDialogs />);
    const action = (id: string) => simulationActions().find((a) => a.id === id)!;

    await act(async () => action('sim-remove').run(fn));
    act(() => void action('sim-slow').run(fn));
    fireEvent.click(screen.getByRole('button', { name: '×5' }));
    act(() => void action('sim-fail').run(fn));
    fireEvent.click(screen.getByRole('button', { name: '50%' }));
    act(() => void action('sim-cut').run(fn));
    fireEvent.click(await screen.findByRole('button', { name: /calls → b/ }));
    await act(async () => undefined);

    expect(applied()).toEqual([
      { kind: 'delete_node', node_id: fn.id },
      { kind: 'set_latency', node_id: fn.id, factor: 5 },
      { kind: 'set_error_rate', node_id: fn.id, rate: 0.5 },
      { kind: 'remove_edge', source_id: fn.id, target_id: 'function:app/b.py#b' },
    ]);
    expect(useSimDialog.getState().kind).toBeNull();
  });
});
