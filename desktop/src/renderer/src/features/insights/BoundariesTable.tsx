import type { PackageBoundary } from '../../api/types';
import { revealNode } from '../../view/reveal';

const cell = { padding: '3px 2px', textAlign: 'right' as const, overflowWrap: 'anywhere' as const };

export function BoundariesTable({ boundaries }: { boundaries: PackageBoundary[] }) {
  if (boundaries.length === 0) return <div style={{ color: 'var(--text-muted)' }}>No packages.</div>;
  return (
    <table aria-label="Package boundaries" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          <th style={{ ...cell, textAlign: 'left', width: '30%' }}>Package</th>
          <th style={cell}>Inside links</th>
          <th style={cell}>Outgoing</th>
          <th style={cell}>Incoming</th>
          <th style={cell}>Instability</th>
        </tr>
      </thead>
      <tbody>
        {boundaries.map((b) => (
          <tr key={b.node_id} onClick={() => void revealNode(b.node_id)} style={{ cursor: 'pointer', borderTop: '1px solid var(--border)' }}>
            <td style={{ ...cell, textAlign: 'left' }}>{b.name}</td>
            <td style={cell}>{b.internal_edges}</td>
            <td style={cell}>{b.outgoing_edges}</td>
            <td style={cell}>{b.incoming_edges}</td>
            <td style={cell} title="1.0 = depends on others, nobody depends on it">
              <div
                role="meter"
                aria-label={`${b.name} instability`}
                aria-valuenow={b.instability}
                aria-valuemin={0}
                aria-valuemax={1}
                style={{ height: 4, width: '100%', background: 'var(--border)', borderRadius: 2 }}
              >
                <div style={{ width: `${Math.round(b.instability * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
