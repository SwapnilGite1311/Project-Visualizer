// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { openProjectFlow } from '../import/open-project';
import { openSampleProject } from './sample';
import { useTourStore } from './tour-store';

vi.mock('../import/open-project', () => ({ openProjectFlow: vi.fn(async () => true) }));

beforeEach(() => {
  const data = new Map<string, string>(); // Node's own localStorage stub does not work in tests
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
  useAppStore.setState({ ...useAppStore.getInitialState(), workspace: 'all' });
  useTourStore.getState().stop();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('sample project', () => {
  it('creates a fresh copy, opens it on Explore and starts the tour', async () => {
    const fake = installFakeBridge();
    fake.invokeHandlers.set('pv:sample.create', () => ({ root_path: 'C:/ud/sample-project' }));
    expect(await openSampleProject()).toBe(true);
    expect(openProjectFlow).toHaveBeenCalledWith('C:/ud/sample-project');
    expect(useAppStore.getState().workspace).toBe('explore');
    vi.advanceTimersByTime(700);
    expect(useTourStore.getState().steps.length).toBeGreaterThan(1);
  });

  it('does nothing more when the project could not be opened', async () => {
    vi.mocked(openProjectFlow).mockResolvedValueOnce(false);
    const fake = installFakeBridge();
    fake.invokeHandlers.set('pv:sample.create', () => ({ root_path: 'C:/ud/sample-project' }));
    expect(await openSampleProject()).toBe(false);
    expect(useAppStore.getState().workspace).toBe('all');
  });
});
