import { useEffect } from 'react';
import { useAppStore } from '../../core/store';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { revealNode } from '../../view/reveal';
import type { ErrorEntry } from './errors-api';
import { useErrorsStore } from './errors-store';
import { explainBasic } from './explain-basic';

const clock = (ms: number) => new Date(ms).toLocaleTimeString();

function ErrorDetail({ error }: { error: ErrorEntry }) {
  const basic = explainBasic(error.language, error.error_type);
  return (
    <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
      <section aria-label="What it means">
        <strong style={{ fontSize: 13 }}>{basic.title}</strong>
        <p style={{ margin: '4px 0' }}>{basic.plain}</p>
        {basic.causes.length > 0 && (
          <>
            <div style={{ color: 'var(--text-muted)' }}>Common causes</div>
            <ul style={{ margin: '2px 0', paddingLeft: 18 }}>
              {basic.causes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        )}
      </section>
      <div
        style={{
          fontFamily: 'var(--font-mono, ui-monospace, Consolas, monospace)',
          wordBreak: 'break-word',
        }}
      >
        {error.error_type}: {error.message}
      </div>
      <ol
        aria-label="Frames"
        style={{
          margin: 0,
          paddingLeft: 18,
          fontFamily: 'var(--font-mono, ui-monospace, Consolas, monospace)',
        }}
      >
        {error.frames.map((f, i) => {
          const label = `${f.function || '?'} — ${f.file_path}:${f.line}`;
          return (
            <li key={i} style={{ color: f.is_origin ? 'var(--danger)' : undefined }}>
              {f.in_project && f.node_id ? (
                <button
                  type="button"
                  onClick={() => void revealNode(f.node_id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    font: 'inherit',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  {label}
                </button>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
      <div>
        <Button size="sm" onClick={() => void useErrorsStore.getState().clear(error.error_id)}>
          Clear
        </Button>
      </div>
    </div>
  );
}

export function ErrorsPanel() {
  const pid = useAppStore((s) => s.projectId);
  const { errors, selected } = useErrorsStore();

  useEffect(() => {
    if (pid)
      void useErrorsStore
        .getState()
        .refresh()
        .catch(() => undefined);
  }, [pid]);

  if (!pid) return <EmptyState title="Open a project to see its errors" />;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 1fr) 2fr',
        gap: 8,
        height: '100%',
        minHeight: 0,
        padding: 8,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <Button size="sm" onClick={() => useErrorsStore.getState().setDialogOpen(true)}>
            Paste an error…
          </Button>
          {errors.length > 0 && (
            <Button size="sm" onClick={() => void useErrorsStore.getState().clear()}>
              Clear all
            </Button>
          )}
        </div>
        {errors.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            No errors yet. Paste one, or connect a running program.
          </div>
        )}
        <ul aria-label="Errors" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {[...errors]
            .sort((a, b) => b.last_seen_ms - a.last_seen_ms)
            .map((e) => (
              <li key={e.error_id}>
                <button
                  type="button"
                  aria-pressed={selected?.error_id === e.error_id}
                  onClick={() => void useErrorsStore.getState().select(e)}
                  style={{
                    width: '100%',
                    border: 'none',
                    font: 'inherit',
                    fontSize: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: '3px 4px',
                    display: 'grid',
                    gap: 2,
                    color: 'inherit',
                    background:
                      selected?.error_id === e.error_id
                        ? 'var(--accent-soft, rgba(59,130,246,0.15))'
                        : 'transparent',
                  }}
                >
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Badge tone={e.source === 'runtime' ? 'danger' : 'info'}>{e.source}</Badge>
                    <strong>{e.error_type}</strong>
                    <span style={{ flex: 1 }} />
                    <span>×{e.count}</span>
                  </span>
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {e.message}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    last seen {clock(e.last_seen_ms)}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </div>
      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        {selected ? (
          <ErrorDetail error={selected} />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Pick an error to see what it means and where it happened.
          </div>
        )}
      </div>
    </div>
  );
}
