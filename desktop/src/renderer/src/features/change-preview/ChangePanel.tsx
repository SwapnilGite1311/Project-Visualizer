import ReactMarkdown from 'react-markdown';
import type { Risk } from '../../api/types';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Spinner } from '../../ui/Spinner';
import { revealNode } from '../../view/reveal';
import { shortLabel } from '../depnav/labels';
import { useChangeStore } from './change-store';

const TONE: Record<Risk['level'], 'success' | 'warning' | 'danger'> = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' };
const KIND_TEXT: Record<string, string> = {
  modify_body: 'change what it does inside',
  change_signature: 'change its inputs or outputs',
  rename: 'rename it',
  move: 'move it',
  delete: 'delete it',
};

export function ChangePanel() {
  const s = useChangeStore();
  if (s.loading) return <Spinner />;
  if (s.error) return <EmptyState title="The preview failed" detail={s.error} />;
  if (!s.preview || !s.node) return <EmptyState title="Right-click an element and choose 'Preview a change…'" />;
  const { preview } = s;
  const b = preview.breakdown;
  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong>
          If you {KIND_TEXT[preview.change.kind] ?? preview.change.kind} ({s.node.name}):
        </strong>
        <Badge tone={TONE[preview.risk.level]}>{preview.risk.level === 'critical' ? 'CRITICAL' : preview.risk.level}</Badge>
        <span>Risk {preview.risk.score}/100</span>
        <span style={{ flex: 1 }} />
        <Button size="sm" onClick={() => void s.summarize()} disabled={s.summarizing}>
          Explain the risk
        </Button>
        <Button size="sm" onClick={s.clear}>
          Clear
        </Button>
      </div>
      <div aria-label="Risk breakdown" style={{ color: 'var(--fg-muted)' }}>
        Static {b.static_score} × {b.type_multiplier} (change type) + {b.runtime_bonus} (runtime) = {preview.risk.score}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {preview.risk.factors.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {preview.affected.length === 0 ? (
        <div>Nothing else depends on this element.</div>
      ) : (
        <div>
          <strong>Affected ({preview.affected.length})</strong>
          <ul aria-label="Affected" style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>
            {preview.affected.map((a) => (
              <li key={a.node_id}>
                <button
                  type="button"
                  title={a.node_id}
                  onClick={() => void revealNode(a.node_id)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '1px 0' }}
                >
                  {shortLabel(a.node_id)}
                </button>{' '}
                <span style={{ color: 'var(--fg-muted)' }}>
                  distance {a.distance} · via {a.via}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.summarizing && <Spinner />}
      {s.summaryError && <div role="note">{s.summaryError}</div>}
      {s.summary && (
        <div aria-label="Risk summary">
          <ReactMarkdown>{s.summary}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
