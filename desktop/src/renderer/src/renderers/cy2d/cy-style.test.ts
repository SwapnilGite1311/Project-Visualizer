import { describe, expect, it } from 'vitest';
import { buildStylesheet } from './cy-style';

describe('buildStylesheet', () => {
  it('has the five selectors in order', () => {
    expect(buildStylesheet().map((s) => s.selector)).toEqual(['node', 'node:selected', 'node.pulse', 'edge', 'edge.animated']);
  });
});
