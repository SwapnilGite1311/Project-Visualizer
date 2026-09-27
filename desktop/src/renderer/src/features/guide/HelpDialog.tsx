import { useState } from 'react';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Modal } from '../../ui/Modal';
import { searchTopics, TOPICS } from './topics';
import { useHelpStore, useTourStore } from './tour-store';

// "How do I…": pick a task, read three steps, or let the app show you where to click.
export function HelpDialog() {
  const { open, topic, close, show } = useHelpStore();
  const [query, setQuery] = useState('');
  const hasProject = useAppStore((s) => s.screen === 'workspace');
  const selected = TOPICS.find((t) => t.id === topic) ?? null;
  const list = searchTopics(query);

  const showMe = () => {
    if (!selected?.showMe) return;
    const { workspace, step } = selected.showMe;
    useAppStore.getState().setWorkspace(workspace);
    close();
    setTimeout(() => useTourStore.getState().start([step]), 150); // after the dashboard's panels are on screen
  };

  return (
    <Modal open={open} title="Help — how do I…" onClose={close}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) minmax(0, 1fr)', gap: 16, minHeight: 280 }} className="pv-help">
        <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
          <input
            aria-label="Search help"
            placeholder="Search help…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--fg)' }}
          />
          <ul aria-label="Help topics" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
            {list.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-current={t.id === topic}
                  onClick={() => show(t.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 6, border: '1px solid transparent', background: t.id === topic ? 'var(--bg-elevated)' : 'transparent', color: t.id === topic ? 'var(--accent)' : 'var(--fg)', cursor: 'pointer', font: 'inherit' }}
                >
                  {t.title}
                </button>
              </li>
            ))}
            {list.length === 0 && <li style={{ color: 'var(--fg-muted)', padding: '5px 8px' }}>No topic matches.</li>}
          </ul>
          <Button size="sm" onClick={() => (close(), useTourStore.getState().start())} disabled={!hasProject}>
            Take the tour
          </Button>
        </div>
        <div aria-live="polite">
          {!selected ? (
            <div style={{ display: 'grid', gap: 8, color: 'var(--fg-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg)' }}>
                <Icon name="help" /> <strong>Pick a task on the left.</strong>
              </span>
              <span>Each one explains, in a few steps, how to do it — and "Show me" points at the right place in the app.</span>
            </div>
          ) : (
            <article aria-label={selected.title} style={{ display: 'grid', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{selected.title}</h3>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6, lineHeight: 1.5 }}>
                {selected.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {selected.showMe && (
                <div>
                  <Button variant="primary" size="sm" onClick={showMe} disabled={!hasProject}>
                    Show me
                  </Button>
                  {!hasProject && <span style={{ marginLeft: 8, color: 'var(--fg-muted)' }}>Open a project (or the sample) first.</span>}
                </div>
              )}
            </article>
          )}
        </div>
      </div>
    </Modal>
  );
}
