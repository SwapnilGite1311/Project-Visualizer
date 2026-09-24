import { describe, expect, it } from 'vitest';
import type { ImpactResult } from '../../api/types';
import { buildImpactOverlay } from './impact-overlay';

const result: ImpactResult = {
  root_id: 'class:app/services.py#UserService',
  affected: [
    {
      node_id: 'function:main.py#main',
      distance: 1,
      via: 'calls',
      from_id: 'class:app/services.py#UserService',
      ancestor_ids: ['project:', 'module:main.py', 'function:main.py#main'],
    },
    {
      node_id: 'module:main.py',
      distance: 2,
      via: 'calls',
      from_id: 'function:main.py#main',
      ancestor_ids: ['project:', 'module:main.py'],
    },
    {
      node_id: 'function:app/api/routes.py#r',
      distance: 3,
      via: 'calls',
      from_id: 'x',
      ancestor_ids: ['project:', 'package:app', 'package:app/api', 'module:app/api/routes.py', 'function:app/api/routes.py#r'],
    },
  ],
  risk: { score: 42, level: 'medium', factors: ['a', 'b', 'c'] },
};
const rootAncestors = ['project:', 'package:app', 'module:app/services.py', 'class:app/services.py#UserService'];

describe('buildImpactOverlay', () => {
  it('colors ancestors with the smallest distance and badges affected nodes', () => {
    const o = buildImpactOverlay(result, rootAncestors);
    expect(o.priority).toBe(50);
    expect(o.dimOthers).toBe(true);
    expect(o.nodes['module:main.py']).toEqual({ color: '#ef4444', badge: 'd2' });
    expect(o.nodes['function:main.py#main']).toEqual({ color: '#ef4444', badge: 'd1' });
    expect(o.nodes['package:app/api'].color).toBe('#eab308');
    expect(o.edges).toEqual({});
  });

  it('marks the changed node and its ancestors but never the project', () => {
    const o = buildImpactOverlay(result, rootAncestors);
    expect(o.nodes['class:app/services.py#UserService']).toMatchObject({ borderColor: '#fbbf24', badge: 'changed' });
    expect(o.nodes['package:app']).toMatchObject({ borderColor: '#fbbf24', color: '#eab308' });
    expect(o.nodes['project:']).toBeUndefined();
  });
});
