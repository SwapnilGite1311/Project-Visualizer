// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';
import { createRegistry } from './registry';
import { useAppStore } from './store';

const panel = (text: string) => () => <div>{text}</div>;

function registry() {
  const r = createRegistry();
  r.addPanel({ id: 'canvas', title: 'Map', area: 'center', order: 0, component: panel('the map') });
  r.addPanel({ id: 'search', title: 'Search', area: 'left', order: 1, component: panel('search box') });
  r.addPanel({ id: 'details', title: 'Details', area: 'right', order: 1, component: panel('details body') });
  r.addPanel({ id: 'decision', title: 'Decision', area: 'right', order: 2, component: panel('decision body') });
  r.addPanel({ id: 'simulation', title: 'Simulation', area: 'bottom', order: 1, component: panel('simulation body') });
  r.addWorkspace({ id: 'explore', title: 'Explore', icon: 'map', description: 'Look around the code', order: 1, panels: { right: ['details'], bottom: [] } });
  r.addWorkspace({
    id: 'whatif',
    title: 'What if',
    icon: 'flask',
    description: 'Try a change safely',
    order: 2,
    panels: { left: [], right: ['decision'], bottom: ['simulation'] },
    start: { bottom: 'simulation' },
  });
  return r;
}

beforeEach(() => {
  const data = new Map<string, string>(); // Node's own localStorage stub does not work in tests
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
  useAppStore.setState({ ...useAppStore.getInitialState(), workspace: 'explore' });
});
afterEach(cleanup);

describe('dashboards in the layout', () => {
  it('shows only the dashboard panels and collapses empty areas', () => {
    const { container } = render(<Layout registry={registry()} />);
    expect(screen.getByText('search box')).toBeTruthy();
    expect(screen.getByText('details body')).toBeTruthy();
    expect(screen.queryByText('decision body')).toBeNull();
    expect(container.querySelector('[data-area="bottom"]')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /What if/ }));
    expect(useAppStore.getState().workspace).toBe('whatif');
    expect(screen.getByText('simulation body')).toBeTruthy();
    expect(screen.getByText('decision body')).toBeTruthy();
    expect(container.querySelector('[data-area="left"]')).toBeNull();
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--left-w')).toBe('0px');
  });

  it('describes each dashboard and moves between them with the arrow keys', () => {
    render(<Layout registry={registry()} />);
    const explore = screen.getByRole('tab', { name: /Explore/ });
    expect(explore.getAttribute('aria-selected')).toBe('true');
    expect(explore.getAttribute('title')).toContain('Look around the code');
    fireEvent.keyDown(explore, { key: 'ArrowDown' });
    expect(useAppStore.getState().workspace).toBe('whatif');
    fireEvent.keyDown(screen.getByRole('tab', { name: /What if/ }), { key: 'ArrowDown' });
    expect(useAppStore.getState().workspace).toBe('explore'); // wraps around
  });

  it('follows a feature that opens a panel the dashboard hides', () => {
    render(<Layout registry={registry()} />);
    act(() => useAppStore.getState().showPanel('bottom', 'simulation'));
    expect(useAppStore.getState().workspace).toBe('whatif');
    expect(screen.getByText('simulation body')).toBeTruthy();
  });

  it('has no rail when no dashboard is registered', () => {
    const r = createRegistry();
    r.addPanel({ id: 'canvas', title: 'Map', area: 'center', order: 0, component: panel('the map') });
    render(<Layout registry={r} />);
    expect(screen.queryByRole('navigation', { name: 'Dashboards' })).toBeNull();
  });
});
