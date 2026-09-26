// @vitest-environment jsdom
import { act } from '@testing-library/react';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ViewGraph, ViewNode } from '../../view/model';
import type { GraphSceneProps } from './GraphScene';

// jsdom has no WebGL: the scene is replaced by a stand-in that exposes its props.
const seen: { props: GraphSceneProps | null } = { props: null };
vi.mock('./GraphScene', () => ({
  GraphScene: (p: GraphSceneProps) => {
    seen.props = p;
    return null;
  },
}));

const { R3fRenderer } = await import('./r3f-renderer');
const { renderer } = await import('./index');

const node = (id: string, hasChildren = true): ViewNode =>
  ({ id, label: id, kind: 'module', level: 2, color: '#06b6d4', borderColor: '#06b6d4', size: 40, shape: 'rectangle', badge: '', pulse: false, opacity: 1, hasChildren, data: {} }) as unknown as ViewNode;
const graph: ViewGraph = {
  parentId: 'project:',
  nodes: [node('module:a.py'), node('module:b.py', false)],
  edges: [{ id: 'e', source: 'module:a.py', target: 'module:b.py', kind: 'imports', weight: 1, color: '#64748b', width: 1, animated: false, opacity: 1 }],
  positions: { 'module:a.py': { x: 0, y: 0, z: 0 }, 'module:b.py': { x: 50, y: 0, z: 0 } },
};

function mountRenderer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const r = new R3fRenderer();
  act(() => r.mount(container));
  return { r, container };
}

afterEach(() => {
  seen.props = null;
  document.body.innerHTML = '';
});

describe('r3f renderer', () => {
  it('is the preferred 3D renderer and uses the engine layout', () => {
    expect(renderer).toMatchObject({ id: 'r3f', mode: '3d', preferred: true, layout: 'engine' });
  });

  it('mounts, takes a graph, fits, selects and unmounts', async () => {
    const { r, container } = mountRenderer();
    expect(container.querySelector('[data-renderer="r3f"]')).toBeTruthy();
    act(() => r.setGraph(graph));
    expect(r.state.scene?.ids).toEqual(['module:a.py', 'module:b.py']);
    expect(r.state.fitRequest).toBe(1);
    act(() => r.select('module:b.py'));
    expect(r.state).toMatchObject({ selected: 'module:b.py', focusRequest: 1 });
    act(() => r.updateStyles({ ...graph, nodes: [{ ...graph.nodes[0], color: '#ef4444' }, graph.nodes[1]] }));
    expect(r.state.fitRequest).toBe(1); // a style update never refits
    act(() => r.fit());
    expect(r.state.fitRequest).toBe(2);
    r.destroy();
    await Promise.resolve();
    expect(container.querySelector('[data-renderer="r3f"]')).toBeNull();
  });

  it('emits node events and tracks the hovered node', () => {
    const { r } = mountRenderer();
    act(() => r.setGraph(graph));
    const clicks: Array<string | null> = [];
    const hovers: Array<string | null> = [];
    r.on('nodeClick', (p) => clicks.push(p.nodeId));
    r.on('nodeHover', (p) => hovers.push(p.nodeId));
    act(() => seen.props!.onNode('nodeClick', 'module:a.py', { clientX: 5, clientY: 6 }));
    act(() => seen.props!.onNode('nodeHover', 'module:b.py', { clientX: 1, clientY: 1 }));
    act(() => seen.props!.onNode('nodeHover', 'module:b.py', { clientX: 2, clientY: 2 })); // same node: no repeat
    expect(clicks).toEqual(['module:a.py']);
    expect(hovers).toEqual(['module:b.py']);
    expect(r.state.hovered).toBe('module:b.py');
  });

  it('opens an element when the user keeps zooming into it', () => {
    const { r } = mountRenderer();
    act(() => r.setGraph(graph));
    const opened: Array<string | null> = [];
    r.on('zoomIn', (p) => opened.push(p.nodeId));
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1000);
    const target = new THREE.Vector3(...r.state.scene!.center);
    seen.props!.bridge.current = { camera, controls: { target, update: () => undefined }, size: { width: 900, height: 600 }, fitDistance: 300 };
    act(() => seen.props!.onFitted(300));
    const a = new THREE.Vector3().fromArray(r.state.scene!.positions, 0);
    camera.position.copy(a).add(new THREE.Vector3(0, 0, 8)); // very close to module:a.py
    act(() => seen.props!.onNode('nodeHover', 'module:a.py', { clientX: 10, clientY: 10 }));
    const host = document.querySelector('[data-renderer="r3f"]')!;
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000); // past the fit cool-down
    for (let k = 0; k < 3; k++) act(() => void host.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 10, clientY: 10 })));
    vi.useRealTimers();
    expect(opened).toEqual(['module:a.py']);
  });
});
