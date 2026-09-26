import { useAppStore } from '../../core/store';
import { useLiveSync } from './livesync-store';

export const toggleLiveSync = () =>
  useLiveSync.getState().setLiveSync(!useLiveSync.getState().enabled);

export function LiveSyncToggle() {
  const enabled = useLiveSync((s) => s.enabled);
  const watching = useLiveSync((s) => s.watching);
  const projectId = useAppStore((s) => s.projectId);
  return (
    <label
      title="Update the map when files are saved"
      style={{
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        fontSize: 12,
        cursor: projectId ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      <input
        type="checkbox"
        role="switch"
        checked={enabled}
        disabled={!projectId}
        onChange={() => void toggleLiveSync()}
      />
      Sync with files
      {enabled && projectId && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: watching ? '#22c55e' : 'var(--text-muted)',
          }}
        />
      )}
    </label>
  );
}
