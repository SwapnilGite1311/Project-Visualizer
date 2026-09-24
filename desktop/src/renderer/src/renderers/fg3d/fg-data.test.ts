import { describe, expect, it } from 'vitest';
import type { ViewEdge, ViewGraph, ViewNode } from '../../view/model';
import { toGraphData } from './fg-data';

const node = (id: string, size = 40): ViewNode =>
  ({ id, label: id.toUpperCase(), color: '#3b82f6', size, opacity: 1, badge: '' }) as ViewNode;
const edge = (source: string, target: string): ViewEdge =>
  ({ id: `${source}->${target}`, source, target, color: '#64748b', width: 2, animated: false }) as ViewEdge;

describe('toGraphData', () => {
  it('maps nodes and links and skips dangling links', () => {
    const g: ViewGraph = { parentId: 'project:', nodes: [node('a', 60), node('b')], edges: [edge('a', 'b'), edge('a', 'gone')] };
    const data = toGraphData(g);
    expect(data.nodes).toHaveLength(2);
    expect(data.nodes[0]).toEqual({ id: 'a', name: 'A', color: '#3b82f6', val: 6, opacity: 1, badge: '' });
    expect(data.links).toEqual([{ id: 'a->b', source: 'a', target: 'b', color: '#64748b', width: 2, animated: false }]);
  });
});
