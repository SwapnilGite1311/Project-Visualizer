import { describe, expect, it } from 'vitest';
import type { GraphRenderer } from './renderer-types';
import { getRenderer, listRenderers } from './renderers';

const fake = {} as GraphRenderer;
const modules = {
  '../renderers/fg3d/index.ts': { renderer: { mode: '3d' as const, create: () => fake } },
  '../renderers/cy2d/index.ts': { renderer: { mode: '2d' as const, create: () => fake } },
  '../renderers/none/index.ts': {},
};

describe('renderer discovery', () => {
  it('lists renderers and skips modules without one', () => {
    expect(listRenderers(modules).map((r) => r.mode)).toEqual(['2d', '3d']);
  });

  it('finds a renderer by mode', () => {
    expect(getRenderer('3d', modules)?.mode).toBe('3d');
    expect(getRenderer('2d', {})).toBeUndefined();
  });
});
