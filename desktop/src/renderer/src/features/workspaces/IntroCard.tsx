import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { appRegistry, type RegistryReader } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { DASHBOARDS } from './definitions';
import { useIntroStore } from './intro-store';

// "What is this dashboard?" — a card over the top of the map with two plain sentences and a few things to try.
export function IntroCard({ registry = appRegistry }: { registry?: Pick<RegistryReader, 'commands'> }) {
  const screen = useAppStore((s) => s.screen);
  const workspace = useAppStore((s) => s.workspace);
  const seen = useIntroStore((s) => s.seen);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (screen !== 'workspace') return setHost(null);
    const find = () => setHost(document.querySelector<HTMLElement>('[data-area="center"]'));
    find();
    const t = setTimeout(find, 0); // the layout mounts in the same pass
    return () => clearTimeout(t);
  }, [screen, workspace]);

  const dashboard = DASHBOARDS.find((d) => d.id === workspace);
  if (!host || !dashboard?.intro) return null;
  const intro = dashboard.intro;
  const commands = registry.commands();
  const actions = intro.actions.map((a) => ({ ...a, run: commands.find((c) => c.id === a.command)?.run })).filter((a) => a.run);

  if (seen.includes(dashboard.id)) {
    return createPortal(
      <button type="button" className="pv-intro-reopen" onClick={() => useIntroStore.getState().reopen(dashboard.id)} title={`About the ${dashboard.title} dashboard`}
        style={{ position: 'absolute', top: 44, left: 8, zIndex: 6, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--fg-muted)', font: '12px system-ui, sans-serif', cursor: 'pointer' }}
      >
        <Icon name="help" size={14} /> About this dashboard
      </button>,
      host,
    );
  }

  return createPortal(
    <section
      className="pv-intro-card"
      aria-label={intro.title}
      style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', zIndex: 6, width: 'min(560px, calc(100% - 24px))', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-panel)', boxShadow: '0 6px 24px rgba(0,0,0,0.18)', display: 'grid', gap: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
          <Icon name={dashboard.icon} size={20} />
        </span>
        <strong style={{ flex: 1 }}>{intro.title}</strong>
        <button type="button" aria-label="Close" onClick={() => useIntroStore.getState().dismiss(dashboard.id)} style={{ border: 'none', background: 'none', color: 'var(--fg-muted)', cursor: 'pointer', display: 'inline-flex' }}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <p style={{ margin: 0, lineHeight: 1.5 }}>{intro.text}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {actions.map((a) => (
          <Button key={a.command} size="sm" variant="primary" onClick={() => void a.run!()}>
            {a.label}
          </Button>
        ))}
        <span style={{ flex: 1 }} />
        <Button size="sm" onClick={() => useIntroStore.getState().dismiss(dashboard.id)}>
          Got it
        </Button>
      </div>
    </section>,
    host,
  );
}
