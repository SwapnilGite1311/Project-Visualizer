// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import type { Health } from '../../api/types';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { revealNode } from '../../view/reveal';
import type { HealthInfo } from './health-api';
import { useHealthStore } from './health-store';
import { HealthPanel, problems } from './HealthPanel';
import { findRootCause } from './root-cause';

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

const h = (state: Health, errors = 0, reason = ''): HealthInfo => ({
  state,
  calls: 10,
  errors,
  error_rate: errors / 10,
  p95_ms: 2,
  stalled: state === 'stalled',
  reason,
});

// project: → package:app → module:app/db.py → function:app/db.py#query (the failing one)
const tree: Record<string, string[]> = {
  'package:app': ['module:app/api.py', 'module:app/db.py'],
  'module:app/db.py': ['function:app/db.py#load', 'function:app/db.py#query'],
  'function:app/db.py#query': [],
};
const health: Record<string, HealthInfo> = {
  'package:app': h('error', 5),
  'module:app/api.py': h('warning', 1),
  'module:app/db.py': h('error', 4),
  'function:app/db.py#load': h('error', 1),
  'function:app/db.py#query': h('error', 3, '30% errors'),
};

let fake: FakeBridge;
beforeEach(() => {
  vi.clearAllMocks();
  fake = installFakeBridge();
  fake.rpcHandlers.set('graph.children', (p) => ({
    nodes: (tree[(p as { node_id: string }).node_id] ?? []).map((id) => gnode(id, 'module')),
  }));
  fake.rpcHandlers.set('health.get', (p) => {
    const ids = (p as { node_ids?: string[] }).node_ids ?? Object.keys(health);
    return {
      states: Object.fromEntries(ids.filter((id) => health[id]).map((id) => [id, health[id]])),
    };
  });
  fake.rpcHandlers.set('health.config', (p) => ({
    thresholds: {
      window_ms: 60000,
      error_rate: 0.05,
      warn_p95_ms: 500,
      stall_ms: 5000,
      loop_calls: 1000,
      ...(p as { thresholds?: object }).thresholds,
    },
  }));
  useAppStore.setState({ projectId: 'p1', overlays: {} });
  useHealthStore.setState({ enabled: true, states: {}, thresholds: null });
});

describe('health panel', () => {
  it('sorts problems by severity, then errors', () => {
    const list = problems({
      a: h('warning', 9),
      b: h('error', 1),
      c: h('ok'),
      d: h('stalled'),
      e: h('error', 4),
      f: h('unknown'),
    });
    expect(list.map(([id]) => id)).toEqual(['e', 'b', 'd', 'a']);
  });

  it('walks down 3 levels to the root cause', async () => {
    expect(await findRootCause('p1', 'package:app')).toBe('function:app/db.py#query');
    expect(await findRootCause('p1', 'module:app/api.py')).toBe('module:app/api.py');
  });

  it('lists problems, reveals them and finds root causes', async () => {
    act(() =>
      useHealthStore.getState().setStates({
        'package:app': health['package:app'],
        'module:app/api.py': health['module:app/api.py'],
      }),
    );
    render(<HealthPanel />);
    const list = screen.getByRole('list', { name: 'Problems' });
    const items = within(list).getAllByRole('listitem');
    expect(items[0].textContent).toContain('app');
    expect(items[0].textContent).toContain('error');
    expect(items[1].textContent).toContain('app/api.py');
    fireEvent.click(within(items[1]).getByRole('button', { name: 'app/api.py' }));
    expect(revealNode).toHaveBeenCalledWith('module:app/api.py');
    fireEvent.click(within(items[0]).getByRole('button', { name: 'Find root cause' }));
    await waitFor(() => expect(revealNode).toHaveBeenCalledWith('function:app/db.py#query'));
  });

  it('toggles colors and saves thresholds in friendly units', async () => {
    render(<HealthPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show health colors' }));
    expect(useHealthStore.getState().enabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /Thresholds/ }));
    const windowField = (await screen.findByLabelText(
      'Look at the last (seconds)',
    )) as HTMLInputElement;
    await waitFor(() => expect(windowField.value).toBe('60'));
    expect((screen.getByLabelText('Error rate for red (%)') as HTMLInputElement).value).toBe('5');
    fireEvent.change(windowField, { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Error rate for red (%)'), { target: { value: '10' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save thresholds' }));
    });
    expect(fake.rpcCalls.at(-1)?.params).toEqual({
      project_id: 'p1',
      thresholds: {
        window_ms: 30000,
        error_rate: 0.1,
        warn_p95_ms: 500,
        stall_ms: 5000,
        loop_calls: 1000,
      },
    });
  });
});
