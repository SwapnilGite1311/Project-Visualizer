import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { invoke } from '../../api/bridge';
import { getSetting } from '../../api/main';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { recommendLocal, type RecommendRequest, type Verdict } from './local-rules';

const LOOK: Record<Verdict, { tone: 'success' | 'warning' | 'danger'; text: string }> = {
  go: { tone: 'success', text: 'Go' },
  caution: { tone: 'warning', text: 'Caution' },
  no_go: { tone: 'danger', text: 'No-go' },
};

// The decision for the signals given: verdict, confidence, reasons and actions, computed locally.
export function RecommendationCard({ input }: { input: RecommendRequest }) {
  const result = useMemo(() => recommendLocal(input), [input]);
  const [cloud, setCloud] = useState(false);
  const [explained, setExplained] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSetting('ai.mode', 'direct')
      .then((mode) => setCloud(mode === 'cloud'))
      .catch(() => setCloud(false));
  }, []);
  useEffect(() => {
    setExplained(null);
    setError(null);
  }, [input]);

  const explain = async () => {
    setError(null);
    try {
      const r = await invoke<{ markdown: string }>('pv:ml.recommend', { input });
      setExplained(r.markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const look = LOOK[result.verdict];
  const pct = Math.round(result.confidence * 100);

  return (
    <section aria-label="Recommendation" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Badge tone={look.tone}>{look.text}</Badge>
        <div
          role="meter"
          aria-label="Confidence"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          style={{ width: 120, height: 8, borderRadius: 4, background: 'var(--border, #ddd)', overflow: 'hidden' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent, #3b82f6)' }} />
        </div>
        <span>
          {pct}% confidence, based on the data available
        </span>
      </div>
      <div>
        <strong>Why</strong>
        <ul aria-label="Reasons" style={{ margin: '2px 0 0', paddingLeft: 18 }}>
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <div>
        <strong>What to do</strong>
        <ul aria-label="Actions" style={{ margin: '2px 0 0', paddingLeft: 18 }}>
          {result.actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
      {cloud && (
        <div>
          <Button size="sm" onClick={() => void explain()}>
            Explain with AI
          </Button>
        </div>
      )}
      {error && <div role="note">{error}</div>}
      {explained && (
        <div aria-label="AI explanation">
          <ReactMarkdown>{explained}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}
