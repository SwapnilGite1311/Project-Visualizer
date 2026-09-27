// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useExplainStore } from '../explain/explain-store';
import { IntroCard } from './IntroCard';
import { useIntroStore } from './intro-store';
import register, { explainProject } from './register';

let center: HTMLDivElement;
beforeEach(() => {
  const data = new Map<string, string>(); // Node's own localStorage stub does not work in tests
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
  center = document.createElement('div');
  center.setAttribute('data-area', 'center');
  document.body.appendChild(center);
  useIntroStore.setState({ seen: [] });
  useAppStore.setState({ ...useAppStore.getInitialState(), screen: 'workspace', projectId: 'p1', workspace: 'whatif' });
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('dashboard intro card', () => {
  it('explains the dashboard and runs its "Try this" commands', () => {
    const r = createRegistry();
    const start = vi.fn();
    r.addCommand({ id: 'sim.start', title: 'sandbox', run: start });
    render(<IntroCard registry={r} />);
    const card = screen.getByRole('region', { name: 'Try it before you do it' });
    expect(center.contains(card)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Open a sandbox' }));
    expect(start).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Predict problems' })).toBeNull(); // command not registered here
  });

  it('closes with "Got it", remembers it per dashboard and can be reopened', () => {
    render(<IntroCard registry={createRegistry()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(useIntroStore.getState().seen).toEqual(['whatif']);
    expect(screen.queryByRole('region')).toBeNull();
    act(() => useAppStore.getState().setWorkspace('explore'));
    expect(screen.getByRole('region', { name: 'Explore your project' })).toBeTruthy();
    act(() => useAppStore.getState().setWorkspace('whatif'));
    fireEvent.click(screen.getByRole('button', { name: /About this dashboard/ }));
    expect(screen.getByRole('region', { name: 'Try it before you do it' })).toBeTruthy();
  });

  it('shows nothing on "All tools" or without a project', () => {
    act(() => useAppStore.getState().setWorkspace('all'));
    render(<IntroCard registry={createRegistry()} />);
    expect(screen.queryByRole('region')).toBeNull();
  });
});

describe('dashboards feature', () => {
  it('registers six dashboards with Ctrl+1…6 and the intro card', () => {
    const r = createRegistry();
    register(r);
    expect(r.workspaces().map((w) => w.id)).toEqual(['explore', 'run', 'change', 'whatif', 'history', 'all']);
    const go = r.commands().filter((c) => c.id.startsWith('workspace.'));
    const shortcut = (id: string) => go.find((c) => c.id === `workspace.${id}`)?.shortcut;
    expect(['explore', 'run', 'change', 'whatif', 'history', 'all'].map(shortcut)).toEqual(['Ctrl+1', 'Ctrl+2', 'Ctrl+3', 'Ctrl+4', 'Ctrl+5', 'Ctrl+6']);
    void go.find((c) => c.id === 'workspace.history')!.run();
    expect(useAppStore.getState()).toMatchObject({ workspace: 'history', activePanel: expect.objectContaining({ bottom: 'history' }) });
    expect(r.globals().map((g) => g.id)).toEqual(['dashboard-intro']);
  });

  it('explains the whole project', async () => {
    const fake = installFakeBridge();
    fake.rpcHandlers.set('graph.node', () => ({ id: 'project:', kind: 'project', name: 'shop', qualified_name: '', file_path: '', span: { start_line: 0, start_col: 0, end_line: 0, end_col: 0 } }));
    fake.invokeHandlers.set('pv:ai.explainNode', () => ({ node_id: 'project:', markdown: 'A shop.', cited_nodes: [], model: 'fake' }));
    await explainProject();
    expect(useExplainStore.getState().results['project:'].markdown).toBe('A shop.');
    expect(useAppStore.getState().activePanel.right).toBe('explanation');
  });
});
