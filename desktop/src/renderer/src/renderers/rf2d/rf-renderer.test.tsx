// @vitest-environment jsdom
import { act, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { ViewGraph, ViewNode } from '../../view/model';
import { pointAt } from './FlowEdge';
import { RfRenderer } from './rf-renderer';

// React Flow needs a few browser APIs that jsdom does not have.
beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
  (globalThis as unknown as { DOMMatrixReadOnly: unknown }).DOMMatrixReadOnly = class {
    m22 = 1;
  };
  Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: { get: () => 600, configurable: true },
    offsetWidth: { get: () => 800, configurable: true },
  });
});

function vnode(id: string, label: string): ViewNode {
  return {
    id,
    label,
    kind: 'module',
    level: 2,
    color: '#06b6d4',
    borderColor: '#333',
    size: 30,
    shape: 'round-rectangle',
    badge: id === 'b' ? 'error' : '',
    pulse: false,
    opacity: 1,
    hasChildren: false,
    data: {} as ViewNode['data'],
  };
}

const graph: ViewGraph = {
  parentId: 'project:',
  nodes: [vnode('a', 'main.py'), vnode('b', 'utils.py')],
  edges: [{ id: 'a>b', source: 'a', target: 'b', kind: 'imports', weight: 1, color: '#888', width: 2, animated: true, opacity: 1 }],
  positions: { a: { x: 100, y: 24 }, b: { x: 100, y: 152 } },
};

let container: HTMLDivElement;
let renderer: RfRenderer | null = null;

afterEach(() => {
  renderer?.destroy();
  renderer = null;
  container?.remove();
});

describe('RfRenderer', () => {
  it('draws the nodes with their labels and badge, plus a particle canvas', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new RfRenderer();
    renderer.mount(container);
    act(() => renderer!.setGraph(graph));
    await waitFor(() => expect(container.textContent).toContain('main.py'));
    expect(container.textContent).toContain('utils.py');
    expect(container.textContent).toContain('error');
    expect(container.querySelector('canvas.pv-rf-particles')).not.toBeNull();
    expect(container.querySelector('[data-renderer="rf2d"]')).not.toBeNull();
  });

  it('reports clicks, double clicks and background clicks', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new RfRenderer();
    renderer.mount(container);
    const seen: string[] = [];
    renderer.on('nodeClick', (p) => seen.push(`click:${p.nodeId}`));
    renderer.on('nodeDoubleClick', (p) => seen.push(`dbl:${p.nodeId}`));
    renderer.on('backgroundClick', () => seen.push('bg'));
    act(() => renderer!.setGraph(graph));
    await waitFor(() => expect(container.querySelector('.react-flow__node[data-id="a"]')).not.toBeNull());
    const node = container.querySelector('.react-flow__node[data-id="a"]')!;
    fireEvent.click(node);
    fireEvent.doubleClick(node);
    fireEvent.click(container.querySelector('.react-flow__pane')!);
    expect(seen).toEqual(['click:a', 'dbl:a', 'bg']);
  });

  it('marks the selected node', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new RfRenderer();
    renderer.mount(container);
    act(() => {
      renderer!.setGraph(graph);
      renderer!.select('b');
    });
    await waitFor(() => {
      const b = container.querySelector('.react-flow__node[data-id="b"] .pv-rf-node') as HTMLElement | null;
      expect(b?.style.borderWidth).toBe('3px');
    });
  });
});

describe('pointAt', () => {
  it('walks along a polyline', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(pointAt(pts, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAt(pts, 0.5)).toEqual({ x: 10, y: 0 });
    expect(pointAt(pts, 0.75)).toEqual({ x: 10, y: 5 });
    expect(pointAt(pts, 1)).toEqual({ x: 10, y: 10 });
  });
});
