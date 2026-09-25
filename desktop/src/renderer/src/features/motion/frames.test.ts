import { describe, expect, it } from 'vitest';
import { applyStep, type Frame, FrameIndex } from './frames';
import type { Step } from './motion-api';
import { step } from './test-data';

const replay = (steps: Step[], i: number) => steps.slice(0, i + 1).reduce<Frame[]>(applyStep, []);

describe('applyStep', () => {
  it('pushes, updates and pops frames', () => {
    const steps = [
      step('call', 'f:main', 0, 7),
      step('line', 'f:main', 0, 8),
      step('call', 'f:get', 1, 20, { user_id: '1' }),
      step('line', 'f:get', 1, 21, { user: "'alice'" }),
      step('return', 'f:get', 1, 22, {}, "'alice'"),
      step('line', 'f:main', 0, 9, { user: "'alice'" }),
    ];
    expect(replay(steps, 2).map((f) => f.nodeId)).toEqual(['f:main', 'f:get']);
    expect(replay(steps, 3)[1]).toEqual({ nodeId: 'f:get', line: 21, locals: { user_id: '1', user: "'alice'" }, changed: ['user'] });
    expect(replay(steps, 4).map((f) => f.nodeId)).toEqual(['f:main']);
    expect(replay(steps, 5)[0]).toMatchObject({ line: 9, locals: { user: "'alice'" }, changed: ['user'] });
  });

  it('trims the stack to the step depth and fills gaps', () => {
    const stack = replay([step('call', 'a', 0, 1), step('call', 'b', 1, 2), step('call', 'c', 2, 3)], 2);
    expect(applyStep(stack, step('line', 'a', 0, 5)).map((f) => f.nodeId)).toEqual(['a']);
    expect(applyStep([], step('line', 'x', 2, 5)).map((f) => f.nodeId)).toEqual(['x', 'x', 'x']);
  });

  it('keeps no changed names on an exception', () => {
    const stack = applyStep([], step('call', 'a', 0, 1, { n: '1' }));
    expect(applyStep(stack, step('exception', 'a', 0, 2, {}, 'ValueError: x'))[0].changed).toEqual([]);
  });
});

describe('FrameIndex', () => {
  it('matches a naive replay at random steps', () => {
    const steps: Step[] = [];
    let depth = 0;
    for (let k = 0; k < 3000; k++) {
      const r = (k * 7919) % 10;
      if (r < 3 && depth < 6) steps.push(step('call', `n${depth + 1}`, depth++, k, { k: String(k) }));
      else if (r < 5 && depth > 0) steps.push(step('return', `n${depth}`, --depth, k));
      else steps.push(step('line', `n${Math.max(depth, 1)}`, Math.max(depth - 1, 0), k, { v: String(k) }));
    }
    const index = new FrameIndex(100);
    for (let n = 0; n < 50; n++) {
      const i = (n * 2654435761) % steps.length;
      expect(index.stackAt(steps, i)).toEqual(replay(steps, i));
    }
    expect(index.stackAt(steps, -1)).toEqual([]);
  });
});
