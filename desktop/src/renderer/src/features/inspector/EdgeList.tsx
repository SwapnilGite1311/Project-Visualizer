import { useEffect, useState } from 'react';
import { getEdges } from '../../api/engine';
import type { GraphEdge, GraphNode } from '../../api/types';
import { useAppStore } from '../../core/store';
import { revealNode } from '../../view/reveal';

export function shortLabel(id: string): string {
  const hash = id.lastIndexOf('#');
  if (hash >= 0) return id.slice(hash + 1);
  const colon = id.indexOf(':');
  return colon >= 0 ? id.slice(colon + 1) : id;
}

function group(edges: GraphEdge[], other: (e: GraphEdge) => string): Map<string, { id: string; weight: number }[]> {
  const byKind = new Map<string, { id: string; weight: number }[]>();
  for (const e of edges) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, []);
    byKind.get(e.kind)!.push({ id: other(e), weight: e.weight });
  }
  return byKind;
}

function Section({ title, groups }: { title: string; groups: Map<string, { id: string; weight: number }[]> }) {
  return (
    <div>
      <strong>{title}</strong>
      {groups.size === 0 && <div style={{ color: 'var(--fg-muted)' }}>Nothing</div>}
      {[...groups.entries()].map(([kind, items]) => (
        <div key={kind} style={{ marginTop: 4 }}>
          <div style={{ color: 'var(--fg-muted)' }}>
            {kind} ({items.length})
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  title={item.id}
                  onClick={() => void revealNode(item.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '1px 0', textAlign: 'left' }}
                >
                  {shortLabel(item.id)}
                  {item.weight > 1 && <span style={{ color: 'var(--fg-muted)' }}> ×{item.weight}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function EdgeList({ node }: { node: GraphNode }) {
  const projectId = useAppStore((s) => s.projectId);
  const [edges, setEdges] = useState<GraphEdge[] | null>(null);

  useEffect(() => {
    setEdges(null);
    if (!projectId) return;
    let active = true;
    getEdges(projectId, node.id, 'both')
      .then((e) => active && setEdges(e))
      .catch(() => active && setEdges([]));
    return () => {
      active = false;
    };
  }, [projectId, node.id]);

  if (!edges) return null;
  const usedBy = group(edges.filter((e) => e.target_id === node.id), (e) => e.source_id);
  const uses = group(edges.filter((e) => e.source_id === node.id), (e) => e.target_id);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Section title="Used by" groups={usedBy} />
      <Section title="Uses" groups={uses} />
    </div>
  );
}
