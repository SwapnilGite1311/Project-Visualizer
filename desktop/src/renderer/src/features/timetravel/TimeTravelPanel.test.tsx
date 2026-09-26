// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { HistoryBanner } from './HistoryBanner';
import { TimeTravelPanel } from './TimeTravelPanel';
import { useTimeTravel } from './timetravel-store';

let fake: FakeBridge;

beforeEach(() => {
  fake = installFakeBridge();
  useAppStore.setState(useAppStore.getInitialState());
  useTimeTravel.setState(useTimeTravel.getInitialState());
  fake.invokeHandlers.set('pv:history.isRepo', () => true);
  fake.invokeHandlers.set('pv:history.commits', () => [
    { sha: 'bbbbbbb2', author: 'Ana', date: '2026-09-02T10:00:00Z', subject: 'second' },
    { sha: 'aaaaaaa1', author: 'Bo', date: '2026-09-01T10:00:00Z', subject: 'first' },
  ]);
  fake.invokeHandlers.set('pv:history.open', () => ({ project_id: 'old', path: '/h/x' }));
  fake.invokeHandlers.set('pv:history.close', () => true);
  fake.rpcHandlers.set('project.status', () => ({ state: 'ready' }));
  fake.rpcHandlers.set('graph.ancestors', () => ({ nodes: [] }));
  fake.rpcHandlers.set('gdiff.compare', () => ({
    added: ['function:app/a.py#n'],
    removed: ['function:app/a.py#gone'],
    changed: [],
    edges_added: 0,
    edges_removed: 1,
    packages: [{ node_id: 'package:app', added: 1, removed: 1, changed: 0 }],
  }));
});

afterEach(cleanup);

describe('TimeTravelPanel', () => {
  it('lists commits, shows the comparison and switches versions', async () => {
    act(() => useAppStore.getState().openedProject('cur', 'C:/code/app'));
    render(
      <>
        <TimeTravelPanel />
        <HistoryBanner />
      </>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /aaaaaaa.*first/ }));
    expect(await screen.findByText(/new,/)).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Changes per package' }).textContent).toContain('app');
    expect(screen.getByRole('list', { name: 'Removed since then' }).textContent).toContain('gone');

    fireEvent.click(screen.getByRole('button', { name: 'Show this version' }));
    expect(useAppStore.getState().projectId).toBe('old');
    expect((await screen.findByRole('status')).textContent).toContain('aaaaaaa');
    fireEvent.click(screen.getAllByRole('button', { name: 'Back to current' })[0]);
    expect(useAppStore.getState().projectId).toBe('cur');
    expect(screen.queryByRole('status')).toBeNull();
  }, 20000); // several screens and async steps: slow when the whole suite runs in parallel

  it('explains when the folder is not a Git repository', async () => {
    fake.invokeHandlers.set('pv:history.isRepo', () => false);
    act(() => useAppStore.getState().openedProject('cur', 'C:/code/app'));
    render(<TimeTravelPanel />);
    expect(await screen.findByText('Not a Git repository')).toBeTruthy();
  });
});
