import type { AffectedNode, Risk } from '../../api/types';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Spinner } from '../../ui/Spinner';
import { revealNode } from '../../view/reveal';
import { shortLabel } from '../inspector/EdgeList';
import { useImpactStore } from './impact-store';

const TONE: Record<Risk['level'], 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

function kindOf(id: string): string {
  return id.slice(0, id.indexOf(':'));
}

function AffectedList({ title, items }: { title: string; items: AffectedNode[] }) {
  return (
    <div style={{ minWidth: 220 }}>
      <strong>
        {title} ({items.length})
      </strong>
      <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>
        {items.map((a) => (
          <li key={a.node_id}>
            <button
              title={a.node_id}
              onClick={() => void revealNode(a.node_id)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '1px 0', textAlign: 'left' }}
            >
              {shortLabel(a.node_id)}
            </button>{' '}
            <span style={{ color: 'var(--fg-muted)' }}>
              {kindOf(a.node_id)} · via {a.via}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ImpactPanel() {
  const { rootNode, result, loading, clear } = useImpactStore();
  if (loading) return <Spinner />;
  if (!result || !rootNode) {
    return <EmptyState title="Right-click an element and choose 'What breaks if I change this?'" />;
  }
  const direct = result.affected.filter((a) => a.distance === 1);
  const indirect = result.affected.filter((a) => a.distance >= 2);
  const level = result.risk.level;
  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong>If you change {rootNode.name}:</strong>
        <Badge tone={TONE[level]}>{level === 'critical' ? 'CRITICAL' : level}</Badge>
        <span>Risk {result.risk.score}/100</span>
        <span style={{ flex: 1 }} />
        <Button size="sm" onClick={clear}>
          Clear
        </Button>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--fg-muted)' }}>
        {result.risk.factors.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {result.affected.length === 0 ? (
        <div>Nothing else depends on this element.</div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <AffectedList title="Directly affected" items={direct} />
          <AffectedList title="Indirectly affected" items={indirect} />
        </div>
      )}
      <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>Based on static analysis. Dynamic calls may be missed.</div>
    </div>
  );
}
