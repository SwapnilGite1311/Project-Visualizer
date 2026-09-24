import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './store';

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
});

describe('useAppStore', () => {
  it('starts on the welcome screen', () => {
    const s = useAppStore.getState();
    expect(s.screen).toBe('welcome');
    expect(s.currentParentId).toBe('project:');
    expect(s.viewMode).toBe('2d');
  });

  it('openedProject switches to the workspace and resets navigation', () => {
    const s = useAppStore.getState();
    s.select('x');
    s.setOverlay('impact', { priority: 1, nodes: {}, edges: {} });
    s.openedProject('p1', 'C:/code/demo');
    const after = useAppStore.getState();
    expect(after.screen).toBe('workspace');
    expect(after.projectId).toBe('p1');
    expect(after.projectRoot).toBe('C:/code/demo');
    expect(after.selectedNodeId).toBeNull();
    expect(after.overlays).toEqual({});
    expect(after.graphVersion).toBe(1);
  });

  it('adds and removes overlays', () => {
    const s = useAppStore.getState();
    s.setOverlay('impact', { priority: 1, nodes: { a: { color: 'red' } }, edges: {} });
    expect(Object.keys(useAppStore.getState().overlays)).toEqual(['impact']);
    s.setOverlay('impact', null);
    expect(useAppStore.getState().overlays).toEqual({});
  });

  it('setParent clears the selection', () => {
    const s = useAppStore.getState();
    s.select('module:a.py');
    s.setParent('package:app');
    expect(useAppStore.getState().currentParentId).toBe('package:app');
    expect(useAppStore.getState().selectedNodeId).toBeNull();
  });

  it('shows a panel in an area and closedProject keeps the view mode', () => {
    const s = useAppStore.getState();
    s.showPanel('bottom', 'impact');
    expect(useAppStore.getState().activePanel.bottom).toBe('impact');
    s.setViewMode('3d');
    s.openedProject('p1', 'C:/x');
    s.closedProject();
    expect(useAppStore.getState().screen).toBe('welcome');
    expect(useAppStore.getState().viewMode).toBe('3d');
  });
});
