import { createElement, useEffect, useState } from 'react';
import { onMainEvent } from './bridge';
import { appInfo } from './main';

export function useEngineStatus(): string {
  const [status, setStatus] = useState('starting');
  useEffect(() => {
    let active = true;
    appInfo()
      .then((info) => {
        if (active) setStatus(info.engineStatus);
      })
      .catch(() => undefined);
    const off = onMainEvent('pv:engine.status', (payload) => setStatus((payload as { status: string }).status));
    return () => {
      active = false;
      off();
    };
  }, []);
  return status;
}

const COLORS: Record<string, string> = {
  ready: 'var(--success)',
  starting: 'var(--warning)',
  restarting: 'var(--warning)',
  crashed: 'var(--danger)',
  stopped: 'var(--fg-muted)',
};

export function EngineStatusItem() {
  const status = useEngineStatus();
  const label = `Engine ${status}`;
  return createElement(
    'span',
    { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, title: label },
    createElement('span', {
      'aria-hidden': true,
      style: { width: 8, height: 8, borderRadius: '50%', background: COLORS[status] ?? 'var(--fg-muted)' },
    }),
    label,
  );
}
