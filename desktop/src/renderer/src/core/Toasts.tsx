import { useToasts } from './notify';

const BORDER = { info: 'var(--accent)', success: 'var(--success)', error: 'var(--danger)' } as const;

export function Toasts() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      style={{ position: 'fixed', right: 16, bottom: 32, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1000 }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          style={{
            minWidth: 260,
            maxWidth: 420,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${BORDER[t.kind]}`,
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            {t.detail && <div style={{ color: 'var(--fg-muted)', marginTop: 2 }}>{t.detail}</div>}
          </div>
          <button
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
