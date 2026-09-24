// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createRegistry } from './core/registry';
import { useAppStore } from './core/store';

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
});

describe('App', () => {
  it('shows the welcome screen, then the workspace layout', () => {
    const r = createRegistry();
    r.addScreen({ id: 'welcome', component: () => <div>welcome screen</div> });
    r.addPanel({ id: 'canvas', title: 'Map', area: 'center', order: 1, component: () => <div>map canvas</div> });
    r.addGlobal({ id: 'watcher', component: () => <div>global watcher</div> });
    render(<App registry={r} />);
    expect(screen.getByText('welcome screen')).toBeInTheDocument();
    expect(screen.getByText('global watcher')).toBeInTheDocument();
    act(() => {
      useAppStore.getState().openedProject('p1', 'C:/code/demo');
    });
    expect(screen.queryByText('welcome screen')).not.toBeInTheDocument();
    expect(screen.getByText('map canvas')).toBeInTheDocument();
  });

  it('shows an empty state for an unknown screen', () => {
    render(<App registry={createRegistry()} />);
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
  });
});
