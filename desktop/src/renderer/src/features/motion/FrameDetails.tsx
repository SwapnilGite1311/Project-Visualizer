import { revealNode } from '../../view/reveal';
import type { Frame } from './frames';
import type { Step } from './motion-api';

// "method:app/services.py#UserService.get_user" → "UserService.get_user"
export const shortName = (id: string) => (id.includes('#') ? id.slice(id.indexOf('#') + 1) : id.slice(id.indexOf(':') + 1)) || id;

const cell = { padding: '2px 6px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' as const };

export function FrameDetails({ stack, step }: { stack: Frame[]; step: Step | null }) {
  const top = stack[stack.length - 1];
  const vars = top ? Object.entries(top.locals) : [];
  return (
    <div style={{ display: 'flex', gap: 16, minWidth: 0 }}>
      <div style={{ flex: 2, minWidth: 0 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 12 }}>
          Variables {top ? `in ${shortName(top.nodeId)}` : ''}
        </h4>
        {vars.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No variables yet.</div>
        ) : (
          <table aria-label="Variables" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12, fontFamily: 'var(--font-mono, monospace)', tableLayout: 'fixed' }}>
            <tbody>
              {vars.map(([name, value]) => {
                const changed = top.changed.includes(name);
                return (
                  <tr key={name} data-changed={changed || undefined} style={{ background: changed ? 'rgba(251, 191, 36, 0.18)' : undefined }}>
                    <td style={{ ...cell, width: '30%', fontWeight: 600 }}>{name}</td>
                    <td style={{ ...cell, overflowWrap: 'anywhere' }}>{value}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {step?.kind === 'return' && step.value && <div style={{ marginTop: 4, color: '#10b981', fontSize: 12 }}>returned {step.value}</div>}
        {step?.kind === 'exception' && <div style={{ marginTop: 4, color: 'var(--danger)', fontSize: 12 }}>raised {step.value}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 12 }}>Call stack</h4>
        <ol aria-label="Call stack" style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {[...stack].reverse().map((f, k) => (
            <li key={`${f.nodeId}-${k}`}>
              <button
                type="button"
                onClick={() => f.nodeId && void revealNode(f.nodeId)}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
              >
                {shortName(f.nodeId || '(outside the project)')}
              </button>{' '}
              <span style={{ color: 'var(--text-muted)' }}>line {f.line}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
