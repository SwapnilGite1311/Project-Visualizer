import { useEffect, useState } from 'react';
import { invoke } from '../../api/bridge';

export const POLL_MS = 5000;

export function BridgeStatus() {
  const [clients, setClients] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const poll = () =>
      invoke<{ clients: number }>('pv:bridge.status').then(
        (s) => !cancelled && setClients(s.clients),
        () => !cancelled && setClients(0),
      );
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return clients > 0 ? <span>VS Code: connected</span> : <span style={{ color: 'var(--text-muted)' }}>VS Code: not connected</span>;
}
