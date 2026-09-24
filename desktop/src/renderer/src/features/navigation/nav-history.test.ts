import { describe, expect, it } from 'vitest';
import { NavHistory } from './nav-history';

describe('NavHistory', () => {
  it('moves back and forward', () => {
    const h = new NavHistory();
    expect(h.canBack()).toBe(false);
    h.push('a');
    h.push('b');
    h.push('c');
    expect(h.back()).toBe('b');
    expect(h.back()).toBe('a');
    expect(h.back()).toBeNull();
    expect(h.forward()).toBe('b');
    expect(h.canForward()).toBe(true);
  });

  it('drops forward entries after a push and ignores duplicates', () => {
    const h = new NavHistory();
    h.push('a');
    h.push('b');
    h.back();
    h.push('c');
    expect(h.canForward()).toBe(false);
    h.push('c');
    expect(h.back()).toBe('a');
    expect(h.current()).toBe('a');
  });

  it('keeps at most 100 entries', () => {
    const h = new NavHistory();
    for (let i = 0; i < 150; i++) h.push(`n${i}`);
    let steps = 0;
    while (h.back()) steps++;
    expect(steps).toBe(99);
    expect(h.current()).toBe('n50');
  });
});
