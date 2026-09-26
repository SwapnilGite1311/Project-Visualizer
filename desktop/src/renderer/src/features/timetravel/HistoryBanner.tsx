import { Button } from '../../ui/Button';
import { useTimeTravel } from './timetravel-store';

// Shown while the map displays an older commit, so nobody mistakes it for the current code.
export function HistoryBanner() {
  const viewing = useTimeTravel((s) => s.viewing);
  const historical = useTimeTravel((s) => s.historical);
  const commit = useTimeTravel((s) => s.commits.find((c) => c.sha === s.historical?.sha));
  if (viewing !== 'historical' || !historical) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 44,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: 8,
        background: 'var(--warning, #f59e0b)',
        color: '#111',
        boxShadow: '0 2px 8px rgba(0,0,0,.25)',
      }}
    >
      <span>
        Viewing commit <code>{historical.sha.slice(0, 7)}</code>
        {commit ? ` (${commit.date.slice(0, 10)})` : ''} — read-only
      </span>
      <Button size="sm" onClick={() => useTimeTravel.getState().backToCurrent()}>
        Back to current
      </Button>
    </div>
  );
}
