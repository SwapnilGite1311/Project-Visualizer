// Offline health forecasts. The cloud uses a damped Holt-Winters fit (P5-MLFC); here it is plain Holt (level + trend)
// with fixed smoothing, which is close enough for a day ahead. The state rules and the confidence are the Python ones.

export interface SeriesPoint {
  t: number;
  v: number;
}
export interface ForecastPoint extends SeriesPoint {
  lower: number;
  upper: number;
}
export type ForecastMetric = 'error_rate' | 'p95_ms';
export type PredictedState = 'ok' | 'warning' | 'error' | 'unknown';

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

export function holtLinear(values: number[], horizon: number, alpha = 0.5, beta = 0.3): { forecast: number[]; residualStd: number } {
  if (values.length === 0) return { forecast: [], residualStd: 0 };
  if (values.length < 3) {
    const m = mean(values);
    return { forecast: Array.from({ length: horizon }, () => m), residualStd: std(values) };
  }
  let level = values[0];
  let trend = values[1] - values[0];
  const residuals: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const fitted = level + trend;
    residuals.push(values[i] - fitted);
    const next = alpha * values[i] + (1 - alpha) * fitted;
    trend = beta * (next - level) + (1 - beta) * trend;
    level = next;
  }
  return { forecast: Array.from({ length: horizon }, (_, h) => level + (h + 1) * trend), residualStd: std(residuals) };
}

// Forecast points after the last history point, with a 95 % band; never below 0, an error rate never above 1.
export function forecastPoints(points: SeriesPoint[], horizon: number, stepMs: number, metric: string): ForecastPoint[] {
  if (points.length === 0) return [];
  const { forecast, residualStd } = holtLinear(
    points.map((p) => p.v),
    horizon,
  );
  const band = 1.96 * residualStd;
  const clip = (x: number) => (metric === 'error_rate' ? Math.min(1, Math.max(0, x)) : Math.max(0, x));
  const lastT = points[points.length - 1].t;
  return forecast.map((raw, i) => {
    const v = clip(raw);
    return { t: lastT + (i + 1) * stepMs, v: round6(v), lower: round6(clip(v - band)), upper: round6(clip(v + band)) };
  });
}

export function predictedState(metric: string, points: SeriesPoint[]): PredictedState {
  const peak = points.reduce((m, p) => Math.max(m, p.v), 0);
  if (metric === 'error_rate') {
    if (peak >= 0.05) return 'error';
    return peak > 0 ? 'warning' : 'ok';
  }
  if (metric === 'p95_ms') return peak > 1000 ? 'warning' : 'ok';
  return 'unknown';
}

export const confidenceOf = (nPoints: number) => Math.round(Math.min(1, nPoints / 48) * 1000) / 1000;
