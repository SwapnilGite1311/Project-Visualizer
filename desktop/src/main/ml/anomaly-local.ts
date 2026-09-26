// Offline anomaly detection: the robust z-score part of the Python model (P5-MLANOM), without IsolationForest.

export interface SeriesPoint {
  t: number;
  v: number;
}
export interface Anomaly {
  t: number;
  v: number;
  score: number;
  direction: 'up' | 'down';
}

const MIN_POINTS = 24;
const WINDOW = 12;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function detectLocal(points: SeriesPoint[], sensitivity = 3.5): Anomaly[] {
  if (points.length < MIN_POINTS) return [];
  const values = points.map((p) => p.v);
  const half = Math.floor(WINDOW / 2);
  const residual = values.map((v, i) => v - median(values.slice(Math.max(0, i - half), i + half + 1)));
  const med = median(residual);
  let mad = median(residual.map((r) => Math.abs(r - med)));
  if (mad === 0) mad = residual.reduce((s, r) => s + Math.abs(r - med), 0) / residual.length || 1e-9;
  const out: Anomaly[] = [];
  residual.forEach((r, i) => {
    const score = (0.6745 * Math.abs(r - med)) / mad;
    if (score > sensitivity) {
      out.push({ t: points[i].t, v: values[i], score: Math.round(score * 1000) / 1000, direction: r > med ? 'up' : 'down' });
    }
  });
  return out;
}
