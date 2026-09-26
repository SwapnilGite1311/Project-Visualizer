import { useEffect } from 'react';
import { useAppStore } from '../../core/store';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { ProgressBar } from '../../ui/ProgressBar';
import { Spinner } from '../../ui/Spinner';
import { TextInput } from '../../ui/TextInput';
import { revealNode } from '../../view/reveal';
import { shortLabel } from '../depnav/labels';
import { colorFor, type PredictionMethod, type TrainJob, usePredictionStore } from './prediction-store';

const METHOD_TEXT: Record<PredictionMethod, string> = {
  model: 'Trained model',
  heuristic: 'Cloud estimate (no model yet)',
  local: 'Local estimate',
};

const JOB_TEXT: Record<TrainJob['status'], string> = {
  queued: 'Training is queued…',
  running: 'Training…',
  done: 'Model trained',
  failed: 'Training failed',
};

const linkStyle = { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, textAlign: 'left' as const };
const ms = (v: number) => `${Math.round(v)} ms`;

function JobStatus({ job }: { job: TrainJob }) {
  const auc = job.result?.metrics?.auc;
  return (
    <div role="status" style={{ color: job.status === 'failed' ? 'var(--danger)' : 'var(--fg-muted)' }}>
      {JOB_TEXT[job.status]}
      {job.status === 'done' && job.result?.samples !== undefined && ` on ${job.result.samples} samples`}
      {job.status === 'done' && auc !== undefined && ` (AUC ${auc.toFixed(2)})`}
      {job.status === 'failed' && job.error && `: ${job.error}`}
    </div>
  );
}

// Which parts are likely to fail or slow down soon. Works offline (local estimate); a trained cloud model is used when
// the user is signed in and has picked the cloud project for this folder.
export function PredictionPanel() {
  const s = usePredictionStore();
  const projectId = useAppStore((a) => a.projectId);
  const root = useAppStore((a) => a.projectRoot);
  useEffect(() => {
    void usePredictionStore.getState().loadCloud();
  }, [root]);

  if (!projectId) return <EmptyState title="Open a project to predict failures" />;
  const training = s.job?.status === 'queued' || s.job?.status === 'running';
  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {s.method && <Badge tone={s.method === 'model' ? 'info' : 'neutral'}>{METHOD_TEXT[s.method]}</Badge>}
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="primary" onClick={() => void s.predict()} disabled={s.loading}>
          Predict now
        </Button>
        {s.method && (
          <Button size="sm" onClick={s.clear}>
            Clear
          </Button>
        )}
      </div>

      {s.cloudAvailable ? (
        <div>
          <TextInput label="Cloud project for this folder" value={s.cloudProject} placeholder="Cloud project id" onChange={(v) => void s.setCloudProject(v.trim())} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" onClick={() => void s.train()} disabled={!s.cloudProject || training}>
              Train model
            </Button>
            {s.job && <JobStatus job={s.job} />}
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--fg-muted)' }}>Offline: estimates run on this computer. Sign in to the cloud to train a model on your history.</div>
      )}

      {s.note && <div role="note">{s.note}</div>}
      {s.error && <div role="alert" style={{ color: 'var(--danger)' }}>{s.error}</div>}
      {s.loading && <Spinner />}

      {!s.loading && s.method && s.predictions.length === 0 && <EmptyState title="Nothing to predict yet" detail="Run your app with an agent to collect history." />}
      {!s.loading && !s.method && <EmptyState title="Press 'Predict now' to see which parts are likely to fail" />}

      {s.predictions.length > 0 && (
        <section aria-label="Likely failures">
          <strong>Likely failures</strong>
          <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {s.predictions.slice(0, 20).map((p) => (
              <li key={p.node_id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" title={p.node_id} onClick={() => void revealNode(p.node_id)} style={{ ...linkStyle, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shortLabel(p.node_id)}
                  </button>
                  <span style={{ color: colorFor(p.probability) ?? 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(p.probability * 100)}%</span>
                </div>
                <ProgressBar value={p.probability} max={1} label={`Failure probability of ${shortLabel(p.node_id)}`} />
                {p.top_factors.length > 0 && <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{p.top_factors.join(' · ')}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.bottlenecks.length > 0 && (
        <section aria-label="Likely bottlenecks">
          <strong>Likely bottlenecks</strong>
          <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>
            {s.bottlenecks.map((b) => (
              <li key={b.node_id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" title={b.node_id} onClick={() => void revealNode(b.node_id)} style={linkStyle}>
                  {shortLabel(b.node_id)}
                </button>
                <span>
                  P95 {ms(b.current_p95_ms)} → {ms(b.predicted_p95_ms)}
                </span>
                <span style={{ color: 'var(--fg-muted)' }}>
                  {b.trend_ms_per_hour >= 0 ? '+' : ''}
                  {b.trend_ms_per_hour.toFixed(1)} ms/h
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
