import { useState } from 'react';
import { appRegistry, type RegistryReader } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { Modal } from '../../ui/Modal';

export function SettingsModal({ registry = appRegistry }: { registry?: RegistryReader }) {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const sections = registry.settingsSections();
  const [selected, setSelected] = useState<string | null>(null);
  const active = sections.find((s) => s.id === selected) ?? sections[0];
  const Section = active?.component;

  return (
    <Modal open={open} title="Settings" onClose={() => setOpen(false)}>
      <div style={{ display: 'flex', gap: 16, minHeight: 320 }}>
        <nav aria-label="Settings sections" style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120 }}>
          {sections.map((s) => (
            <button
              key={s.id}
              aria-current={s.id === active?.id ? 'page' : undefined}
              onClick={() => setSelected(s.id)}
              style={{
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                background: s.id === active?.id ? 'var(--bg-elevated)' : 'transparent',
                color: 'var(--fg)',
              }}
            >
              {s.title}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1, minWidth: 0 }}>{Section && <Section />}</div>
      </div>
    </Modal>
  );
}
