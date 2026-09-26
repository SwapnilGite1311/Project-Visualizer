// @vitest-environment jsdom
import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useToasts } from '../../core/notify';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { revealNode } from '../../view/reveal';
import { useErrorsStore } from './errors-store';
import { ErrorsPanel } from './ErrorsPanel';
import register from './register';
import { entry } from './test-data';

// The full suite runs many jsdom files in parallel; the 1 s default wait is too tight there.
configure({ asyncUtilTimeout: 5000 });

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

let fake: FakeBridge;
beforeEach(() => {
  vi.clearAllMocks();
  fake = installFakeBridge();
  fake.rpcHandlers.set('errors.list', () => ({
    errors: [
      entry('e1'),
      entry('e2', { error_type: 'WeirdError', message: 'odd', last_seen_ms: 500 }),
    ],
  }));
  fake.rpcHandlers.set('graph.ancestors', () => ({ nodes: [] }));
  useAppStore.setState({
    projectId: 'p1',
    overlays: {},
    activePanel: { left: null, center: null, right: null, bottom: null },
  });
  useErrorsStore.setState({ errors: [], selected: null, dialogOpen: false });
  useToasts.setState({ items: [] });
});

describe('errors feature', () => {
  it('registers the panel, command, globals and welcome action', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('bottom').map((p) => p.id)).toEqual(['errors']);
    expect(r.commands().map((c) => [c.id, c.shortcut])).toEqual([['errors.paste', 'Ctrl+Shift+V']]);
    expect(r.globals().map((g) => g.id)).toEqual(['errors-watcher', 'paste-error-dialog']);
    const [welcome] = r.welcomeActions();
    expect(welcome).toMatchObject({
      id: 'paste-error',
      title: 'Find an error on the map',
      order: 40,
    });

    void welcome.run();
    expect(useErrorsStore.getState().dialogOpen).toBe(true);
    expect(useAppStore.getState().activePanel.bottom).toBe('errors');
    useErrorsStore.setState({ dialogOpen: false });
    useAppStore.setState({ projectId: null });
    void welcome.run();
    expect(useErrorsStore.getState().dialogOpen).toBe(false);
    expect(useToasts.getState().items.map((t) => t.title)).toContain('Open a project first');
  });

  it('lists errors and explains the selected one in plain words', async () => {
    render(<ErrorsPanel />);
    const list = await screen.findByRole('list', { name: 'Errors' });
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2));
    const [first, second] = within(list).getAllByRole('button');
    expect(first.textContent).toContain('KeyError');
    expect(first.textContent).toContain('×2');
    expect(second.textContent).toContain('WeirdError');

    await act(async () => {
      fireEvent.click(first);
    });
    const meaning = screen.getByRole('region', { name: 'What it means' });
    expect(meaning.textContent).toContain(
      'The code asked a dictionary for a key that is not in it.',
    );
    const frames = screen.getByRole('list', { name: 'Frames' });
    const links = within(frames).getAllByRole('button');
    expect(links).toHaveLength(2); // the library frame is not clickable
    fireEvent.click(links[0]);
    expect(revealNode).toHaveBeenCalledWith('function:app/api.py#handle');

    await act(async () => {
      fireEvent.click(second);
    });
    expect(screen.getByRole('region', { name: 'What it means' }).textContent).toContain(
      'The program stopped because of an error of type WeirdError.',
    );
  }, 20000); // several screens and async steps: slow when the whole suite runs in parallel
});
