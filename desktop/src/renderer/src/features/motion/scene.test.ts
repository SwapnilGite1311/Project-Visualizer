import { describe, expect, it } from 'vitest';
import { activeBlockId, BLOCK_COLORS, floorsFor, layoutBlocks } from './scene';
import { getUserBody } from './test-data';

describe('scene', () => {
  it('lays blocks out as an indented path', () => {
    const p = layoutBlocks(getUserBody.blocks);
    expect(p.map((x) => [x.blockId, x.index, x.x, x.y, x.width])).toEqual([
      ['b1', 0, 0, 0, 560],
      ['b2', 1, 36, 52, 524],
      ['b3', 2, 0, 104, 560],
      ['b4', 3, 0, 156, 560],
    ]);
    expect(p[0].color).toBe(BLOCK_COLORS.if);
    expect(p[1].color).toBe(BLOCK_COLORS.raise);
  });

  it('finds the running block', () => {
    expect(activeBlockId(getUserBody.blocks, 9)).toBe('b1');
    expect(activeBlockId(getUserBody.blocks, 10)).toBe('b2');
    expect(activeBlockId(getUserBody.blocks, 11)).toBe('b3');
    expect(activeBlockId(getUserBody.blocks, 99)).toBeNull();
  });

  it('builds one floor per frame with a body', () => {
    const bodies = new Map([[getUserBody.node_id, getUserBody]]);
    const stack = [
      { nodeId: 'function:main.py#main', line: 9, locals: {}, changed: [] },
      { nodeId: getUserBody.node_id, line: 11, locals: {}, changed: [] },
    ];
    expect(floorsFor(stack, bodies)).toEqual([{ nodeId: getUserBody.node_id, level: 0, activeBlockId: 'b3' }]);
  });
});
