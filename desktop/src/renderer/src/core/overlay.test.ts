import { describe, expect, it } from 'vitest';
import { mergeOverlays } from './overlay';

describe('mergeOverlays', () => {
  it('lets the higher priority win and keeps other fields', () => {
    const merged = mergeOverlays({
      impact: {
        priority: 10,
        nodes: { a: { color: 'red', badge: '1' } },
        edges: { e: { width: 3 } },
      },
      runtime: { priority: 20, nodes: { a: { color: 'green' } }, edges: {}, dimOthers: true },
    });
    expect(merged.nodes.a).toEqual({ color: 'green', badge: '1' });
    expect(merged.edges.e).toEqual({ width: 3 });
    expect(merged.dimOthers).toBe(true);
  });

  it('returns an empty result for no overlays', () => {
    expect(mergeOverlays({})).toEqual({ nodes: {}, edges: {}, dimOthers: false });
  });
});
