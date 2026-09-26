import { useEffect } from 'react';
import { getRenderer, listRenderers } from '../../view/renderers';
import { useViewPrefs } from '../../view/view-prefs';

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
          <option value="">Default ({fallback?.label ?? fallback?.id ?? 'none'})</option>
          {options.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label ?? r.id}
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
