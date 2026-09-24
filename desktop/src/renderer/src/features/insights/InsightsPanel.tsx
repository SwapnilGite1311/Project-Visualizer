import { type ReactNode, useEffect } from 'react';
import { getNode } from '../../api/engine';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Spinner } from '../../ui/Spinner';
import { useExplainStore } from '../explain/explain-store';
import { BoundariesTable } from './BoundariesTable';
import { EntryPointsList } from './EntryPointsList';
import { HotspotsList } from './HotspotsList';
import { SummaryCards } from './SummaryCards';
import { useInsightsStore } from './insights-store';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 6px' }}>{title}</h3>
      {children}
    </section>
  );
}

async function explainArchitecture() {
  const pid = useAppStore.getState().projectId;
  if (!pid) return;
  try {
    await useExplainStore.getState().explain(await getNode(pid, 'project:'));
  } catch (e) {
    notify.error('Could not explain the architecture', e instanceof Error ? e.message : String(e));
  }
}

export function InsightsPanel() {
  const projectId = useAppStore((s) => s.projectId);
  const graphVersion = useAppStore((s) => s.graphVersion);
  const { summary, hotspots, entryPoints, boundaries, loading, error, load } = useInsightsStore();

  useEffect(() => {
    if (projectId) void load();
  }, [projectId, graphVersion, load]);

  if (!projectId) return <EmptyState title="Open a project to see insights" />;
  if (error) return <EmptyState title="Could not load insights" detail={error} action={<Button onClick={() => void load()}>Retry</Button>} />;
  if (loading || !summary) {
    return (
      <div style={{ display: 'flex', gap: 8, padding: 12, alignItems: 'center' }}>
        <Spinner />
        <span>Analyzing…</span>
      </div>
    );
  }
  return (
    <div style={{ padding: 8, overflowY: 'auto', overflowX: 'hidden', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 12 }}>
        <Button variant="primary" onClick={() => void explainArchitecture()}>
          Explain the architecture
        </Button>
      </div>
      <Section title="Summary">
        <SummaryCards summary={summary} />
      </Section>
      <Section title="Hotspots">
        <HotspotsList hotspots={hotspots} />
      </Section>
      <Section title="Entry points">
        <EntryPointsList entryPoints={entryPoints} />
      </Section>
      <Section title="Boundaries">
        <BoundariesTable boundaries={boundaries} />
      </Section>
    </div>
  );
}
