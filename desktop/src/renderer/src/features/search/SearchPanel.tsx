import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { NodeKind } from '../../api/types';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { revealNode } from '../../view/reveal';
import { searchBus } from './search-bus';
import { useSearchStore } from './search-store';

const KINDS: NodeKind[] = ['package', 'module', 'class', 'function', 'method'];

const chip = (active: boolean) => ({
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '2px 8px',
  fontSize: 12,
  cursor: 'pointer',
  background: active ? 'var(--accent)' : 'transparent',
  color: active ? 'var(--accent-contrast, #fff)' : 'inherit',
});

export function SearchPanel() {
  const { text, kinds, results, suggestions, loading, error, setText, toggleKind } = useSearchStore();
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchBus.focus = () => input.current?.focus();
    return () => {
      searchBus.focus = () => {};
    };
  }, []);
  useEffect(() => setActive(0), [results]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      void revealNode(results[active].node_id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, height: '100%' }}>
      <input
        ref={input}
        aria-label="Search"
        value={text}
        placeholder="Search classes, functions, files…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        style={{ padding: 6, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'inherit' }}
      />
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {suggestions.map((s) => (
            <button key={s} type="button" style={chip(false)} onClick={() => setText(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kinds.includes(k)} style={chip(kinds.includes(k))} onClick={() => toggleKind(k)}>
            {k}
          </button>
        ))}
      </div>
      {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
      {!text.trim() ? (
        <EmptyState title="Type to search" />
      ) : results.length === 0 && !loading ? (
        <EmptyState title="No matches" />
      ) : (
        <ul role="listbox" aria-label="Search results" style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto' }}>
          {results.map((r, i) => (
            <li
              key={r.node_id}
              role="option"
              aria-selected={i === active}
              onClick={() => void revealNode(r.node_id)}
              onMouseEnter={() => setActive(i)}
              style={{ padding: '4px 6px', cursor: 'pointer', borderRadius: 4, background: i === active ? 'var(--bg-hover, rgba(127,127,127,0.15))' : undefined }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <strong>{r.name}</strong>
                <Badge>{r.kind}</Badge>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.file_path}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
