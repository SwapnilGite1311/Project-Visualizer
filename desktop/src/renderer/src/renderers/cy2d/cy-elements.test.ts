import { describe, expect, it } from 'vitest';
import { buildViewGraph } from '../../view/model';
import { gedge, gnode, levelView } from '../../view/test-data';
import { toElements } from './cy-elements';

describe('toElements', () => {
  it('converts nodes then edges and skips dangling edges', () => {
    const graph = buildViewGraph(
      levelView([gnode('a', 'module'), gnode('b', 'module')], [gedge('a', 'b'), gedge('a', 'missing')]),
      { impact: { priority: 1, nodes: { a: { badge: '1', pulse: true } }, edges: { 'agg|calls|a|b': { animated: true } } } },
    );
    const elements = toElements(graph);
    expect(elements).toHaveLength(3);
    expect(elements[0].data).toMatchObject({ id: 'a', label: 'a', displayLabel: 'a [1]', kind: 'module' });
    expect(elements[0].classes).toBe('pulse');
    expect(elements[1].data.displayLabel).toBe('b');
    expect(elements[2].data).toMatchObject({ source: 'a', target: 'b', kind: 'calls' });
    expect(elements[2].classes).toBe('animated');
  });
});
