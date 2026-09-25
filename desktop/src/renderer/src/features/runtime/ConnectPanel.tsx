import { useEffect, useState } from 'react';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { type HubInfo, hubInfo, regenerateToken } from './runtime-api';

export const HUB_POLL_MS = 2000;
const MASK = '••••••••••••••••';

const isWindows = () => typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent);

function envLines(vars: Array<[string, string]>): string {
  return vars.map(([k, v]) => (isWindows() ? `$env:${k}="${v}"` : `export ${k}="${v}"`)).join('\n');
}

export function snippets(
  url: string,
  token: string,
  root: string,
): Array<{ id: string; title: string; text: string }> {
  const common: Array<[string, string]> = [
    ['PV_RUNTIME_TOKEN', token],
    ['PV_PROJECT_ROOT', root],
  ];
  if (url !== 'http://127.0.0.1:47100') common.push(['PV_RUNTIME_URL', url]);
  return [
    {
      id: 'python',
      title: 'Python 3.12+',
      text: `${envLines(common)}\npython -m pv_agent run your_app.py`,
    },
    {
      id: 'node',
      title: 'Node.js',
      text: `${envLines(common)}\nnode --import @pv/agent-node/register app.js`,
    },
    {
      id: 'otel',
      title: 'OpenTelemetry (any language)',
      text: envLines([
        ['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', `${url}/v1/traces`],
        ['OTEL_EXPORTER_OTLP_TRACES_PROTOCOL', 'http/json'],
        ['OTEL_EXPORTER_OTLP_HEADERS', `Authorization=Bearer ${token}`],
      ]),
    },
  ];
}

async function copy(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    notify.success(`${what} copied`);
  } catch {
    notify.error('Could not copy', 'The clipboard is not available.');
  }
}

export function ConnectPanel() {
  const root = useAppStore((s) => s.projectRoot) ?? '';
  const [info, setInfo] = useState<HubInfo | null>(null);
  const [shown, setShown] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      hubInfo().then(
        (i) => alive && setInfo(i),
        () => undefined,
      );
    void load();
    const timer = setInterval(() => void load(), HUB_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (!info) return <div style={{ padding: 8, color: 'var(--text-muted)' }}>Loading…</div>;
  if (!info.running)
    return (
      <div style={{ padding: 8, color: 'var(--danger)' }}>
        The runtime receiver is not running. See the log for the reason (port 47100–47109 busy?).
      </div>
    );

  const token = shown ? info.token : MASK;
  const regenerate = async () => {
    setConfirming(false);
    const next = await regenerateToken();
    setInfo({ ...info, token: next });
    notify.info(
      'New token created',
      'Programs using the old token must be restarted with the new one.',
    );
  };
  const dropped = info.dropped_no_project + info.dropped_other_root + info.dropped_overflow;

  return (
    <div
      style={{
        padding: 8,
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span>
          Address <code>{info.url}</code>
        </span>
        <span>
          Token <code aria-label="Token">{token}</code>
        </span>
        <Button size="sm" onClick={() => setShown(!shown)}>
          {shown ? 'Hide' : 'Show'}
        </Button>
        <Button size="sm" onClick={() => void copy(info.token, 'Token')}>
          Copy token
        </Button>
        {confirming ? (
          <span role="alert" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            Programs using the current token will stop sending.
            <Button size="sm" variant="danger" onClick={() => void regenerate()}>
              Regenerate
            </Button>
            <Button size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button size="sm" onClick={() => setConfirming(true)}>
            Regenerate token…
          </Button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }} aria-label="Receiver counts">
        Received {info.received} · Sent to the map {info.forwarded} · Dropped {dropped}
        {info.unauthorized > 0 && ` · Wrong token ${info.unauthorized}`}
        {info.dropped_no_project > 0 && ' (open a project to receive events)'}
      </div>
      {snippets(info.url, token, root).map((s) => (
        <section key={s.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: '4px 0', fontSize: 12 }}>{s.title}</h4>
            <Button
              size="sm"
              onClick={() =>
                void copy(
                  snippets(info.url, info.token, root).find((x) => x.id === s.id)!.text,
                  s.title,
                )
              }
            >
              Copy
            </Button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: 6,
              background: 'var(--surface-2, rgba(127,127,127,0.1))',
              borderRadius: 4,
              fontSize: 12,
              overflowX: 'auto',
            }}
          >
            {s.text}
          </pre>
        </section>
      ))}
    </div>
  );
}
