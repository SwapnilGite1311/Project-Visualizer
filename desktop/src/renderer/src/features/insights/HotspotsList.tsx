import { getNode } from '../../api/engine';
import type { Hotspot } from '../../api/types';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { revealNode } from '../../view/reveal';
import { useImpactStore } from '../impact/impact-store';

async function whatBreaks(nodeId: string) {
  const pid = useAppStore.getState().projectId;
  if (!pid) return;
  try {
    await useImpactStore.getState().run(await getNode(pid, nodeId));
  } catch (e) {
    notify.error('Impact analysis failed', e instanceof Error ? e.message : String(e));
  }
}

export function HotspotsList({ hotspots }: { hotspots: Hotspot[] }) {
  if (hotspots.length === 0) return <div style={{ color: 'var(--text-muted)' }}>No hotspots found.</div>;
  return (
    <ul aria-label="Hotspots" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {hotspots.map((h) => (
        <li
          key={h.node_id}
          onClick={() => void revealNode(h.node_id)}
          style={{ padding: '6px 4px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</strong>
            <Badge>{h.kind}</Badge>
            <span onClick={(e) => e.stopPropagation()}>
              <Button size="sm" onClick={() => void whatBreaks(h.node_id)}>
                What breaks?
              </Button>
            </span>
          </div>
          <div
            role="meter"
            aria-label={`${h.name} score`}
            aria-valuenow={h.score}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ height: 4, background: 'var(--border)', borderRadius: 2, margin: '4px 0' }}
          >
            <div style={{ width: `${Math.min(100, Math.max(0, h.score))}%`, height: '100%', background: 'var(--danger)', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {h.reasons.map((r) => (
              <span key={r} style={{ fontSize: 11, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 6px' }}>
                {r}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
