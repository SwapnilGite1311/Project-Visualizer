import { describe, expect, it } from 'vitest';
import type { ViewEdge, ViewGraph, ViewNode } from '../../view/model';
import { fitDistance, frameDistance, labelIndices, legendLabel, MAX_LABELS, neighbourhood, parseColor, screenShare, spreadFor, toScene } from './scene-data';

const node = (id: string, extra: Partial<ViewNode> = {}): ViewNode =>
  ({
    id,
    label: id,
    kind: 'module',
    level: 2,
    color: '#06b6d4',
    borderColor: '#06b6d4',
    size: 40,
    shape: 'rectangle',
    badge: '',
    pulse: false,
    opacity: 1,
    hasChildren: true,
    data: {} as ViewNode['data'],
    ...extra,
  }) as ViewNode;
const edge = (id: string, source: string, target: string, extra: Partial<ViewEdge> = {}): ViewEdge => ({
  id,
  source,
  target,
  kind: 'imports',
  weight: 1,
  color: '#64748b',
  width: 1,
  animated: false,
  opacity: 1,
  ...extra,
});

describe('3D scene data', () => {
  it('flattens nodes and edges into typed arrays', () => {
    const g: ViewGraph = {
      parentId: 'project:',
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('loop', 'c', 'c'), edge('gone', 'a', 'x')],
      positions: { a: { x: 0, y: 0, z: 0 }, b: { x: 10, y: 0, z: 0 }, c: { x: 0, y: 10, z: 5 } },
    };
    const s = toScene(g);
    expect(s.ids).toEqual(['a', 'b', 'c']);
    expect(s.positions).toHaveLength(9);
    expect(s.colors).toHaveLength(9);
    expect(s.sizes).toHaveLength(3);
    expect(s.edges.map((e) => e.id)).toEqual(['e1', 'e2']); // self-loops and edges to other levels are skipped
    expect(s.segments).toHaveLength(12);
    expect(s.edgeColors).toHaveLength(6);
    // the farthest node from the centre sits at the spread for 3 nodes
    const dists = [0, 1, 2].map((i) => Math.hypot(s.positions[i * 3] - s.center[0], s.positions[i * 3 + 1] - s.center[1], s.positions[i * 3 + 2] - s.center[2]));
    expect(Math.max(...dists)).toBeGreaterThan(spreadFor(3) * 0.5);
  });

  it('uses the overlay colour, dims faded nodes and keeps a ring colour', () => {
    const s = toScene({
      parentId: 'p',
      nodes: [node('red', { color: '#ef4444', borderColor: '#ef4444' }), node('faded', { opacity: 0.25 }), node('ringed', { borderColor: '#eab308' })],
      edges: [],
    });
    expect([...s.colors.slice(0, 3)].map((v) => Math.round(v * 255))).toEqual([239, 68, 68]);
    const bright = parseColor('#06b6d4');
    expect(s.colors[3 + 2]).toBeLessThan(bright[2]); // faded toward the dark background
    expect(s.nodes[2].ring).toBe('#eab308');
    expect(s.nodes[0].ring).toBeNull();
  });

  it('places nodes without a layout on a sphere, all apart', () => {
    const s = toScene({ parentId: 'p', nodes: ['a', 'b', 'c', 'd'].map((id) => node(id)), edges: [] });
    const pts = [0, 1, 2, 3].map((i) => [...s.positions.slice(i * 3, i * 3 + 3)].map((v) => Math.round(v)).join(','));
    expect(new Set(pts).size).toBe(4);
    expect(s.radius).toBeGreaterThan(10);
  });

  it('finds a node neighbourhood and limits labels on big levels', () => {
    const nodes = Array.from({ length: 200 }, (_, i) => node(`n${i}`, { size: 30 + (i % 50) }));
    const s = toScene({ parentId: 'p', nodes, edges: [edge('e', 'n0', 'n5'), edge('f', 'n7', 'n0')] });
    const hood = neighbourhood(s, 0);
    expect([...hood.nodes].sort((a, b) => a - b)).toEqual([0, 5, 7]);
    expect(hood.edges.size).toBe(2);
    const labels = labelIndices(s, new Set([0]));
    expect(labels.length).toBe(MAX_LABELS);
    expect(labels).toContain(0);
    expect(labelIndices(toScene({ parentId: 'p', nodes: nodes.slice(0, 10), edges: [] }), new Set())).toHaveLength(10);
  });

  it('fits the camera and measures screen coverage', () => {
    const d = fitDistance(100, 50, 16 / 9);
    expect(d).toBeGreaterThan(100);
    expect(screenShare(100, d, 50, 16 / 9)).toBeLessThan(1);
    expect(screenShare(5, 20, 50, 1)).toBeGreaterThan(screenShare(5, 200, 50, 1));
    expect(fitDistance(100, 50, 0.5)).toBeGreaterThan(fitDistance(100, 50, 2)); // a narrow view needs more distance
  });
});

