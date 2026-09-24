import { describe, expect, it, vi } from 'vitest';
import { buildViewGraph } from '../../view/model';
import { gedge, gnode, levelView } from '../../view/test-data';
import { CyRenderer } from './cy-renderer';

function graph(overlays = {}) {
  return buildViewGraph(
    levelView([gnode('a', 'module'), gnode('b', 'module'), gnode('c', 'class')], [gedge('a', 'b'), gedge('b', 'c', 'imports')]),
    overlays,
  );
}

function mounted() {
  const r = new CyRenderer({ headless: true });
  r.mount({} as HTMLElement);
  return r;
}

describe('CyRenderer (headless)', () => {
  it('draws nodes and edges', () => {
    const r = mounted();
    r.setGraph(graph());
    expect(r.core!.nodes().length).toBe(3);
    expect(r.core!.edges().length).toBe(2);
    r.destroy();
  });

  it('updates styles without moving nodes', () => {
    const r = mounted();
    r.setGraph(graph());
    const before = { ...r.core!.$id('a').position() };
    r.updateStyles(graph({ impact: { priority: 1, nodes: { a: { color: 'red' } }, edges: {} } }));
    expect(r.core!.$id('a').data('color')).toBe('red');
    expect(r.core!.$id('a').position()).toEqual(before);
    r.destroy();
  });

  it('selects nodes', () => {
    const r = mounted();
    r.setGraph(graph());
    r.select('b');
    expect(r.core!.$id('b').selected()).toBe(true);
    r.select(null);
    expect(r.core!.$id('b').selected()).toBe(false);
    r.destroy();
  });

  it('reports node clicks to listeners', () => {
    const r = mounted();
    r.setGraph(graph());
    const onClick = vi.fn();
    const off = r.on('nodeClick', onClick);
    r.core!.$id('a').emit('tap');
    expect(onClick).toHaveBeenCalledWith({ nodeId: 'a', x: 0, y: 0 });
    off();
    r.core!.$id('a').emit('tap');
    expect(onClick).toHaveBeenCalledTimes(1);
    r.destroy();
  });
});
