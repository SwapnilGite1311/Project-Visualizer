import { useEffect } from 'react';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Panel } from '../../ui/Panel';
import { Spinner } from '../../ui/Spinner';
import { shortLabel } from '../depnav/labels';
import { type Commit, useTimeTravel } from './timetravel-store';

const day = (iso: string) => iso.slice(0, 10);

// The History panel: pick a past commit, see what changed since then on the current map, or show that version.
export function TimeTravelPanel() {
  const projectId = useAppStore((s) => s.projectId);
  const tt = useTimeTravel();

  // A different project was opened (not our historical view): start over for it.
  useEffect(() => {
    const { current, viewing } = useTimeTravel.getState();
    if (viewing === 'historical') return;
    if (current && current.project_id !== projectId) void useTimeTravel.getState().reset().then(() => useTimeTravel.getState().loadCommits());
    else if (!current && projectId) void useTimeTravel.getState().loadCommits();
  }, [projectId]);

  if (!projectId) return <EmptyState title="Open a project to see its history" />;
  if (tt.isRepo === false) return <EmptyState title="Not a Git repository" detail="History works for folders that are Git repositories." />;
  if (tt.isRepo === null && tt.loading) return <Spinner />;

  // The slider runs from the oldest commit (left) to the newest (right).
  const oldestFirst: Commit[] = [...tt.commits].reverse();
  const selectedIndex = oldestFirst.findIndex((c) => c.sha === tt.selected);
  const diff = tt.diff;

  return (
    <Panel
      title="History"
      actions={
        <span style={{ display: 'flex', gap: 6 }}>
          {tt.historical && tt.viewing === 'current' && (
            <Button size="sm" onClick={() => tt.showHistorical()}>
              Show this version
            </Button>
          )}
          {tt.viewing === 'historical' && (
            <Button size="sm" onClick={() => tt.backToCurrent()}>
              Back to current
            </Button>
          )}
          {tt.selected && (
            <Button size="sm" variant="ghost" onClick={() => void tt.clear()}>
              Clear
            </Button>
          )}
        </span>
      }
    >
      {oldestFirst.length > 1 && (
        <input
          type="range"
          aria-label="Commit timeline"
          min={0}
          max={oldestFirst.length - 1}
          value={selectedIndex < 0 ? oldestFirst.length - 1 : selectedIndex}
          onChange={(e) => void tt.select(oldestFirst[Number(e.target.value)].sha)}
          style={{ width: '100%' }}
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(220px, 1fr)', gap: 12 }}>
        <ul aria-label="Commits" style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 260, overflow: 'auto' }}>
          {tt.commits.map((c) => (
            <li key={c.sha}>
              <button
                type="button"
                onClick={() => void tt.select(c.sha)}
                aria-pressed={c.sha === tt.selected}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', padding: '3px 6px', fontWeight: c.sha === tt.selected ? 600 : 400 }}
              >
                <code>{c.sha.slice(0, 7)}</code> {day(c.date)} · {c.author} — {c.subject}
              </button>
            </li>
          ))}
        </ul>
        <div aria-live="polite">
          {tt.loading && tt.selected && <Spinner />}
          {tt.error && <p role="alert">{tt.error}</p>}
          {!tt.selected && !tt.loading && <p>Pick a commit to see what changed since then.</p>}
          {diff && (
            <>
              <p>
                Since <code>{tt.selected?.slice(0, 7)}</code>: <strong>{diff.added.length}</strong> new, <strong>{diff.changed.length}</strong>{' '}
                changed, <strong>{diff.removed.length}</strong> removed; links +{diff.edges_added} / −{diff.edges_removed}.
              </p>
              {diff.packages.some((p) => p.added + p.removed + p.changed > 0) && (
                <table aria-label="Changes per package">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>New</th>
                      <th>Changed</th>
                      <th>Removed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.packages
                      .filter((p) => p.added + p.removed + p.changed > 0)
                      .map((p) => (
                        <tr key={p.node_id}>
                          <td>{shortLabel(p.node_id)}</td>
                          <td>{p.added}</td>
                          <td>{p.changed}</td>
                          <td>{p.removed}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
              {diff.removed.length > 0 && (
                <>
                  <h4 style={{ margin: '8px 0 4px' }}>Removed since then</h4>
                  <ul aria-label="Removed since then" style={{ margin: 0 }}>
                    {diff.removed.slice(0, 50).map((id) => (
                      <li key={id}>{shortLabel(id)}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
