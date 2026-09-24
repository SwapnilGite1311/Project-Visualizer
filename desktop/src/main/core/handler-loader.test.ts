import { describe, expect, it, vi } from 'vitest';
import type { MainContext } from './context';
import { loadHandlers } from './handler-loader';

describe('loadHandlers', () => {
  it('calls every module in sorted order', () => {
    const order: string[] = [];
    const ctx = {} as MainContext;
    const paths = loadHandlers(ctx, {
      '../handlers/zeta.ts': { default: () => order.push('zeta') },
      '../handlers/alpha.ts': { default: vi.fn(() => order.push('alpha')) },
    });
    expect(paths).toEqual(['../handlers/alpha.ts', '../handlers/zeta.ts']);
    expect(order).toEqual(['alpha', 'zeta']);
  });

  it('throws for a module without a default export', () => {
    expect(() => loadHandlers({} as MainContext, { '../handlers/broken.ts': {} })).toThrow(
      'handler module has no default export: ../handlers/broken.ts',
    );
  });
});
