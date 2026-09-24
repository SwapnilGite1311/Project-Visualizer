import { useAppStore } from '../../core/store';

const MODES = [
  { mode: '2d', label: '2D' },
  { mode: '3d', label: '3D' },
] as const;

export function ViewModeToggle() {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  return (
    <div role="group" aria-label="View mode" style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      {MODES.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={viewMode === mode}
          onClick={() => setViewMode(mode)}
          style={{
            border: 'none',
            padding: '2px 10px',
            cursor: 'pointer',
            font: 'inherit',
            background: viewMode === mode ? 'var(--accent)' : 'transparent',
            color: viewMode === mode ? 'var(--accent-contrast, #fff)' : 'inherit',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
