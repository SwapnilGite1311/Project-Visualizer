import { useAppStore } from '../../core/store';
import { useLiveStore } from './live-store';

export function toggleLive(): void {
  const { enabled, setEnabled } = useLiveStore.getState();
  setEnabled(!enabled);
  if (!enabled) useAppStore.getState().showPanel('bottom', 'runtime');
}

export function LiveToggle() {
  const enabled = useLiveStore((s) => s.enabled);
  const projectId = useAppStore((s) => s.projectId);
  return (
    <button
      type="button"
      aria-pressed={enabled}
      disabled={!projectId}
      onClick={toggleLive}
      title="Show what the running program does (Ctrl+Shift+L)"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '2px 10px',
        cursor: projectId ? 'pointer' : 'default',
        font: 'inherit',
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        background: enabled ? 'var(--accent)' : 'transparent',
        color: enabled ? 'var(--accent-contrast, #fff)' : 'inherit',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: enabled ? '#22c55e' : 'var(--text-muted)',
        }}
      />
      Live
    </button>
  );
}
