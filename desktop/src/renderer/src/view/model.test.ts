import { describe, expect, it } from 'vitest';
import { buildViewGraph, edgeWidth, kindColor, kindShape, nodeSize } from './model';
import { gedge, gnode, levelView } from './test-data';

describe('view model', () => {
  it('sizes nodes by lines of code', () => {
    expect(nodeSize(1)).toBe(30);
    expect(nodeSize(100)).toBe(50);
    expect(nodeSize(1e9)).toBe(80);
    expect(nodeSize(0)).toBe(30);
  });

  it('maps kinds to colors and shapes', () => {
    expect(kindColor('class')).toBe('#f59e0b');
    expect(kindColor('weird')).toBe('#9ca3af');
    expect(kindShape('class')).toBe('diamond');
    expect(kindShape('package')).toBe('round-rectangle');
    expect(edgeWidth(1)).toBe(1);
    expect(edgeWidth(4)).toBe(3);
  });

  it('builds nodes and edges with base styles', () => {
    const g = buildViewGraph(levelView([gnode('package:app', 'package'), gnode('external:os', 'external')], [gedge('package:app', 'external:os', 'imports')]), {});
    expect(g.parentId).toBe('project:');
    expect(g.nodes[0]).toMatchObject({ id: 'package:app', label: 'app', color: '#3b82f6', borderColor: '#3b82f6', hasChildren: true, opacity: 1 });
    expect(g.nodes[1].hasChildren).toBe(false);
    expect(g.edges[0]).toMatchObject({ source: 'package:app', target: 'external:os', color: '#64748b', animated: false });
  });

  it('lets overlays override and dims unstyled nodes', () => {
    const view = levelView([gnode('a', 'module'), gnode('b', 'module')]);
    const g = buildViewGraph(view, {
      impact: { priority: 10, nodes: { a: { color: 'red', badge: '1' } }, edges: {}, dimOthers: true },
    });
    expect(g.nodes[0]).toMatchObject({ color: 'red', badge: '1', opacity: 1 });
    expect(g.nodes[1].opacity).toBe(0.25);
  });
});
