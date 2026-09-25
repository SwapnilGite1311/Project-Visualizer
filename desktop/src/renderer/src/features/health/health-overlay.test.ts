import { describe, expect, it } from 'vitest';
import type { Health } from '../../api/types';
import type { HealthInfo } from './health-api';
import { buildHealthOverlay } from './health-overlay';

const info = (state: Health, errors = 0): HealthInfo => ({
  state,
  calls: 10,
  errors,
  error_rate: errors / 10,
  p95_ms: 5,
  stalled: state === 'stalled',
  reason: '',
});

describe('buildHealthOverlay', () => {
  it('colors each state', () => {
    const o = buildHealthOverlay({
      a: info('ok'),
      b: info('warning'),
      c: info('stalled'),
      d: info('error', 3),
      e: info('error'),
      f: info('unknown'),
    });
    expect(o.priority).toBe(30);
    expect(o.dimOthers).toBeUndefined();
    expect(o.nodes).toEqual({
      a: { borderColor: '#22c55e' },
      b: { color: '#f59e0b' },
      c: { color: '#a855f7', pulse: true, badge: 'stalled' },
      d: { color: '#ef4444', badge: '3 err' },
      e: { color: '#ef4444', badge: 'error' },
    });
    expect(buildHealthOverlay({}).nodes).toEqual({});
  });
});
