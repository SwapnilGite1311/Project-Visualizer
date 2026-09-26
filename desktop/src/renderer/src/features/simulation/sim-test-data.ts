// Test helper: a fake engine for the sim.* methods.
import type { FakeBridge } from '../../api/fake-bridge';
import type { NodeRef } from '../../core/registry';
import type { SimRunResult } from './sim-api';

export const RESULT: SimRunResult = {
  mode: 'replay',
  traces_total: 100,
  traces_failed_real: 0,
  traces_failed_sim: 12,
  latency_p95_real_ms: 20,
  latency_p95_sim_ms: 25,
  node_effects: [
    { node_id: 'function:app/utils.py#is_valid', calls: 100, failures_real: 0, failures_sim: 100, p95_real_ms: 2, p95_sim_ms: 2 },
    { node_id: 'method:app/services.py#UserService.get_user', calls: 100, failures_real: 0, failures_sim: 12, p95_real_ms: 10, p95_sim_ms: 10 },
  ],
  failed_trace_ids: ['t1', 't2'],
  broken_node_ids: ['method:app/services.py#UserService.get_user'],
};

export function fakeSimEngine(fake: FakeBridge): void {
  fake.rpcHandlers.set('sim.create', () => ({ sandbox_id: 's1', view_project_id: 'view1' }));
  fake.rpcHandlers.set('sim.apply', () => ({ ok: true, changes_count: 1, affected: [] }));
  fake.rpcHandlers.set('sim.run', () => RESULT);
  fake.rpcHandlers.set('sim.flows', () => ({
    flows: [{ source_id: 'module:app/services.py', target_id: 'module:app/utils.py', count: 100, failed: 12, edge_id: 'agg|calls|module:app/services.py|module:app/utils.py' }],
  }));
  fake.rpcHandlers.set('sim.discard', () => ({ ok: true }));
  fake.rpcHandlers.set('graph.edges', () => ({
    edges: [{ id: 'calls|a|b', kind: 'calls', source_id: 'function:app/a.py#a', target_id: 'function:app/b.py#b', weight: 1, resolved: true }],
  }));
  fake.invokeHandlers.set('pv:settings.get', (p) => (p as { fallback: unknown }).fallback);
}

export const ref = (id: string, kind = 'function'): NodeRef => ({
  id,
  kind,
  name: id.slice(id.lastIndexOf('#') + 1),
  qualified_name: id,
  file_path: '',
  span: { start_line: 0, start_col: 0, end_line: 0, end_col: 0 },
});
