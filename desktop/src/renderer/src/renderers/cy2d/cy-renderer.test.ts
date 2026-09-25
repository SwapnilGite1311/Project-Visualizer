import { describe, expect, it, vi } from 'vitest';
import { buildViewGraph } from '../../view/model';
import { gedge, gnode, levelView } from '../../view/test-data';
import cytoscape from 'cytoscape';
import { CyRenderer, fitCapped, MAX_FIT_ZOOM } from './cy-renderer';

function graph(overlays = {}) {
  return buildViewGraph(
    levelView(
      [gnode('a', 'module'), gnode('b', 'module'), gnode('c', 'class')],
      [gedge('a', 'b'), gedge('b', 'c', 'imports')],
    ),
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

describe('fitCapped', () => {
  it('never leaves the view above the maximum fit zoom', () => {
    const cy = cytoscape({ headless: true, elements: [{ data: { id: 'solo' } }] });
    cy.fit = () => cy.zoom(3) as unknown as typeof cy;
    fitCapped(cy);
    expect(cy.zoom()).toBe(MAX_FIT_ZOOM);
    cy.destroy();
  });

  it('re-fits the map when its area is resized, unless the user moved the view', () => {
    const r = mounted();
    r.setGraph(graph());
    const fit = vi.spyOn(r.core!, 'fit');
    r.handleResize();
    expect(fit).toHaveBeenCalledTimes(1);
    r.core!.zoom(2.5); // the user zooms in
    r.handleResize();
    expect(fit).toHaveBeenCalledTimes(1);
    r.fit(); // "fit to screen" gives the automatic behaviour back
    r.handleResize();
    expect(fit).toHaveBeenCalledTimes(3);
    r.destroy();
  });
});
