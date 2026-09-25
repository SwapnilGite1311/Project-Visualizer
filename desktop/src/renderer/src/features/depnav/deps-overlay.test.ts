import { describe, expect, it } from 'vitest';
import { buildCycleOverlay, buildDepsOverlay, buildPathOverlay } from './deps-overlay';

describe('deps overlays', () => {
  it('colors uses, used-by and both at every level', () => {
    const o = buildDepsOverlay(
      {
        root_id: 'function:a.py#f',
        edges: [],
        items: [
          { node_id: 'function:b.py#g', distance: 1, direction: 'out', ancestor_ids: ['project:', 'package:p', 'module:b.py', 'function:b.py#g'] },
          { node_id: 'function:c.py#h', distance: 1, direction: 'in', ancestor_ids: ['project:', 'package:p', 'module:c.py', 'function:c.py#h'] },
        ],
      },
      ['project:', 'module:a.py', 'function:a.py#f'],
    );
    expect(o.priority).toBe(45);
    expect(o.dimOthers).toBe(true);
    expect(o.nodes['project:']).toBeUndefined();
    expect(o.nodes['module:a.py']).toEqual({ borderColor: '#fbbf24' });
    expect(o.nodes['module:b.py']).toEqual({ color: '#22c55e' });
    expect(o.nodes['function:b.py#g']).toEqual({ color: '#22c55e', badge: 'uses' });
    expect(o.nodes['function:c.py#h']).toEqual({ color: '#3b82f6', badge: 'used by' });
    expect(o.nodes['package:p']).toEqual({ color: '#a855f7' });
  });

  it('numbers the steps of a path', () => {
    const o = buildPathOverlay(
      { found: true, node_ids: ['function:a.py#f', 'function:b.py#g'], edge_ids: ['e1'] },
      { 'function:a.py#f': ['project:', 'module:a.py', 'function:a.py#f'], 'function:b.py#g': ['project:', 'module:b.py', 'function:b.py#g'] },
    );
    expect(o.priority).toBe(55);
    expect(o.nodes['function:a.py#f']).toEqual({ color: '#f97316', badge: '1' });
    expect(o.nodes['function:b.py#g']).toEqual({ color: '#f97316', badge: '2' });
    expect(o.nodes['module:b.py']).toEqual({ color: '#f97316' });
    expect(o.nodes['project:']).toBeUndefined();
  });

  it('marks cycle members red', () => {
    const o = buildCycleOverlay(['module:a.py', 'module:b.py'], { 'module:a.py': ['project:', 'package:p', 'module:a.py'] });
    expect(o.priority).toBe(56);
    expect(Object.keys(o.nodes).sort()).toEqual(['module:a.py', 'module:b.py', 'package:p']);
    expect(o.nodes['module:b.py']).toEqual({ color: '#ef4444' });
  });
});
