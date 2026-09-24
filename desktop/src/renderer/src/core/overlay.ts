export interface NodeStyle { color?: string; borderColor?: string; badge?: string; pulse?: boolean; opacity?: number; }
export interface EdgeStyle { color?: string; width?: number; animated?: boolean; opacity?: number; }
export interface Overlay { priority: number; nodes: Record<string, NodeStyle>; edges: Record<string, EdgeStyle>; dimOthers?: boolean; }

export interface MergedOverlay { nodes: Record<string, NodeStyle>; edges: Record<string, EdgeStyle>; dimOthers: boolean }

export function mergeOverlays(overlays: Record<string, Overlay>): MergedOverlay {
  const entries = Object.entries(overlays).sort(([ka, a], [kb, b]) =>
    a.priority !== b.priority ? a.priority - b.priority : ka < kb ? -1 : ka > kb ? 1 : 0,
  );
  const merged: MergedOverlay = { nodes: {}, edges: {}, dimOthers: false };
  for (const [, overlay] of entries) {
    for (const [id, style] of Object.entries(overlay.nodes)) merged.nodes[id] = { ...merged.nodes[id], ...style };
    for (const [id, style] of Object.entries(overlay.edges)) merged.edges[id] = { ...merged.edges[id], ...style };
    if (overlay.dimOthers) merged.dimOthers = true;
  }
  return merged;
}
