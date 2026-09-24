import { describe, expect, it } from 'vitest';
import { loadFeatures } from './features';
import { createRegistry } from './registry';

describe('loadFeatures', () => {
  it('registers features in sorted order', () => {
    const order: string[] = [];
    const paths = loadFeatures(createRegistry(), {
      '../features/zoo/register.tsx': { default: () => order.push('zoo') },
      '../features/app/register.ts': { default: () => order.push('app') },
    });
    expect(paths).toEqual(['../features/app/register.ts', '../features/zoo/register.tsx']);
    expect(order).toEqual(['app', 'zoo']);
  });

  it('throws when a feature has no default export', () => {
    expect(() => loadFeatures(createRegistry(), { '../features/bad/register.ts': {} })).toThrow(
      'feature module has no default export',
    );
  });
});
