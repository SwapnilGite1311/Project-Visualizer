import type { EntryPoint } from '../../api/types';
import { revealNode } from '../../view/reveal';

// "module:app/main.py" → "app/main.py"; "function:app/main.py::run" → "app/main.py::run".
const label = (id: string) => id.slice(id.indexOf(':') + 1);

export function EntryPointsList({ entryPoints }: { entryPoints: EntryPoint[] }) {
  if (entryPoints.length === 0) return <div style={{ color: 'var(--text-muted)' }}>No entry points found.</div>;
  return (
    <ul aria-label="Entry points" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {entryPoints.map((e) => (
        <li key={e.node_id} onClick={() => void revealNode(e.node_id)} style={{ padding: '4px', cursor: 'pointer' }}>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>{label(e.node_id)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.reasons.join(' · ')}</div>
        </li>
      ))}
    </ul>
  );
}