describe('3D framing', () => {
  it('pulls far-out elements in so they do not shrink the rest', () => {
    const nodes = Array.from({ length: 20 }, (_, i) => node(`n${i}`));
    const positions: Record<string, { x: number; y: number; z: number }> = {};
    nodes.forEach((v, i) => (positions[v.id] = { x: Math.cos(i) * 10, y: Math.sin(i) * 10, z: (i % 3) * 3 }));
    positions.n19 = { x: 5000, y: 0, z: 0 }; // an unlinked element pushed away by the force layout
    const s = toScene({ parentId: 'p', nodes, edges: [], positions });
    const d = (i: number) => Math.hypot(s.positions[i * 3], s.positions[i * 3 + 1], s.positions[i * 3 + 2]);
    expect(d(19)).toBeLessThanOrEqual(spreadFor(20) * 1.25 + 1e-6);
    expect(d(0)).toBeGreaterThan(spreadFor(20) * 0.5); // the rest keeps a readable spread
  });

  it('frames every node inside the view', async () => {
    const THREE = await import('three');
    const nodes = Array.from({ length: 30 }, (_, i) => node(`n${i}`));
    const positions: Record<string, { x: number; y: number; z: number }> = {};
    nodes.forEach((v, i) => (positions[v.id] = { x: Math.cos(i * 1.7) * 40, y: Math.sin(i * 0.9) * 25, z: Math.cos(i * 0.4) * 30 }));
    const s = toScene({ parentId: 'p', nodes, edges: [], positions });
    for (const aspect of [0.6, 1.5, 2.4]) {
      const dir = new THREE.Vector3(0.32, 0.42, 1).normalize();
      const dist = frameDistance(s, [dir.x, dir.y, dir.z], 50, aspect);
      const cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 10000);
      const c = new THREE.Vector3(...s.center);
      cam.position.copy(c).addScaledVector(dir, dist);
      cam.lookAt(c);
      cam.updateMatrixWorld();
      let maxX = 0;
      let maxY = 0;
      for (let i = 0; i < 30; i++) {
        const p = new THREE.Vector3().fromArray(s.positions, i * 3).project(cam);
        maxX = Math.max(maxX, Math.abs(p.x));
        maxY = Math.max(maxY, Math.abs(p.y));
      }
      expect(maxX).toBeLessThan(1);
      expect(maxY).toBeLessThan(1);
      expect(Math.max(maxX, maxY)).toBeGreaterThan(0.55); // tight: the level fills the view
    }
  });
});

describe('3D legend', () => {
  it('uses simple words with the developer word in brackets', () => {
    expect(legendLabel('inherits', true)).toBe('builds on (inherits)');
    expect(legendLabel('calls', true)).toBe('calls');
    expect(legendLabel('imports', false)).toBe('imports');
  });
});
