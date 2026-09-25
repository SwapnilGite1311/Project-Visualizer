// @vitest-environment jsdom
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { revealNode } from '../../view/reveal';
import { clearAncestorCache } from './ancestors';
import type { TraceStep } from './runtime-api';
import { buildCrossingOverlay, buildTraceOverlay, waterfall } from './trace-overlay';
import { TracesView } from './TracesView';

// The full suite runs many jsdom files in parallel; the 1 s default wait is too tight there.
configure({ asyncUtilTimeout: 5000 });

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

const step = (
  span: string,
  parent: string | null,
  node: string,
  start: number,
  dur: number,
  status: 'ok' | 'error' = 'ok',
): TraceStep => ({
  event_id: 'e' + span,
  span_id: span,
  parent_span_id: parent,
  node_id: node,
  name: 'name.' + span,
  kind: 'call',
  start_ns: start,
  duration_ns: dur,
  status,
});

const steps = [
  step('a', null, 'function:app/api.py#handle', 0, 100),
  step('b', 'a', 'function:app/db.py#load', 10, 50),
  step('c', 'b', 'function:app/db.py#query', 20, 20, 'error'),
  step('d', 'a', '', 70, 10),
];
const ancestors: Record<string, string[]> = {
  'function:app/api.py#handle': [
    'project:',
    'package:app',
    'module:app/api.py',
    'function:app/api.py#handle',
  ],
  'function:app/db.py#load': [
    'project:',
    'package:app',
    'module:app/db.py',
    'function:app/db.py#load',
  ],
  'function:app/db.py#query': [
    'project:',
    'package:app',
    'module:app/db.py',
    'function:app/db.py#query',
  ],
};

let fake: FakeBridge;
beforeEach(() => {
  vi.clearAllMocks();
  clearAncestorCache();
  fake = installFakeBridge();
  useAppStore.setState({ projectId: 'p1', overlays: {} });
  fake.rpcHandlers.set('runtime.recent_traces', () => ({
    traces: [
      {
        trace_id: 't1',
        root_name: 'GET /orders',
        start_ns: 1_727_000_000_000_000_000,
        duration_ns: 12_000_000,
        spans: 4,
        errors: 1,
      },
    ],
  }));
  fake.rpcHandlers.set('runtime.trace', () => ({ trace_id: 't1', steps }));
  fake.rpcHandlers.set('graph.ancestors', (p) => ({
    nodes: (ancestors[(p as { node_id: string }).node_id] ?? []).map((id) => gnode(id, 'module')),
  }));
  fake.rpcHandlers.set('modtrace.follow', () => ({
    hops: [
      {
        from_id: 'module:app/api.py',
        to_id: 'module:app/db.py',
        start_ns: 10,
        duration_ns: 50_000_000,
        status: 'ok',
      },
    ],
  }));
});

describe('trace builders', () => {
  it('builds a waterfall indented by parent span', () => {
    const rows = waterfall(steps);
    expect(rows.map((r) => [r.step.span_id, r.depth])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
      ['d', 1],
    ]);
    expect(rows[0].widthPct).toBe(100);
    expect(rows[1]).toMatchObject({ offsetPct: 10, widthPct: 50 });
    expect(waterfall([])).toEqual([]);
  });

  it('colors the trace path, failures in red, with step numbers', () => {
    const o = buildTraceOverlay(steps, ancestors);
    expect(o.priority).toBe(58);
    expect(o.nodes['project:']).toBeUndefined();
    expect(o.nodes['module:app/api.py']).toEqual({ color: '#38bdf8' });
    expect(o.nodes['package:app'].color).toBe('#ef4444');
    expect(o.nodes['module:app/db.py'].color).toBe('#ef4444');
    expect(o.nodes['function:app/db.py#load']).toEqual({ color: '#38bdf8', badge: '2' });
    expect(o.nodes['function:app/db.py#query']).toEqual({ color: '#ef4444', badge: '3' });
  });

  it('colors both modules of a crossing', () => {
    const o = buildCrossingOverlay(
      {
        from_id: 'module:a.py',
        to_id: 'module:b.py',
        count: 1,
        avg_ms: 1,
        errors: 0,
        stalls: 0,
        loops: 0,
      },
      { 'module:a.py': ['project:', 'package:x', 'module:a.py'] },
    );
    expect(o).toEqual({
      priority: 57,
      edges: {},
      nodes: {
        'package:x': { color: '#f97316' },
        'module:a.py': { color: '#f97316' },
        'module:b.py': { color: '#f97316' },
      },
    });
  });
});

describe('TracesView', () => {
  it('lists traces, shows a waterfall, maps it and follows modules', async () => {
    render(<TracesView />);
    const item = await screen.findByRole('button', { name: /GET \/orders/ });
    expect(item.textContent).toContain('1 errors');
    fireEvent.click(item);
    const list = await screen.findByRole('list', { name: 'Steps' });
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(4));
    expect(
      within(list)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['handle', 'load', 'query', 'name.d']);
    fireEvent.click(within(list).getByRole('button', { name: 'load' }));
    expect(revealNode).toHaveBeenCalledWith('function:app/db.py#load');

    fireEvent.click(screen.getByRole('button', { name: 'Show on map' }));
    await waitFor(() =>
      expect(useAppStore.getState().overlays.trace?.nodes['function:app/db.py#query']?.color).toBe(
        '#ef4444',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear map' }));
    expect(useAppStore.getState().overlays.trace).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Follow across modules' }));
    const hops = await screen.findByRole('list', { name: 'Module hops' });
    expect(hops.textContent).toContain('app/api.py → app/db.py (50 ms)');
  });
});
