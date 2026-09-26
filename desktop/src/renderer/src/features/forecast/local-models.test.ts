import { describe, expect, it } from 'vitest';
import { confidenceOf, forecastPoints, holtLinear, predictedState } from './local-models';

const HOUR = 3_600_000;

describe('local forecasting models', () => {
  it('continues a straight line', () => {
    const { forecast, residualStd } = holtLinear([1, 3, 5, 7, 9, 11], 3);
    expect(forecast.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([13, 15, 17]);
    expect(residualStd).toBeCloseTo(0, 9);
  });

  it('uses the mean with fewer than 3 values', () => {
    expect(holtLinear([2, 4], 2).forecast).toEqual([3, 3]);
    expect(holtLinear([], 2).forecast).toEqual([]);
  });

  it('builds timed points with a band, clipped to valid values', () => {
    const history = [0.9, 0.95, 1, 0.9, 1, 0.95, 1].map((v, i) => ({ t: i * HOUR, v }));
    const out = forecastPoints(history, 4, HOUR, 'error_rate');
    expect(out.map((p) => p.t)).toEqual([7, 8, 9, 10].map((h) => h * HOUR));
    for (const p of out) {
      expect(p.v).toBeLessThanOrEqual(1);
      expect(p.upper).toBeLessThanOrEqual(1);
      expect(p.lower).toBeLessThanOrEqual(p.v);
    }

    const falling = [50, 40, 30, 20, 10].map((v, i) => ({ t: i, v }));
    const down = forecastPoints(falling, 3, 1, 'p95_ms');
    expect(down.map((p) => p.v)).toEqual([0, 0, 0]);
    expect(down.every((p) => p.lower === 0)).toBe(true);
  });

  it('uses the Python state rules and confidence', () => {
    expect(predictedState('error_rate', [{ t: 0, v: 0.06 }])).toBe('error');
    expect(predictedState('error_rate', [{ t: 0, v: 0.01 }])).toBe('warning');
    expect(predictedState('error_rate', [{ t: 0, v: 0 }])).toBe('ok');
    expect(predictedState('p95_ms', [{ t: 0, v: 1200 }])).toBe('warning');
    expect(predictedState('p95_ms', [{ t: 0, v: 200 }])).toBe('ok');
    expect(predictedState('calls', [])).toBe('unknown');
    expect(confidenceOf(24)).toBe(0.5);
    expect(confidenceOf(100)).toBe(1);
  });
});
