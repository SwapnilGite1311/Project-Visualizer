import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAncestors } from '../api/engine';
import { useAppStore } from '../core/store';
import { revealNode } from './reveal';
import { gnode } from './test-data';

vi.mock('../api/engine', () => ({ getAncestors: vi.fn() }));
const mocked = vi.mocked(getAncestors);

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
});

describe('revealNode', () => {
  it('opens the parent level and selects the node', async () => {
    mocked.mockResolvedValue([
      gnode('project:', 'project'),
      gnode('package:app', 'package'),
      gnode('module:app/models.py', 'module'),
      gnode('class:app/models.py#User', 'class'),
    ]);
    await revealNode('class:app/models.py#User');
    expect(useAppStore.getState().currentParentId).toBe('module:app/models.py');
    expect(useAppStore.getState().selectedNodeId).toBe('class:app/models.py#User');
  });

  it('uses the project level for top-level nodes', async () => {
    mocked.mockResolvedValue([gnode('project:', 'project'), gnode('module:main.py', 'module')]);
    await revealNode('module:main.py');
    expect(useAppStore.getState().currentParentId).toBe('project:');
    expect(useAppStore.getState().selectedNodeId).toBe('module:main.py');
  });
});
