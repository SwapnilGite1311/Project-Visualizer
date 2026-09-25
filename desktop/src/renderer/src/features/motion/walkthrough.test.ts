import { describe, expect, it } from 'vitest';
import type { CallTree } from '../../api/types';
import { gedge, gnode } from '../../view/test-data';
import { walkthroughSteps } from './walkthrough';

const tree = (edges: Array<[string, string]>): CallTree => {
  const ids = [...new Set(edges.flat())];
  return { root_id: ids[0], nodes: ids.map((id) => gnode(id, 'function')), edges: edges.map(([s, t]) => gedge(s, t)) };
};

describe('walkthroughSteps', () => {
  it('enters callees depth first and returns', () => {
    const steps = walkthroughSteps(tree([['A', 'B'], ['A', 'C'], ['B', 'D']]), 'A');
    expect(steps.map((s) => `${s.kind} ${s.node_id} ${s.depth}`)).toEqual([
      'call A 0', 'call B 1', 'call D 2', 'return D 2', 'return B 1', 'call C 1', 'return C 1', 'return A 0',
    ]);
    expect(steps.map((s) => s.i)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('does not loop on recursion', () => {
    const steps = walkthroughSteps(tree([['A', 'B'], ['B', 'A']]), 'A');
    expect(steps.map((s) => `${s.kind} ${s.node_id}`)).toEqual(['call A', 'call B', 'return B', 'return A']);
  });

  it('stops at maxSteps', () => {
    expect(walkthroughSteps(tree([['A', 'B'], ['A', 'C'], ['B', 'D']]), 'A', 3)).toHaveLength(3);
  });
});
