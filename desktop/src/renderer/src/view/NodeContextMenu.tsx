import { useEffect, useRef } from 'react';
import { appRegistry, type NodeRef, type RegistryReader } from '../core/registry';

export interface NodeContextMenuProps { node: NodeRef; x: number; y: number; onClose(): void; registry?: RegistryReader }

export function NodeContextMenu({ node, x, y, onClose, registry = appRegistry }: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const actions = registry.nodeActions(node);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${node.name}`}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 800,
        minWidth: 180,
        padding: 4,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      }}
    >
      {actions.length === 0 && (
        <button role="menuitem" disabled style={itemStyle}>
          No actions
        </button>
      )}
      {actions.map((a) => (
        <button
          key={a.id}
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            void a.run(node);
            onClose();
          }}
        >
          {a.title}
        </button>
      ))}
    </div>
  );
}

const itemStyle = {
  display: 'block',
  width: '100%',
  textAlign: 'left' as const,
  padding: '6px 10px',
  background: 'transparent',
  border: 'none',
  color: 'var(--fg)',
  cursor: 'pointer',
  borderRadius: 'var(--radius)',
};
