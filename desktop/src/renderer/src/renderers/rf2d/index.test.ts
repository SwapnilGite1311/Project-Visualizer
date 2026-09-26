import { describe, expect, it } from 'vitest';
import { getRenderer } from '../../view/renderers';
import { renderer } from './index';

describe('rf2d entry', () => {
  it('is the preferred 2D renderer and uses engine layouts', () => {
    expect(renderer).toMatchObject({ id: 'rf2d', mode: '2d', preferred: true, layout: 'engine' });
    expect(getRenderer('2d')?.id).toBe('rf2d');
  });

  it('leaves the Classic view selectable', () => {
    expect(getRenderer('2d', undefined, 'cy2d')?.id).toBe('cy2d');
  });
});
