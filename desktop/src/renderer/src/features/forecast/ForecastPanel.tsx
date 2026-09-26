import { useEffect, useState } from 'react';
import { useAppStore } from '../../core/store';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Spinner } from '../../ui/Spinner';
import { Tabs } from '../../ui/Tabs';
import { shortLabel } from '../depnav/labels';
import { ForecastChart } from './ForecastChart';
import { useForecastStore } from './forecast-store';
import type { ForecastMetric, PredictedState } from './local-models';

const METRIC_TABS = [
  { id: 'error_rate', title: 'Errors' },
  { id: 'p95_ms', title: 'Latency' },
];
const STATE_TONE: Record<PredictedState, 'success' | 'warning' | 'danger' | 'neutral'> = { ok: 'success', warning: 'warning', error: 'danger', unknown: 'neutral' };
const STATE_TEXT: Record<PredictedState, string> = { ok: 'Healthy', warning: 'Warning', error: 'Failing', unknown: 'Unknown' };

// History and the next 24 hours for the selected element, plus a check of everything on screen.
export function ForecastPanel() {
  const selected = useAppStore((s) => s.selectedNodeId);
  const s = useForecastStore();
  const [metric, setMetric] = useState<ForecastMetric>('error_rate');
  useEffect(() => {
    if (selected && selected !== useForecastStore.getState().nodeId) void useForecastStore.getState().forecastNode(selected);
  }, [selected]);

  const m = s.metrics[metric];
  const checkButton = (
    <Button size="sm" onClick={() => void s.refreshIndicators()} disabled={s.checking}>
      Check visible modules
    </Button>
  );
  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.nodeId ?? undefined}>
          {s.nodeId ? shortLabel(s.nodeId) : 'Forecast'}
        </strong>
        {s.method && <Badge tone="neutral">{s.method === 'cloud' ? 'Cloud model' : 'Local model'}</Badge>}
        {checkButton}
      </div>
      {s.checking && <Spinner />}
      {!s.checking && s.risingIds.length > 0 && (
        <div role="status">
          {s.risingIds.length} element{s.risingIds.length === 1 ? '' : 's'} on screen may get worse: {s.risingIds.map(shortLabel).join(', ')}
        </div>
      )}
      {s.error && <div role="alert" style={{ color: 'var(--danger)' }}>{s.error}</div>}

      {!s.nodeId ? (
        <EmptyState title="Select an element to see its forecast" />
      ) : (
        <>
          <Tabs tabs={METRIC_TABS} active={metric} onChange={(id) => setMetric(id as ForecastMetric)} />
          {s.loading ? (
            <Spinner />
          ) : !m || m.history.length === 0 ? (
            <EmptyState title="No history for this element yet" detail="Run your app with an agent to collect history." />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>Next 24 hours:</span>
                <Badge tone={STATE_TONE[m.state]}>{STATE_TEXT[m.state]}</Badge>
                <span style={{ color: 'var(--fg-muted)' }}>confidence {Math.round(m.confidence * 100)}%</span>
                {m.anomalies.length > 0 && (
                  <span style={{ color: 'var(--danger)' }}>
                    {m.anomalies.length} unusual point{m.anomalies.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <ForecastChart metric={metric} history={m.history} forecast={m.forecast} anomalies={m.anomalies} subject={shortLabel(s.nodeId)} />
            </>
          )}
        </>
      )}
    </div>
  );
}
