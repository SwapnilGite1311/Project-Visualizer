import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../../core/store';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { revealNode } from '../../view/reveal';
import { shortLabel } from '../depnav/labels';
import { ancestorsById } from './ancestors';
import {
  type Hop,
  type TraceStep,
  type TraceSummary,
  follow,
  getTrace,
  recentTraces,
} from './runtime-api';
import { buildTraceOverlay, waterfall } from './trace-overlay';

export const TRACES_POLL_MS = 3000;

const ms = (ns: number) => `${(ns / 1e6).toFixed(ns < 10e6 ? 2 : 0)} ms`;
const clock = (ns: number) => new Date(ns / 1e6).toLocaleTimeString();
const labelOf = (s: TraceStep) => (s.node_id ? shortLabel(s.node_id) : s.name);

export function TracesView() {
  const pid = useAppStore((s) => s.projectId);
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [hops, setHops] = useState<Hop[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!pid) return;
    try {
      setTraces(await recentTraces(pid, 50));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [pid]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), TRACES_POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const open = async (traceId: string) => {
    if (!pid) return;
    setSelected(traceId);
    setHops(null);
    try {
      setSteps((await getTrace(pid, traceId)).steps);
    } catch (e) {
      setSteps([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const showOnMap = async () => {
    if (!pid) return;
    const ancestors = await ancestorsById(
      pid,
      steps.map((s) => s.node_id),
    );
    useAppStore.getState().setOverlay('trace', buildTraceOverlay(steps, ancestors));
  };

  const followModules = async () => {
    if (!pid || !selected) return;
    setHops(await follow(pid, selected, 'forward'));
  };

  if (!pid) return <EmptyState title="Open a project to see its traces" />;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 1fr) 2fr',
        gap: 8,
        height: '100%',
        minHeight: 0,
      }}
    >
      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
          <strong style={{ fontSize: 12 }}>Recent requests</strong>
          <Button size="sm" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
        {traces.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            No traces yet. Run your program with an agent (Connect tab).
          </div>
        )}
        <ul aria-label="Traces" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {traces.map((t) => (
            <li key={t.trace_id}>
              <button
                type="button"
                aria-pressed={selected === t.trace_id}
                onClick={() => void open(t.trace_id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  font: 'inherit',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  background:
                    selected === t.trace_id
                      ? 'var(--accent-soft, rgba(59,130,246,0.15))'
                      : 'transparent',
                  color: 'inherit',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.root_name || t.trace_id}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {clock(t.start_ns)} · {ms(t.duration_ns)} · {t.spans} steps
                </span>
                {t.errors > 0 && <Badge tone="danger">{t.errors} errors</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        {!selected ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Pick a request to see every step it took.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <Button size="sm" onClick={() => void showOnMap()} disabled={steps.length === 0}>
                Show on map
              </Button>
              <Button size="sm" onClick={() => useAppStore.getState().setOverlay('trace', null)}>
                Clear map
              </Button>
              <Button size="sm" onClick={() => void followModules()}>
                Follow across modules
              </Button>
            </div>
            {hops && (
              <ol
                aria-label="Module hops"
                style={{ margin: '0 0 6px', paddingLeft: 18, fontSize: 12 }}
              >
                {hops.length === 0 && <li>This request stayed inside one module.</li>}
                {hops.map((h, i) => (
                  <li key={i} style={{ color: h.status === 'error' ? 'var(--danger)' : undefined }}>
                    {shortLabel(h.from_id)} → {shortLabel(h.to_id)} ({ms(h.duration_ns)})
                  </li>
                ))}
              </ol>
            )}
            <ul aria-label="Steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {waterfall(steps).map(({ step, depth, offsetPct, widthPct }) => (
                <li
                  key={step.event_id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(160px, 1fr) 2fr',
                    gap: 6,
                    alignItems: 'center',
                    fontSize: 12,
                  }}
                >
                  <button
                    type="button"
                    disabled={!step.node_id}
                    onClick={() => void revealNode(step.node_id)}
                    title={step.name}
                    style={{
                      paddingLeft: depth * 12,
                      border: 'none',
                      background: 'none',
                      font: 'inherit',
                      textAlign: 'left',
                      cursor: step.node_id ? 'pointer' : 'default',
                      color: step.status === 'error' ? 'var(--danger)' : 'inherit',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {labelOf(step)}
                  </button>
                  <div style={{ position: 'relative', height: 10 }} title={ms(step.duration_ns)}>
                    <div
                      data-testid="bar"
                      style={{
                        position: 'absolute',
                        left: `${offsetPct}%`,
                        width: `${widthPct}%`,
                        top: 0,
                        bottom: 0,
                        borderRadius: 2,
                        background: step.status === 'error' ? '#ef4444' : '#38bdf8',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
