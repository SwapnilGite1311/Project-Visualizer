import { useAppStore } from '../../core/store';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { revealNode } from '../../view/reveal';
import { shortLabel } from '../depnav/labels';
import { useErrorsStore } from '../errors/errors-store';
import { type FixState, useFixesStore } from './fixes-store';
import { useLiveSync } from './livesync-store';

const STATE: Record<FixState, { label: string; tone: 'neutral' | 'info' | 'success' | 'danger' }> =
  {
    open: { label: 'open', tone: 'neutral' },
    fix_pending: { label: 'fix pending', tone: 'info' },
    verified: { label: 'fixed', tone: 'success' },
    regressed: { label: 'regressed', tone: 'danger' },
  };

export function FixesPanel() {
  const pid = useAppStore((s) => s.projectId);
  const items = useFixesStore((s) => s.items);
  const errors = useErrorsStore((s) => s.errors);
  const syncing = useLiveSync((s) => s.enabled && s.watching);

  if (!pid) return <EmptyState title="Open a project to track fixes" />;
  const messageOf = (errorId: string) => {
    const e = errors.find((x) => x.error_id === errorId);
    return e ? `${e.error_type}: ${e.message}` : '';
  };
  return (
    <div
      style={{
        padding: 8,
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        fontSize: 12,
      }}
    >
      <p style={{ margin: '0 0 8px', color: 'var(--text-muted)' }}>
        Save a fix, then run your app again. After 3 successful runs the error is confirmed fixed.
        {!syncing && ' Turn on "Sync with files" in the toolbar so saved files are noticed.'}
      </p>
      {items.length === 0 ? (
        <div style={{ color: 'var(--text-muted)' }}>
          No fixes in progress. Errors appear here when you save the file where they happened.
        </div>
      ) : (
        <table aria-label="Fixes" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              {['Element', 'Error', 'State', 'OK runs'].map((h) => (
                <th key={h} style={{ padding: '2px 6px', borderBottom: '1px solid var(--border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.error_id}>
                <td style={{ padding: '2px 6px' }}>
                  <button
                    type="button"
                    onClick={() => void revealNode(item.node_id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      font: 'inherit',
                      cursor: 'pointer',
                      color: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    {shortLabel(item.node_id)}
                  </button>
                </td>
                <td
                  style={{
                    padding: '2px 6px',
                    maxWidth: 320,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {messageOf(item.error_id) || item.file_path}
                </td>
                <td style={{ padding: '2px 6px' }}>
                  <Badge tone={STATE[item.state].tone}>{STATE[item.state].label}</Badge>
                </td>
                <td style={{ padding: '2px 6px' }}>
                  {item.state === 'fix_pending' ? `${item.ok_calls} / 3` : item.ok_calls}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
