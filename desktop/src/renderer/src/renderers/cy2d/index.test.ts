import { describe, expect, it } from 'vitest';
import { getRenderer } from '../../view/renderers';

describe('cy2d entry', () => {
  it('is discovered as the 2d renderer', () => {
    expect(getRenderer('2d')?.mode).toBe('2d');
  });
});
