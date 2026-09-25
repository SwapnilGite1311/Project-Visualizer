import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSetting, setSetting } from '../../api/main';
import { useAppStore } from '../../core/store';
import { startStateTracking, useComponentStates } from './states-store';

vi.mock('../../api/main', () => ({ getSetting: vi.fn(async () => ['class:a.py#A']), setSetting: vi.fn(async () => true) }));

let stop: () => void = () => undefined;
beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.getState().closedProject();
  useComponentStates.getState().reset();
  stop = startStateTracking();
});
afterEach(() => stop());

describe('component states', () => {
  it('marks selected elements as visited', () => {
    useAppStore.setState({ projectId: 'p1', projectRoot: 'C:/code/app' });
    useAppStore.getState().select('function:a.py#f');
    expect(useComponentStates.getState().visited.has('function:a.py#f')).toBe(true);
    expect(useAppStore.getState().overlays.visited.nodes['function:a.py#f']).toEqual({ borderColor: '#64748b' });
  });

  it('loads pins for a project and saves when toggled', async () => {
    useAppStore.getState().openedProject('p1', 'C:/code/app');
    await vi.waitFor(() => expect(useComponentStates.getState().pinned).toEqual(['class:a.py#A']));
    expect(getSetting).toHaveBeenCalledWith('project.pins.C:/code/app', []);
    useComponentStates.getState().togglePin('function:a.py#f');
    expect(setSetting).toHaveBeenCalledWith('project.pins.C:/code/app', ['class:a.py#A', 'function:a.py#f']);
    expect(useAppStore.getState().overlays.pinned.nodes['function:a.py#f']).toEqual({ badge: 'pin' });
    useComponentStates.getState().togglePin('class:a.py#A');
    expect(useComponentStates.getState().pinned).toEqual(['function:a.py#f']);
  });
});
