// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../core/store';
import { HelpButton } from './HelpButton';
import { HelpDialog } from './HelpDialog';
import { searchTopics, TOPICS } from './topics';
import { useHelpStore, useTourStore } from './tour-store';

beforeEach(() => {
  const data = new Map<string, string>(); // Node's own localStorage stub does not work in tests
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
  useHelpStore.setState({ open: false, topic: null });
  useTourStore.getState().stop();
  useAppStore.setState({ ...useAppStore.getInitialState(), screen: 'workspace', projectId: 'p1', workspace: 'explore' });
});
afterEach(cleanup);

describe('help topics', () => {
  it('are all written as tasks with steps', () => {
    for (const t of TOPICS) {
      expect(t.steps.length).toBeGreaterThanOrEqual(2);
      expect(t.title).not.toMatch(/fan-in|module|package/i);
    }
  });

  it('can be searched by everyday words', () => {
    expect(searchTopics('traceback').map((t) => t.id)).toEqual(['errors']);
    expect(searchTopics('').length).toBe(TOPICS.length);
    expect(searchTopics('zzz')).toEqual([]);
  });
});

describe('help dialog', () => {
  it('opens from the ? button, filters, shows steps and "Show me" moves to the right place', () => {
    vi.useFakeTimers();
    render(
      <>
        <HelpButton />
        <HelpDialog />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Help (F1)' }));
    expect(screen.getByRole('dialog', { name: 'Help — how do I…' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search help'), { target: { value: 'simulate' } });
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Try a change without risk']);
    fireEvent.click(screen.getByText('Try a change without risk'));
    expect(screen.getByRole('article', { name: 'Try a change without risk' }).querySelectorAll('li')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
    expect(useAppStore.getState().workspace).toBe('whatif');
    act(() => void vi.advanceTimersByTime(200));
    expect(useTourStore.getState().steps).toHaveLength(1);
    expect(useTourStore.getState().steps[0].target).toBe('[data-area="bottom"]');
    vi.useRealTimers();
  });

  it('opens a topic directly (for the dashboard cards) and asks for a project before "Show me"', () => {
    useAppStore.setState({ screen: 'welcome', projectId: null });
    render(<HelpDialog />);
    act(() => useHelpStore.getState().show('watch'));
    expect(screen.getByRole('article', { name: 'Watch my program run' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Show me' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Open a project \(or the sample\) first/)).toBeTruthy();
  });
});
