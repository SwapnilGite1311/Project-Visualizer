import { useState } from 'react';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Spinner } from '../../ui/Spinner';
import { revealNode } from '../../view/reveal';
import { useChangeStore } from '../change-preview/change-store';
import { shortLabel } from '../depnav/labels';
import { RecommendationCard } from '../recommend/RecommendationCard';
import { useRecommendInputs } from '../recommend/recommend-inputs';
import type { SimChange } from './sim-api';
import { isSandboxRoot, useSimStore } from './sim-store';

export function describeChange(c: SimChange): string {
  const n = c.node_id ? shortLabel(c.node_id) : '';
  switch (c.kind) {
    case 'delete_node':
      return `Remove ${n}`;
    case 'set_latency':
      return `${n} ×${c.factor} slower`;
    case 'set_error_rate':
      return `${n} fails ${Math.round((c.rate ?? 0) * 100)}% of the time`;
    case 'remove_edge':
      return `${shortLabel(c.source_id ?? '')} no longer uses ${shortLabel(c.target_id ?? '')}`;
    case 'add_edge':
      return `${shortLabel(c.source_id ?? '')} starts using ${shortLabel(c.target_id ?? '')}`;
    default:
      return `${c.kind} ${n}`;
  }
}

const ms = (v: number) => `${Math.round(v * 10) / 10} ms`;

// Real vs simulated, side by side.
export function SimulationPanel() {
  const sim = useSimStore();
  const projectRoot = useAppStore((s) => s.projectRoot);
  const preview = useChangeStore((s) => s.preview);
  const failurePredictions = useRecommendInputs((s) => s.failurePredictions);
  const forecasts = useRecommendInputs((s) => s.forecasts);
  const [label, setLabel] = useState('');

  if (!sim.active) {
    if (!projectRoot || isSandboxRoot(projectRoot)) return <EmptyState title="Open a project to try changes in a sandbox" />;
    return (
      <EmptyState
        title="Try a change without touching your code"
        detail="A sandbox is a copy of the map. Remove parts, slow them down or make them fail, then replay the requests your app really made."
        action={
          <span style={{ display: 'flex', gap: 6 }}>
            <input aria-label="Sandbox name" placeholder="Name (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Button onClick={() => void sim.start(label)}>Open a sandbox</Button>
          </span>
        }
      />
    );
  }

  const r = sim.result;
  return (
    <div style={{ padding: '8px 12px', display: 'grid', gap: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>Sandbox &lsquo;{sim.active.label}&rsquo;</strong>
        <Button size="sm" disabled={sim.loading || sim.changes.length === 0} onClick={() => void sim.run()}>
          Run simulation
        </Button>
        {!sim.inside && (
          <Button size="sm" onClick={() => sim.enter()}>
            Open the sandbox map
          </Button>
        )}
        {sim.loading && <Spinner />}
      </div>
      {sim.error && <div role="alert">{sim.error}</div>}
      <div>
        <strong>Changes</strong>
        {sim.changes.length === 0 ? (
          <p style={{ margin: '2px 0' }}>Right-click an element on the sandbox map and choose a "Simulate…" action.</p>
        ) : (
          <ol aria-label="Changes" style={{ margin: '2px 0 0', paddingLeft: 20 }}>
            {sim.changes.map((c, i) => (
              <li key={i}>{describeChange(c)}</li>
            ))}
          </ol>
        )}
      </div>
      {r && (
        <>
          <p style={{ margin: 0 }}>
            {r.mode === 'replay'
              ? `Replayed ${r.traces_total} recorded requests.`
              : 'No runtime data — showing static impact only. Connect an agent for a realistic simulation.'}
          </p>
          <table aria-label="Real and simulated" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th />
                <th>Real</th>
                <th>Simulated</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Failed requests</td>
                <td>{r.traces_failed_real}</td>
                <td style={{ color: r.traces_failed_sim > r.traces_failed_real ? '#ef4444' : undefined }}>{r.traces_failed_sim}</td>
              </tr>
              <tr>
                <td>Response time (p95)</td>
                <td>{ms(r.latency_p95_real_ms)}</td>
                <td style={{ color: r.latency_p95_sim_ms > r.latency_p95_real_ms ? '#f97316' : undefined }}>{ms(r.latency_p95_sim_ms)}</td>
              </tr>
            </tbody>
          </table>
          {r.node_effects.length > 0 && (
            <table aria-label="Effects per element" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Calls</th>
                  <th>Failures</th>
                  <th>p95</th>
                </tr>
              </thead>
              <tbody>
                {r.node_effects.map((e) => {
                  const worse = e.failures_sim > e.failures_real || e.p95_sim_ms > e.p95_real_ms;
                  return (
                    <tr key={e.node_id} style={{ background: worse ? 'rgba(239,68,68,.12)' : undefined }}>
                      <td>
                        <button type="button" style={{ all: 'unset', cursor: 'pointer', color: 'var(--accent)' }} onClick={() => void revealNode(e.node_id)}>
                          {shortLabel(e.node_id)}
                        </button>
                      </td>
                      <td>{e.calls}</td>
                      <td>
                        {e.failures_real} → {e.failures_sim}
                      </td>
                      <td>
                        {ms(e.p95_real_ms)} → {ms(e.p95_sim_ms)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {r.failed_trace_ids.length > 0 && (
            <div>
              <strong>Requests that would fail</strong>
              <ul aria-label="Failed requests" style={{ margin: '2px 0 0', paddingLeft: 18 }}>
                {r.failed_trace_ids.slice(0, 10).map((t) => (
                  <li key={t}>
                    <code>{t}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <RecommendationCard input={{ change_preview: preview, simulation: r, failure_predictions: failurePredictions, forecasts }} />
        </>
      )}
    </div>
  );
}
