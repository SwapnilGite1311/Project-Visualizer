import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { shortLabel } from '../depnav/labels';
import { ancestorsById } from './ancestors';
import { boundaries, type Crossing } from './runtime-api';
import { buildCrossingOverlay } from './trace-overlay';

export const CROSSINGS_WINDOW_MS = 300_000;
export const CROSSINGS_POLL_MS = 3000;

const keyOf = (c: Crossing) => c.from_id + '→' + c.to_id;

export function CrossingsTable() {
  const pid = useAppStore((s) => s.projectId);
  const [rows, setRows] = useState<Crossing[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!pid) return;
    try {
      setRows(await boundaries(pid, CROSSINGS_WINDOW_MS));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [pid]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), CROSSINGS_POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const pick = async (c: Crossing) => {
    if (!pid) return;
    if (selected === keyOf(c)) {
      setSelected(null);
      useAppStore.getState().setOverlay('crossing', null);
      return;
    }
    setSelected(keyOf(c));
    useAppStore
      .getState()
      .setOverlay(
        'crossing',
        buildCrossingOverlay(c, await ancestorsById(pid, [c.from_id, c.to_id])),
      );
  };

  if (!pid) return <EmptyState title="Open a project to see module crossings" />;

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Calls between modules in the last 5 minutes. Click a row to show it on the map.
        </span>
        <Button size="sm" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
      <table
        aria-label="Module crossings"
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
      >
        <thead>
          <tr style={{ textAlign: 'left' }}>
            {['From', 'To', 'Calls', 'Avg ms', 'Errors', 'Stalls', 'Loops'].map((h) => (
              <th key={h} style={{ padding: '2px 6px', borderBottom: '1px solid var(--border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 6, color: 'var(--text-muted)' }}>
                No calls between modules yet.
              </td>
            </tr>
          )}
          {rows.map((c) => {
            const warn = c.stalls > 0 || c.loops > 0;
            return (
              <tr
                key={keyOf(c)}
                aria-selected={selected === keyOf(c)}
                data-warning={warn || undefined}
                onClick={() => void pick(c)}
                style={{
                  cursor: 'pointer',
                  background:
                    selected === keyOf(c) ? 'var(--accent-soft, rgba(59,130,246,0.15))' : undefined,
                  color: warn ? 'var(--warning)' : undefined,
                }}
              >
                <td style={{ padding: '2px 6px' }}>{shortLabel(c.from_id)}</td>
                <td style={{ padding: '2px 6px' }}>{shortLabel(c.to_id)}</td>
                <td style={{ padding: '2px 6px' }}>{c.count}</td>
                <td style={{ padding: '2px 6px' }}>{c.avg_ms.toFixed(1)}</td>
                <td
                  style={{ padding: '2px 6px', color: c.errors > 0 ? 'var(--danger)' : undefined }}
                >
                  {c.errors}
                </td>
                <td style={{ padding: '2px 6px' }}>{c.stalls}</td>
                <td style={{ padding: '2px 6px' }}>{c.loops}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
