// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { loadFeatures } from '../../core/features';
import { createRegistry, type PanelArea } from '../../core/registry';
import { DASHBOARDS } from './definitions';

describe('dashboards', () => {
  it('put every panel of the app in at least one focused dashboard', () => {
    const r = createRegistry();
    loadFeatures(r);
    const areas: PanelArea[] = ['left', 'center', 'right', 'bottom'];
    const missing: string[] = [];
    for (const area of areas) {
      for (const p of r.panels(area)) {
        const listed = DASHBOARDS.some((d) => d.id !== 'all' && d.panels?.[area]?.includes(p.id));
        if (!listed) missing.push(`${area}:${p.id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('only name panels that exist, open panels they show, and describe themselves', () => {
    const r = createRegistry();
    loadFeatures(r);
    for (const d of DASHBOARDS) {
      expect(d.description.length).toBeGreaterThan(20);
      for (const [area, ids] of Object.entries(d.panels ?? {})) {
        const known = r.panels(area as PanelArea).map((p) => p.id);
        for (const id of ids) expect(known, `${d.id} ${area}`).toContain(id);
      }
      for (const [area, id] of Object.entries(d.start ?? {})) {
        const shown = d.panels?.[area as PanelArea];
        if (shown) expect(shown, `${d.id} start ${area}`).toContain(id);
      }
    }
    expect(DASHBOARDS.at(-1)?.id).toBe('all');
  });

  it('only use "Try this" commands that exist or come with the help feature', () => {
    const r = createRegistry();
    loadFeatures(r);
    const ids = new Set(r.commands().map((c) => c.id));
    for (const d of DASHBOARDS) {
      for (const a of d.intro?.actions ?? []) expect(ids.has(a.command) || a.command.startsWith('help.'), `${d.id}: ${a.command}`).toBe(true);
    }
  });
});
