// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { FULL_TOUR } from './topics';
import { placeBubble, Tour } from './Tour';
import { TOUR_SEEN_KEY, useTourStore } from './tour-store';

beforeEach(() => {
  useTourStore.getState().stop();
  document.body.innerHTML = '';
});
afterEach(cleanup);

describe('tour bubble placement', () => {
  const view = { width: 1000, height: 700 };
  it('goes beside the target when there is room, else below, else inside; always on screen', () => {
    expect(placeBubble({ top: 50, left: 0, width: 80, height: 600 }, view)).toEqual({ left: 92, top: 50 }); // rail
    expect(placeBubble({ top: 40, left: 700, width: 300, height: 600 }, view).left).toBe(700 - 12 - 320); // right panel
    const inside = placeBubble({ top: 40, left: 0, width: 1000, height: 660 }, view); // the whole map
    expect(inside.left).toBeGreaterThanOrEqual(8);
    expect(inside.top + 170).toBeLessThanOrEqual(700 - 8);
    expect(inside.top).toBeGreaterThan(400); // low in the map, clear of the dashboard card
    expect(placeBubble({ top: 40, left: 400, width: 200, height: 30 }, { width: 500, height: 700 })).toEqual({ left: 68, top: 40 }); // left side
    const wide = placeBubble({ top: 40, left: 20, width: 460, height: 30 }, { width: 500, height: 700 });
    expect(wide.top).toBe(82); // no room at the sides: below
    expect(wide.left + 320).toBeLessThanOrEqual(500 - 8 + 1e-9);
  });
});

describe('guided tour', () => {
  it('walks through the steps with Next / Back / Skip and the keyboard', () => {
    const rail = document.createElement('nav');
    rail.setAttribute('aria-label', 'Dashboards');
    document.body.appendChild(rail);
    render(<Tour />);
    act(() => useTourStore.getState().start());
    expect(screen.getByRole('dialog', { name: 'Dashboards' })).toBeTruthy();
    expect(screen.getByText(`1 of ${FULL_TOUR.length}`)).toBeTruthy();
    expect(document.querySelector('.pv-tour style')?.textContent).toContain('.pv-intro-card'); // the card steps aside
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'The map of your project' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(useTourStore.getState().index).toBe(0);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(useTourStore.getState().index).toBe(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a single "Show me" step closes with Got it', () => {
    render(<Tour />);
    act(() => useTourStore.getState().start([{ target: '#nowhere', title: 'Search', text: 'Type here.' }]));
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(useTourStore.getState().steps).toEqual([]);
  });

  it('starts by itself only the first time a project is open', async () => {
    const saved = new Map<string, unknown>();
    const fake = installFakeBridge();
    fake.invokeHandlers.set('pv:settings.get', (p) => {
      const q = p as { key: string; fallback: unknown };
      return saved.has(q.key) ? saved.get(q.key) : q.fallback;
    });
    fake.invokeHandlers.set('pv:settings.set', (p) => void saved.set((p as { key: string }).key, (p as { value: unknown }).value));
    useAppStore.setState({ screen: 'workspace' });
    await useTourStore.getState().maybeStartFirstTime();
    expect(useTourStore.getState().steps).toHaveLength(FULL_TOUR.length);
    expect(saved.get(TOUR_SEEN_KEY)).toBe(true);
    useTourStore.getState().stop();
    await useTourStore.getState().maybeStartFirstTime();
    expect(useTourStore.getState().steps).toEqual([]);
  });
});
