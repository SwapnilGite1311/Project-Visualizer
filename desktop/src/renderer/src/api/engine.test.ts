// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { analyzeImpact, getChildren, getEdges, getLevelView, openProject, search } from './engine';
import { installFakeBridge } from './fake-bridge';

describe('engine wrappers', () => {
  it('openProject sends root_path and unwraps project_id', async () => {
    const fake = installFakeBridge();
    fake.rpcHandlers.set('project.open', () => ({ project_id: 'p1' }));
    await expect(openProject('C:/code/demo')).resolves.toBe('p1');
    expect(fake.rpcCalls[0]).toEqual({ method: 'project.open', params: { root_path: 'C:/code/demo' } });
  });

  it('getLevelView omits an undefined parent_id', async () => {
    const fake = installFakeBridge();
    fake.rpcHandlers.set('graph.level_view', () => ({ parent: {}, nodes: [], edges: [] }));
    await getLevelView('p1');
    await getLevelView('p1', 'package:app');
    expect(fake.rpcCalls.map((c) => c.params)).toEqual([
      { project_id: 'p1' },
      { project_id: 'p1', parent_id: 'package:app' },
    ]);
  });

  it('getChildren and getEdges unwrap lists', async () => {
    const fake = installFakeBridge();
    fake.rpcHandlers.set('graph.children', () => ({ nodes: [{ id: 'a' }] }));
    fake.rpcHandlers.set('graph.edges', () => ({ edges: [{ id: 'e' }] }));
    await expect(getChildren('p1', 'package:app')).resolves.toEqual([{ id: 'a' }]);
    await expect(getEdges('p1', 'x', 'in', ['calls'])).resolves.toEqual([{ id: 'e' }]);
    expect(fake.rpcCalls[1].params).toEqual({ project_id: 'p1', node_id: 'x', direction: 'in', kinds: ['calls'] });
  });

  it('analyzeImpact sends max_depth when given', async () => {
    const fake = installFakeBridge();
    fake.rpcHandlers.set('impact.analyze', () => ({ root_id: 'x', affected: [], risk: { score: 0 } }));
    await analyzeImpact('p1', 'x', 3);
    expect(fake.rpcCalls[0]).toEqual({ method: 'impact.analyze', params: { project_id: 'p1', node_id: 'x', max_depth: 3 } });
  });

  it('search unwraps results', async () => {
    const fake = installFakeBridge();
    fake.rpcHandlers.set('search.query', () => ({ results: [{ node_id: 'n' }] }));
    await expect(search('p1', 'user', undefined, 10)).resolves.toEqual([{ node_id: 'n' }]);
    expect(fake.rpcCalls[0].params).toEqual({ project_id: 'p1', text: 'user', limit: 10 });
  });
});
