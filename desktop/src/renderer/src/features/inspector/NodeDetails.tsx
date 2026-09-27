import type { GraphNode } from '../../api/types';
import { Badge } from '../../ui/Badge';
import { usePlainWords } from '../plain/plain-store';
import { explainMetric, plainKind, plainMetric, whatIs } from '../plain/terms';

const HEALTH_TONE = { ok: 'success', warning: 'warning', stalled: 'danger', error: 'danger', unknown: 'neutral' } as const;

export function NodeDetails({ node }: { node: GraphNode }) {
  const m = node.metrics;
  const simple = usePlainWords();
  const label = (name: string) => (simple ? plainMetric(name) : { loc: 'Lines', complexity: 'Complexity', fan_in: 'Used by (fan-in)', fan_out: 'Uses (fan-out)' }[name] ?? name);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 16, wordBreak: 'break-all' }}>{node.name}</h2>
        <Badge tone="info">{simple ? plainKind(node.kind) : node.kind}</Badge>
        {node.health !== 'unknown' && <Badge tone={HEALTH_TONE[node.health]}>{node.health}</Badge>}
      </div>
      {simple && whatIs(node.kind) && <div data-testid="node-what-is">{whatIs(node.kind)}</div>}
      {node.qualified_name && (
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', wordBreak: 'break-all' }}>{node.qualified_name}</div>
      )}
      {node.file_path && (
        <div style={{ color: 'var(--fg-muted)' }} data-testid="node-location">
          {node.file_path}:{node.span.start_line}–{node.span.end_line}
        </div>
      )}
      <table style={{ borderCollapse: 'collapse', marginTop: 4 }}>
        <tbody>
          <MetricRow label={label('loc')} hint={explainMetric('loc')} value={m.loc} />
          <MetricRow label={label('complexity')} hint={explainMetric('complexity')} value={m.complexity} />
          <MetricRow label={label('fan_in')} hint={explainMetric('fan_in')} value={m.fan_in} />
          <MetricRow label={label('fan_out')} hint={explainMetric('fan_out')} value={m.fan_out} />
        </tbody>
      </table>
    </div>
  );
}

function MetricRow({ label, hint, value }: { label: string; hint: string; value: number }) {
  return (
    <tr title={hint}>
      <td style={{ color: 'var(--fg-muted)', padding: '2px 12px 2px 0' }}>{label}</td>
      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</td>
    </tr>
  );
}
