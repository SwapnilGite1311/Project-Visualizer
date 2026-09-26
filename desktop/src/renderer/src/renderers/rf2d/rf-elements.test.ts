import { describe, expect, it } from 'vitest';
import type { ViewGraph, ViewNode } from '../../view/model';
import { clipToBox, NODE_HEIGHT, nodeWidth, toFlow } from './rf-elements';

function vnode(id: string, label = id, extra: Partial<ViewNode> = {}): ViewNode {
  return {
    id,
    label,
    kind: 'module',
    level: 2,
    color: '#06b6d4',
    borderColor: '#000',
    size: 30,
    shape: 'round-rectangle',
    badge: '',
    pulse: false,
    opacity: 1,
    hasChildren: false,
    data: {} as ViewNode['data'],
    ...extra,
  };
}

const edge = (source: string, target: string, animated = false) => ({
  id: `${source}>${target}`,
  source,
  target,
  kind: 'imports',
  weight: 1,
  color: '#888',
  width: 2,
  animated,
  opacity: 1,
});

describe('toFlow', () => {
  it('turns engine centres into top-left positions of the drawn boxes', () => {
    const g: ViewGraph = {
      parentId: 'project:',
      nodes: [vnode('a', 'main.py'), vnode('b', 'utils.py')],
      edges: [edge('a', 'b')],
      positions: { a: { x: 200, y: 24 }, b: { x: 200, y: 152 } },
      edgePoints: { 'a>b': [{ x: 200, y: 24 }, { x: 200, y: 152 }] },
    };
    const { nodes, edges } = toFlow(g);
    const w = nodeWidth('main.py');
    expect(nodes[0].position).toEqual({ x: 200 - w / 2, y: 24 - NODE_HEIGHT / 2 });
    expect(nodes[0].width).toBe(w);
    expect(edges[0].data?.points).toHaveLength(2);
    expect(edges[0].type).toBe('flow');
  });

  it('lays out a grid when the engine gave no positions', () => {
    const g: ViewGraph = { parentId: 'project:', nodes: [vnode('a'), vnode('b'), vnode('c'), vnode('d')], edges: [edge('a', 'd')] };
    const { nodes, edges } = toFlow(g);
    const positions = nodes.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(positions).size).toBe(4);
    expect(edges[0].data?.points).toHaveLength(2);
    expect(edges[0].markerEnd).toMatchObject({ type: 'arrowclosed' });
  });

  it('keeps overlay styles, the selection and drops edges to hidden nodes', () => {
    const g: ViewGraph = {
      parentId: 'project:',
      nodes: [vnode('a', 'a', { color: '#f00', badge: 'error', pulse: true, opacity: 0.4 }), vnode('b')],
      edges: [edge('a', 'b', true), edge('a', 'ghost')],
    };
    const { nodes, edges } = toFlow(g, 'a');
    expect(nodes[0].data).toMatchObject({ color: '#f00', badge: 'error', pulse: true, opacity: 0.4, selected: true });
    expect(nodes[1].data.selected).toBe(false);
    expect(edges).toHaveLength(1);
    expect(edges[0].data?.animated).toBe(true);
  });

  it('clips edges at the box borders', () => {
    expect(clipToBox({ x: 0, y: 0 }, { x: 0, y: 100 }, 100, 48)).toEqual({ x: 0, y: 24 });
    expect(clipToBox({ x: 0, y: 0 }, { x: 200, y: 0 }, 100, 48)).toEqual({ x: 50, y: 0 });
    expect(clipToBox({ x: 0, y: 0 }, { x: 10, y: 0 }, 100, 48)).toEqual({ x: 0, y: 0 }); // target inside the box
  });

  it('sizes nodes like the engine', () => {
    expect(nodeWidth('')).toBe(80);
    expect(nodeWidth('x'.repeat(10))).toBe(110);
    expect(nodeWidth('x'.repeat(100))).toBe(260);
  });
});
