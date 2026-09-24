import { describe, expect, it } from 'vitest';
import { gedge, gnode, levelView } from '../../view/test-data';
import { buildFocusOverlay } from './focus-overlay';

describe('buildFocusOverlay', () => {
  it('styles the node, its direct neighbours and their edges', () => {
    const view = levelView(
      [gnode('module:a.py', 'module'), gnode('module:b.py', 'module'), gnode('module:c.py', 'module'), gnode('module:d.py', 'module')],
      [gedge('module:a.py', 'module:b.py', 'imports'), gedge('module:c.py', 'module:a.py', 'imports'), gedge('module:c.py', 'module:d.py', 'imports')],
    );
    const o = buildFocusOverlay(view, 'module:a.py');
    expect(o.priority).toBe(40);
    expect(o.dimOthers).toBe(true);
    expect(o.nodes['module:a.py']).toEqual({ opacity: 1, borderColor: '#fbbf24' });
    expect(o.nodes['module:b.py']).toEqual({ opacity: 1 });
    expect(o.nodes['module:c.py']).toEqual({ opacity: 1 });
    expect(o.nodes['module:d.py']).toBeUndefined();
    expect(Object.keys(o.edges).sort()).toEqual(['agg|imports|module:a.py|module:b.py', 'agg|imports|module:c.py|module:a.py']);
    expect(o.edges['agg|imports|module:a.py|module:b.py']).toEqual({ opacity: 1, width: 3 });
  });

  it('keeps the focus border on self-loops', () => {
    const o = buildFocusOverlay(levelView([gnode('module:a.py', 'module')], [gedge('module:a.py', 'module:a.py')]), 'module:a.py');
    expect(o.nodes['module:a.py']).toEqual({ opacity: 1, borderColor: '#fbbf24' });
  });
});
