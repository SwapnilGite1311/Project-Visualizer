import { useEffect } from 'react';
import { getRenderer, listRenderers } from '../../view/renderers';
import { useViewPrefs } from '../../view/view-prefs';

// Names for renderers that do not carry a label of their own (the Classic ones from Phase 1).
const KNOWN_LABELS: Record<string, string> = { cy2d: 'Classic (Cytoscape)', fg3d: 'Classic (3d-force-graph)' };
const nameOf = (r: { id?: string; label?: string } | undefined) => r?.label ?? KNOWN_LABELS[r?.id ?? ''] ?? r?.id ?? 'none';

// Settings → Graph view: which renderer draws the 2D and the 3D map.
export function GraphViewSettings() {
  const prefs = useViewPrefs();
  useEffect(() => {
    void useViewPrefs.getState().load();
  }, []);
  const renderers = listRenderers();

  const row = (mode: '2d' | '3d', title: string) => {
    const options = renderers.filter((r) => r.mode === mode);
    const fallback = getRenderer(mode);
    const value = mode === '2d' ? prefs.renderer2d : prefs.renderer3d;
    return (
      <label style={{ display: 'grid', gap: 4 }}>
        <span>{title}</span>
        <select value={value} onChange={(e) => void prefs.setRenderer(mode, e.target.value)} aria-label={`${title} renderer`}>
          <option value="">Default ({nameOf(fallback)})</option>
          {options.map((r) => (
            <option key={r.id} value={r.id}>
              {nameOf(r)}
            </option>
          ))}
        </select>
      </label>
    );
  };

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      <p style={{ margin: 0, opacity: 0.8 }}>
        The new views use React Flow (2D) and React Three Fiber (3D) with layouts computed by the engine. The Classic
        views stay available.
      </p>
      {row('2d', '2D map')}
      {row('3d', '3D map')}
    </div>
  );
}
