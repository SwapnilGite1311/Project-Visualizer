// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { cycles, findPath, neighbors } from './deps-api';

let fake: FakeBridge;
beforeEach(() => {
  fake = installFakeBridge();
  fake.rpcHandlers.set('deps.neighbors', () => ({ root_id: 'a', items: [], edges: [] }));
  fake.rpcHandlers.set('deps.path', () => ({ found: false, node_ids: [], edge_ids: [] }));
  fake.rpcHandlers.set('deps.cycles', () => ({ cycles: [{ node_ids: ['x', 'y'] }] }));
});

describe('deps api', () => {
  it('calls the deps methods', async () => {
    await neighbors('p1', 'module:a.py', 'in', 2);
    await neighbors('p1', 'module:a.py', 'out', 1, ['imports']);
    await findPath('p1', 'module:a.py', 'package:app');
    await findPath('p1', 'module:a.py', 'package:app', 4);
    expect(await cycles('p1', 2)).toEqual([{ node_ids: ['x', 'y'] }]);
    expect(fake.rpcCalls).toEqual([
      { method: 'deps.neighbors', params: { project_id: 'p1', node_id: 'module:a.py', direction: 'in', depth: 2 } },
      { method: 'deps.neighbors', params: { project_id: 'p1', node_id: 'module:a.py', direction: 'out', depth: 1, kinds: ['imports'] } },
      { method: 'deps.path', params: { project_id: 'p1', from_id: 'module:a.py', to_id: 'package:app' } },
      { method: 'deps.path', params: { project_id: 'p1', from_id: 'module:a.py', to_id: 'package:app', max_depth: 4 } },
      { method: 'deps.cycles', params: { project_id: 'p1', level: 2 } },
    ]);
  });
});
