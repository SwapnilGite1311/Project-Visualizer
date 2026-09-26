import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import register from './register';

describe('canvas feature', () => {
  it('adds the map panel and the fit command', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('center').map((p) => p.id)).toEqual(['canvas']);
    expect(r.commands()).toEqual([expect.objectContaining({ id: 'canvas.fit', shortcut: 'Ctrl+0' })]);
  });

  it('adds the Graph view settings section', () => {
    const r = createRegistry();
    register(r);
    expect(r.settingsSections()).toEqual([expect.objectContaining({ id: 'graph-view', title: 'Graph view', order: 15 })]);
  });
});
