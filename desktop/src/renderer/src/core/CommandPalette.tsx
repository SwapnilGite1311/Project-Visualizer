import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { type CommandDef, appRegistry } from './registry';

export interface CommandPaletteProps { open: boolean; onClose(): void; commands: CommandDef[] }

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const filtered = useMemo(
    () => commands.filter((c) => c.title.toLowerCase().includes(text.trim().toLowerCase())),
    [commands, text],
  );

  useEffect(() => {
    if (open) {
      setText('');
      setIndex(0);
    }
  }, [open]);

  const run = (command: CommandDef | undefined) => {
    if (!command) return;
    onClose();
    void command.run();
  };

  return (
    <Modal open={open} title="Command palette" onClose={onClose}>
      <input
        autoFocus
        aria-label="Search commands"
        value={text}
        placeholder="Type a command…"
        onChange={(e) => {
          setText(e.target.value);
          setIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            run(filtered[index]);
          }
        }}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'var(--bg)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          marginBottom: 8,
        }}
      />
      <ul role="listbox" aria-label="Commands" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {filtered.map((c, i) => (
          <li
            key={c.id}
            role="option"
            aria-selected={i === index}
            onMouseEnter={() => setIndex(i)}
            onClick={() => run(c)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              background: i === index ? 'var(--bg-elevated)' : 'transparent',
            }}
          >
            <span>{c.title}</span>
            {c.shortcut && <span style={{ color: 'var(--fg-muted)' }}>{c.shortcut}</span>}
          </li>
        ))}
        {filtered.length === 0 && <li style={{ color: 'var(--fg-muted)', padding: '6px 8px' }}>No matching commands</li>}
      </ul>
    </Modal>
  );
}

export function CommandPaletteHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return <CommandPalette open={open} onClose={() => setOpen(false)} commands={open ? appRegistry.commands() : []} />;
}
