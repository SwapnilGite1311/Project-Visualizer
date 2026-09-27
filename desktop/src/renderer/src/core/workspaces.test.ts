// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRegistry } from './registry';
import { useAppStore, WORKSPACE_KEY } from './store';
import { activeWorkspace, isVisible, panelsFor, workspaceWith } from './workspaces';

const Dummy = () => null;
function registry() {
  const r = createRegistry();
  for (const [id, area, order] of [
    ['search', 'left', 1],
    ['details', 'right', 1],
    ['decision', 'right', 2],
    ['impact', 'bottom', 1],
    ['simulation', 'bottom', 2],
  ] as const) {
    r.addPanel({ id, title: id, area, order, component: Dummy });
  }
  r.addWorkspace({ id: 'explore', title: 'Explore', icon: 'map', description: 'd', order: 1, panels: { right: ['details'], bottom: [] } });
  r.addWorkspace({ id: 'whatif', title: 'What if', icon: 'flask', description: 'd', order: 2, panels: { left: [], right: ['decision'], bottom: ['simulation'] } });
  r.addWorkspace({ id: 'all', title: 'All tools', icon: 'grid', description: 'd', order: 9 });
  return r;
}

describe('dashboards', () => {
  it('filters each area by the dashboard and keeps registry order', () => {
    const r = registry();
    expect(panelsFor(r, 'right', 'explore').map((p) => p.id)).toEqual(['details']);
    expect(panelsFor(r, 'bottom', 'explore')).toEqual([]); // hidden area
    expect(panelsFor(r, 'left', 'explore').map((p) => p.id)).toEqual(['search']); // not listed: all
    expect(panelsFor(r, 'bottom', 'all').map((p) => p.id)).toEqual(['impact', 'simulation']);
    expect(activeWorkspace(r, 'nope')?.id).toBe('explore');
  });

  it('shows everything when no dashboard is registered', () => {
    const r = createRegistry();
    r.addPanel({ id: 'x', title: 'x', area: 'right', order: 1, component: Dummy });
    expect(panelsFor(r, 'right', 'explore').map((p) => p.id)).toEqual(['x']);
  });

  it('finds the dashboard for a panel a feature wants to show', () => {
    const r = registry();
    expect(isVisible(r, 'bottom', 'simulation', 'explore')).toBe(false);
    expect(workspaceWith(r, 'bottom', 'simulation')?.id).toBe('whatif');
    expect(workspaceWith(r, 'bottom', 'impact')?.id).toBe('all'); // only All tools has it
  });
});

describe('dashboard in the store', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState());
    const data = new Map<string, string>(); // Node's own localStorage stub does not work in tests
    vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
  });

  it('switches, opens the start panels and remembers the choice', () => {
    useAppStore.getState().setWorkspace('whatif', { bottom: 'simulation', right: 'decision' });
    const s = useAppStore.getState();
    expect(s.workspace).toBe('whatif');
    expect(s.activePanel).toMatchObject({ bottom: 'simulation', right: 'decision' });
    expect(localStorage.getItem(WORKSPACE_KEY)).toBe('whatif');
    useAppStore.getState().openedProject('p', 'C:/x');
    useAppStore.getState().closedProject();
    expect(useAppStore.getState().workspace).toBe('whatif'); // closing a project keeps the dashboard
  });
});
