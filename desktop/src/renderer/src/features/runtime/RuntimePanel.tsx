import { useEffect, useState } from 'react';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Tabs } from '../../ui/Tabs';
import { ConnectPanel } from './ConnectPanel';
import { CrossingsTable } from './CrossingsTable';
import { useLiveStore } from './live-store';
import { PlaybackBar } from './PlaybackBar';
import { clearRuntime, type RuntimeStatus, runtimeStatus } from './runtime-api';
import { TracesView } from './TracesView';

export const STATUS_POLL_MS = 2000;

const TABS = [
  { id: 'connect', title: 'Connect' },
  { id: 'live', title: 'Live' },
  { id: 'traces', title: 'Traces' },
  { id: 'crossings', title: 'Crossings' },
];

export async function clearRuntimeData(): Promise<void> {
  const pid = useAppStore.getState().projectId;
  if (!pid) return;
  await clearRuntime(pid);
  useLiveStore.getState().reset();
  for (const id of ['trace', 'crossing']) useAppStore.getState().setOverlay(id, null);
  notify.info('Runtime data cleared');
}

function LiveTab() {
  const pid = useAppStore((s) => s.projectId);
  const enabled = useLiveStore((s) => s.enabled);
  const [status, setStatus] = useState<RuntimeStatus | null>(null);

  useEffect(() => {
    if (!pid) return;
    let alive = true;
    const load = () =>
      runtimeStatus(pid).then(
        (s) => alive && setStatus(s),
        () => undefined,
      );
    void load();
    const timer = setInterval(() => void load(), STATUS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [pid]);

  if (!enabled) {
    return (
      <EmptyState
        title="Live view is off"
        detail="Turn it on to see calls moving on the map while your program runs."
        action={
          <Button onClick={() => useLiveStore.getState().setEnabled(true)}>Turn on Live</Button>
        }
      />
    );
  }
  const seconds =
    status && status.last_event_ms > 0
      ? Math.max(0, Math.round((Date.now() - status.last_event_ms) / 1000))
      : null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <PlaybackBar />
      <div
        aria-label="Runtime counters"
        style={{ fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}
      >
        <span>Events {status?.events_total ?? 0}</span>
        <span>Kept {status?.events_buffered ?? 0}</span>
        <span>
          Programs {status && status.services.length > 0 ? status.services.join(', ') : 'none yet'}
        </span>
        <span>Last event {seconds === null ? 'never' : `${seconds} s ago`}</span>
      </div>
      <div>
        <Button size="sm" variant="danger" onClick={() => void clearRuntimeData()}>
          Clear data
        </Button>
      </div>
    </div>
  );
}

export function RuntimePanel() {
  const [tab, setTab] = useState('connect');
  const enabled = useLiveStore((s) => s.enabled);
  const [autoSwitched, setAutoSwitched] = useState(false);

  // Turning Live on from the toolbar shows the Live tab once.
  useEffect(() => {
    if (enabled && !autoSwitched) {
      setTab('live');
      setAutoSwitched(true);
    }
  }, [enabled, autoSwitched]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 8 }}>
        {tab === 'connect' && <ConnectPanel />}
        {tab === 'live' && <LiveTab />}
        {tab === 'traces' && <TracesView />}
        {tab === 'crossings' && <CrossingsTable />}
      </div>
    </div>
  );
}
