import { useEffect, useState } from 'react';
import type { Health } from '../../api/types';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import { revealNode } from '../../view/reveal';
import { shortLabel } from '../depnav/labels';
import { type HealthInfo, isProblem, severity, type Thresholds } from './health-api';
import { HEALTH_COLORS } from './health-overlay';
import { useHealthStore } from './health-store';
import { findRootCause } from './root-cause';

const LEGEND: Array<{ state: keyof typeof HEALTH_COLORS; label: string }> = [
  { state: 'ok', label: 'Healthy (green outline)' },
  { state: 'warning', label: 'Slow or some errors' },
  { state: 'stalled', label: 'Hanging right now' },
  { state: 'error', label: 'Failing often' },
];

const TONE: Record<Health, 'neutral' | 'warning' | 'danger' | 'info' | 'success'> = {
  unknown: 'neutral',
  ok: 'success',
  warning: 'warning',
  stalled: 'info',
  error: 'danger',
};

export function problems(states: Record<string, HealthInfo>): Array<[string, HealthInfo]> {
  return Object.entries(states)
    .filter(([, h]) => isProblem(h.state))
    .sort(
      ([ia, a], [ib, b]) =>
        severity(b.state) - severity(a.state) || b.errors - a.errors || (ia < ib ? -1 : 1),
    );
}

export async function revealRootCause(id: string): Promise<void> {
  const pid = useAppStore.getState().projectId;
  if (!pid) return;
  try {
    await revealNode(await findRootCause(pid, id));
  } catch (e) {
    notify.error('Could not find the root cause', e instanceof Error ? e.message : String(e));
  }
}

// Form fields in the units people think in; converted to the engine's units on save.
const FIELDS: Array<{
  key: keyof Thresholds;
  label: string;
  toForm(v: number): number;
  fromForm(v: number): number;
}> = [
  {
    key: 'window_ms',
    label: 'Look at the last (seconds)',
    toForm: (v) => v / 1000,
    fromForm: (v) => Math.round(v * 1000),
  },
  {
    key: 'error_rate',
    label: 'Error rate for red (%)',
    toForm: (v) => Math.round(v * 1000) / 10,
    fromForm: (v) => v / 100,
  },
  { key: 'warn_p95_ms', label: 'Slow above (ms)', toForm: (v) => v, fromForm: (v) => v },
  {
    key: 'stall_ms',
    label: 'Hanging after (ms)',
    toForm: (v) => v,
    fromForm: (v) => Math.round(v),
  },
  {
    key: 'loop_calls',
    label: 'Loop warning after (calls)',
    toForm: (v) => v,
    fromForm: (v) => Math.round(v),
  },
];

function ThresholdsForm() {
  const thresholds = useHealthStore((s) => s.thresholds);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    void useHealthStore
      .getState()
      .loadThresholds()
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (thresholds)
      setForm(Object.fromEntries(FIELDS.map((f) => [f.key, String(f.toForm(thresholds[f.key]))])));
  }, [thresholds]);

  if (!thresholds) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>;
  const save = async () => {
    const partial: Partial<Thresholds> = {};
    for (const f of FIELDS) {
      const n = Number(form[f.key]);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error('Check the thresholds', `"${f.label}" must be a positive number.`);
        return;
      }
      partial[f.key] = f.fromForm(n);
    }
    await useHealthStore.getState().saveThresholds(partial);
    notify.success('Thresholds saved');
  };
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {FIELDS.map((f) => (
        <label
          key={f.key}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 12,
            alignItems: 'center',
          }}
        >
          {f.label}
          <input
            type="number"
            aria-label={f.label}
            value={form[f.key] ?? ''}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            style={{ width: 90, font: 'inherit' }}
          />
        </label>
      ))}
      <div>
        <Button size="sm" onClick={() => void save()}>
          Save thresholds
        </Button>
      </div>
    </div>
  );
}

export function HealthPanel() {
  const pid = useAppStore((s) => s.projectId);
  const { enabled, states } = useHealthStore();
  const [showThresholds, setShowThresholds] = useState(false);
  const list = problems(states);

  return (
    <Panel>
      <div style={{ display: 'grid', gap: 10 }}>
        <label style={{ fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => useHealthStore.getState().setEnabled(!enabled)}
          />
          Show health colors
        </label>
        <ul
          aria-label="Legend"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gap: 2,
            fontSize: 12,
          }}
        >
          {LEGEND.map((l) => (
            <li key={l.state} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: l.state === 'ok' ? 'transparent' : HEALTH_COLORS[l.state],
                  border: `2px solid ${HEALTH_COLORS[l.state]}`,
                }}
              />
              {l.label}
            </li>
          ))}
        </ul>
        <section>
          <h4 style={{ margin: '0 0 4px', fontSize: 12 }}>Problems</h4>
          {!pid ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Open a project and connect a running program (Runtime panel).
            </div>
          ) : list.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No problems seen in the running program.
            </div>
          ) : (
            <ul
              aria-label="Problems"
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}
            >
              {list.map(([id, h]) => (
                <li key={id} style={{ fontSize: 12, display: 'grid', gap: 2 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => void revealNode(id)}
                      style={{
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        font: 'inherit',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'inherit',
                        textAlign: 'left',
                      }}
                    >
                      {shortLabel(id)}
                    </button>
                    <Badge tone={TONE[h.state]}>{h.state}</Badge>
                    <span style={{ flex: 1 }} />
                    <Button size="sm" onClick={() => void revealRootCause(id)}>
                      Find root cause
                    </Button>
                  </div>
                  {h.reason && <div>{h.reason}</div>}
                  <div style={{ color: 'var(--text-muted)' }}>
                    {h.calls} calls · {h.errors} errors · p95 {h.p95_ms.toFixed(1)} ms
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        {pid && (
          <section>
            <button
              type="button"
              aria-expanded={showThresholds}
              onClick={() => setShowThresholds(!showThresholds)}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                font: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              {showThresholds ? '▾' : '▸'} Thresholds
            </button>
            {showThresholds && <ThresholdsForm />}
          </section>
        )}
      </div>
    </Panel>
  );
}
