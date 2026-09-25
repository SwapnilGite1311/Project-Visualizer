import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Select } from '../../ui/Select';
import { revealNode } from '../../view/reveal';
import { CyclesSection } from './CyclesSection';
import type { Direction, NeighborItem } from './deps-api';
import { useDepnavStore } from './depnav-store';
import { kindOf, shortLabel } from './labels';
import { usePathDialog } from './path-dialog-store';

const DIRECTIONS: Array<{ value: Direction; label: string }> = [
  { value: 'out', label: 'Uses' },
  { value: 'in', label: 'Used by' },
  { value: 'both', label: 'Both' },
];
const DEPTHS = [1, 2, 3, 4, 5].map((d) => ({ value: String(d), label: String(d) }));

const groupTitle = (distance: number) => (distance === 1 ? 'Direct' : `${distance} steps away`);

function groups(items: NeighborItem[]): Array<[number, NeighborItem[]]> {
  const map = new Map<number, NeighborItem[]>();
  for (const i of items) map.set(i.distance, [...(map.get(i.distance) ?? []), i]);
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

export function DependenciesPanel() {
  const { root, direction, depth, result, showOnMap, loading, error } = useDepnavStore();
  const s = useDepnavStore.getState();

  return (
    <div style={{ padding: 8, height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      {!root ? (
        <EmptyState title="Right-click an element and choose Show dependencies" />
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
            <strong style={{ alignSelf: 'center' }}>{root.name}</strong>
            <div role="group" aria-label="Direction" style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              {DIRECTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={direction === d.value}
                  onClick={() => void s.setDirection(d.value)}
                  style={{
                    border: 'none',
                    padding: '2px 10px',
                    cursor: 'pointer',
                    font: 'inherit',
                    background: direction === d.value ? 'var(--accent)' : 'transparent',
                    color: direction === d.value ? '#fff' : 'inherit',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <Select label="Depth" value={String(depth)} options={DEPTHS} onChange={(v) => void s.setDepth(Number(v))} />
            <label style={{ fontSize: 12, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <input type="checkbox" checked={showOnMap} onChange={() => s.toggleShowOnMap()} />
              Show on map
            </label>
            <Button size="sm" onClick={() => usePathDialog.getState().setOpen(true)}>
              Find path to…
            </Button>
            <Button size="sm" onClick={() => s.clear()}>
              Clear
            </Button>
          </div>
          {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
          {loading && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>}
          {result && result.items.length === 0 && !loading && <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>No dependencies found.</div>}
          {result &&
            groups(result.items).map(([distance, items]) => (
              <section key={distance} style={{ marginTop: 8 }}>
                <h4 style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-muted)' }}>{groupTitle(distance)}</h4>
                <ul aria-label={groupTitle(distance)} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {items.map((i) => (
                    <li key={`${i.direction}-${i.node_id}`} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '2px 0' }}>
                      <span title={i.direction === 'out' ? 'uses' : 'used by'} style={{ width: 14 }}>
                        {i.direction === 'out' ? '→' : '←'}
                      </span>
                      <button
                        type="button"
                        onClick={() => void revealNode(i.node_id)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}
                      >
                        {shortLabel(i.node_id)}
                      </button>
                      <Badge>{kindOf(i.node_id)}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </>
      )}
      <CyclesSection />
    </div>
  );
}
