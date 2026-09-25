import { describe, expect, it, vi } from 'vitest';
import { initialSize, MIN_SIZE } from './window';

vi.mock('electron', () => ({
  app: {},
  BrowserWindow: vi.fn(),
  screen: {},
  session: {},
  shell: {},
}));

describe('initialSize', () => {
  it('uses 1400x900 on large screens', () => {
    expect(initialSize({ width: 1920, height: 1040 })).toEqual({ width: 1400, height: 900 });
  });

  it('fits small screens (1366x768 at 125% scaling)', () => {
    expect(initialSize({ width: 1093, height: 574 })).toEqual({ width: 984, height: 560 });
  });

  it('never goes below the minimum size', () => {
    expect(initialSize({ width: 600, height: 400 })).toEqual(MIN_SIZE);
  });
});
