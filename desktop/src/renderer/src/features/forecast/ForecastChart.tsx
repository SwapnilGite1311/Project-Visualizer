import { useEffect, useRef, useState } from 'react';
import type { ForecastMetric, ForecastPoint, SeriesPoint } from './local-models';

export interface ForecastChartProps {
  metric: ForecastMetric;
  history: SeriesPoint[];
  forecast: ForecastPoint[];
  anomalies?: SeriesPoint[];
  subject?: string;
}

const H = 200;
const M = { left: 48, right: 10, top: 10, bottom: 30 };
const TICK_MS = 12 * 3_600_000;
const MIN_LABEL_GAP = 72;

// Draw at the real width so the text stays readable in a narrow side panel.
function useWidth(fallback: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export const METRIC_LABEL: Record<ForecastMetric, string> = { error_rate: 'Error rate (%)', p95_ms: 'Latency P95 (ms)' };
export const formatValue = (metric: ForecastMetric, v: number) =>
  metric === 'error_rate' ? `${Math.round(v * 1000) / 10}%` : `${Math.round(v)} ms`;
const timeLabel = (t: number) => new Date(t).toLocaleString(undefined, { weekday: 'short', hour: 'numeric' });

// History (solid), forecast (dashed) inside its 95 % band, and unusual history points (red dots).
export function ForecastChart({ metric, history, forecast, anomalies = [], subject }: ForecastChartProps) {
  const [ref, W] = useWidth(600);
  const all = [...history, ...forecast];
  if (all.length === 0) return null;
  const t0 = all[0].t;
  const t1 = Math.max(all[all.length - 1].t, t0 + 1);
  const yMax = Math.max(...history.map((p) => p.v), ...forecast.map((p) => Math.max(p.v, p.upper)), 0) * 1.1 || 1;
  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * (W - M.left - M.right);
  const y = (v: number) => H - M.bottom - (v / yMax) * (H - M.top - M.bottom);
  const path = (pts: SeriesPoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');

  const last = history[history.length - 1];
  const forecastLine = last ? [last, ...forecast] : forecast;
  const band = forecast.length
    ? [...forecast.map((p) => `${x(p.t).toFixed(1)},${y(p.upper).toFixed(1)}`), ...[...forecast].reverse().map((p) => `${x(p.t).toFixed(1)},${y(p.lower).toFixed(1)}`)].join(' ')
    : '';
  const perTick = (TICK_MS / (t1 - t0)) * (W - M.left - M.right);
  const step = TICK_MS * Math.max(1, Math.ceil(MIN_LABEL_GAP / Math.max(perTick, 1)));
  const ticks: number[] = [];
  for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) ticks.push(t);
  const title = `${METRIC_LABEL[metric]}${subject ? ` of ${subject}` : ''}: ${history.length} hours of history and a ${forecast.length}-hour forecast`;

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={title} style={{ display: 'block', flexShrink: 0 }}>
      <title>{title}</title>
      <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} style={{ stroke: 'var(--border)' }} />
      <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} style={{ stroke: 'var(--border)' }} />
      {[0, 0.5, 1].map((f) => (
        <text key={f} x={M.left - 4} y={y(yMax * f) + 3} textAnchor="end" fontSize={11} style={{ fill: 'var(--fg-muted)' }}>
          {formatValue(metric, yMax * f)}
        </text>
      ))}
      <text x={12} y={(H - M.bottom + M.top) / 2} fontSize={11} textAnchor="middle" transform={`rotate(-90 12 ${(H - M.bottom + M.top) / 2})`} style={{ fill: 'var(--fg-muted)' }}>
        {METRIC_LABEL[metric]}
      </text>
      {ticks.map((t) => (
        <g key={t} data-tick>
          <line x1={x(t)} y1={H - M.bottom} x2={x(t)} y2={H - M.bottom + 4} style={{ stroke: 'var(--border)' }} />
          <text x={x(t)} y={H - M.bottom + 16} fontSize={11} textAnchor="middle" style={{ fill: 'var(--fg-muted)' }}>
            {timeLabel(t)}
          </text>
        </g>
      ))}
      {band && <polygon data-part="band" points={band} style={{ fill: 'var(--accent)', opacity: 0.15 }} />}
      {last && forecast.length > 0 && (
        <line x1={x(last.t)} y1={M.top} x2={x(last.t)} y2={H - M.bottom} strokeDasharray="2 3" style={{ stroke: 'var(--fg-muted)' }} />
      )}
      {history.length > 0 && <path data-part="history" d={path(history)} fill="none" strokeWidth={2} style={{ stroke: 'var(--accent)' }} />}
      {history.length <= 12 &&
        history.map((p) => <circle key={p.t} data-part="history-point" cx={x(p.t)} cy={y(p.v)} r={3} style={{ fill: 'var(--accent)' }} />)}
      {forecast.length > 0 && (
        <path data-part="forecast" d={path(forecastLine)} fill="none" strokeWidth={2} strokeDasharray="6 4" style={{ stroke: 'var(--accent)' }} />
      )}
      {anomalies.map((a) => (
        <circle key={a.t} data-part="anomaly" cx={x(a.t)} cy={y(a.v)} r={4} fill="#ef4444">
          <title>Unusual: {formatValue(metric, a.v)}</title>
        </circle>
      ))}
    </svg>
  );
}
