import { describe, expect, it } from 'vitest';
import { getRenderer } from '../../view/renderers';

describe('3D renderer entry', () => {
  it('is discovered for mode 3d', () => {
    expect(getRenderer('3d')?.mode).toBe('3d');
  });
});
