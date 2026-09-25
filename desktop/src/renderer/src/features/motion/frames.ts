import type { Step } from './motion-api';

export interface Frame {
  nodeId: string;
  line: number;
  locals: Record<string, string>;
  changed: string[];
}

// Keeps exactly `size` frames: cuts deeper ones, or adds placeholders when the trace started mid-stack.
function fit(stack: Frame[], size: number, nodeId: string, line: number): Frame[] {
  const out = stack.slice(0, size);
  while (out.length < size) out.push({ nodeId, line, locals: {}, changed: [] });
  return out;
}

export function applyStep(stack: Frame[], step: Step): Frame[] {
  const keys = Object.keys(step.locals);
  if (step.kind === 'call') {
    return [...fit(stack, step.depth, step.node_id, step.line), { nodeId: step.node_id, line: step.line, locals: { ...step.locals }, changed: keys }];
  }
  const out = fit(stack, step.depth + 1, step.node_id, step.line);
  const top = out[out.length - 1];
  out[out.length - 1] = {
    ...top,
    line: step.line,
    locals: { ...top.locals, ...step.locals },
    changed: step.kind === 'exception' ? [] : keys,
  };
  return step.kind === 'return' ? out.slice(0, -1) : out;
}

// Stacks at any step, replayed from checkpoints so scrubbing a long trace stays fast.
export class FrameIndex {
  private checkpoints = new Map<number, Frame[]>();

  constructor(private readonly every = 500) {}

  reset(): void {
    this.checkpoints.clear();
  }

  // The stack after applying step i.
  stackAt(steps: Step[], i: number): Frame[] {
    if (i < 0 || steps.length === 0) return [];
    const last = Math.min(i, steps.length - 1);
    let start = Math.floor(last / this.every) * this.every;
    while (start > 0 && !this.checkpoints.has(start)) start -= this.every;
    let stack = start > 0 ? this.checkpoints.get(start)! : [];
    for (let k = start; k <= last; k++) {
      if (k > 0 && k % this.every === 0 && k !== start) this.checkpoints.set(k, stack);
      stack = applyStep(stack, steps[k]);
    }
    return stack;
  }
}
