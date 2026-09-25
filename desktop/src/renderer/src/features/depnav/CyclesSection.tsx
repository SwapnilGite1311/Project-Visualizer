import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { useDepnavStore } from './depnav-store';
import { shortLabel } from './labels';

const LEVELS = [
  { value: '1', label: 'Packages' },
  { value: '2', label: 'Modules' },
  { value: '3', label: 'Classes' },
  { value: '4', label: 'Functions' },
];

export function CyclesSection() {
  const { cycles, cycleLevel, loadCycles, highlightCycle } = useDepnavStore();
  return (
    <section aria-label="Circular dependencies" style={{ marginTop: 12 }}>
      <h4 style={{ margin: '0 0 6px', fontSize: 12 }}>Circular dependencies</h4>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <Select label="Level" value={String(cycleLevel)} options={LEVELS} onChange={(v) => useDepnavStore.setState({ cycleLevel: Number(v) })} />
        <Button size="sm" onClick={() => void loadCycles(cycleLevel)}>
          Find cycles
        </Button>
      </div>
      {cycles && cycles.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No circular dependencies at this level</div>}
      {cycles && cycles.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, fontSize: 12 }}>
          {cycles.map((c) => {
            const labels = c.node_ids.map(shortLabel);
            return (
              <li key={c.node_ids.join('|')}>
                <button
                  type="button"
                  onClick={() => void highlightCycle(c)}
                  style={{ background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', color: 'var(--danger)', font: 'inherit', textAlign: 'left' }}
                >
                  {[...labels, labels[0]].join(' → ')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
