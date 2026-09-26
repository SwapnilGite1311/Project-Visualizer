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

  it('fills ids from folder names and honours the choice, then preferred, then first', () => {
    const many = {
      '../renderers/cy2d/index.ts': { renderer: { mode: '2d' as const, create: () => fake } },
      '../renderers/rf2d/index.ts': { renderer: { mode: '2d' as const, create: () => fake, preferred: true, label: 'React Flow' } },
      '../renderers/zz2d/index.ts': { renderer: { mode: '2d' as const, create: () => fake, id: 'custom' } },
    };
    expect(listRenderers(many).map((r) => r.id)).toEqual(['cy2d', 'rf2d', 'custom']);
    expect(getRenderer('2d', many)?.id).toBe('rf2d');
    expect(getRenderer('2d', many, 'cy2d')?.id).toBe('cy2d');
    expect(getRenderer('2d', many, 'missing')?.id).toBe('rf2d');
    expect(getRenderer('2d', { '../renderers/a/index.ts': many['../renderers/cy2d/index.ts'] })?.id).toBe('a');
  });
});
