// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLevelView } from '../api/engine';
import { useAppStore } from '../core/store';
import { Canvas } from './Canvas';
import type { ViewGraph } from './model';
import type { GraphRenderer, RendererEvent, RendererEventPayload } from './renderer-types';
import { gnode, levelView } from './test-data';

vi.mock('../api/engine', () => ({ getLevelView: vi.fn() }));
const mocked = vi.mocked(getLevelView);

class FakeRenderer implements GraphRenderer {
  calls: string[] = [];
  graphs: ViewGraph[] = [];
  selected: string | null = null;
  listeners = new Map<RendererEvent, (p: RendererEventPayload) => void>();
  mount() {
    this.calls.push('mount');
  }
  setGraph(g: ViewGraph) {
    this.calls.push('setGraph');
    this.graphs.push(g);
  }
  updateStyles(g: ViewGraph) {
    this.calls.push('updateStyles');
    this.graphs.push(g);
  }
  select(id: string | null) {
    this.selected = id;
  }
  fit() {
    this.calls.push('fit');
  }
  on(event: RendererEvent, cb: (p: RendererEventPayload) => void) {
    this.listeners.set(event, cb);
    return () => this.listeners.delete(event);
  }
  destroy() {
    this.calls.push('destroy');
  }
  emit(event: RendererEvent, nodeId: string | null) {
    this.listeners.get(event)?.({ nodeId, x: 5, y: 5 });
  }
}

let renderer: FakeRenderer;

beforeEach(() => {
  renderer = new FakeRenderer();
  mocked.mockReset();
  mocked.mockResolvedValue(levelView([gnode('class:a.py#A', 'class'), gnode('external:os', 'external')]));
  useAppStore.setState(useAppStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
});

describe('Canvas', () => {
  it('draws the level after loading and updates styles for overlays', async () => {
    render(<Canvas rendererFactory={() => renderer} />);
    await waitFor(() => expect(renderer.calls).toContain('setGraph'));
    expect(renderer.graphs[0].nodes.map((n) => n.id)).toEqual(['class:a.py#A', 'external:os']);
    act(() => useAppStore.getState().setOverlay('impact', { priority: 1, nodes: { 'external:os': { color: 'red' } }, edges: {} }));
    expect(renderer.calls[renderer.calls.length - 1]).toBe('updateStyles');
    expect(renderer.graphs[renderer.graphs.length - 1].nodes[1].color).toBe('red');
  });

  it('drills into containers on double-click and clears selection on background click', async () => {
    render(<Canvas rendererFactory={() => renderer} />);
    await waitFor(() => expect(renderer.calls).toContain('setGraph'));
    act(() => renderer.emit('nodeClick', 'class:a.py#A'));
    expect(useAppStore.getState().selectedNodeId).toBe('class:a.py#A');
    expect(renderer.selected).toBe('class:a.py#A');
    act(() => renderer.emit('nodeDoubleClick', 'external:os'));
    expect(useAppStore.getState().currentParentId).toBe('project:');
    act(() => renderer.emit('nodeDoubleClick', 'class:a.py#A'));
    expect(useAppStore.getState().currentParentId).toBe('class:a.py#A');
    act(() => renderer.emit('backgroundClick', null));
    expect(useAppStore.getState().selectedNodeId).toBeNull();
  });

  it('shows an empty state with Go up for empty levels', async () => {
    mocked.mockResolvedValue(levelView([], [], gnode('class:a.py#A', 'class', 10, 'module:a.py')));
    render(<Canvas rendererFactory={() => renderer} />);
    expect(await screen.findByText('Nothing inside this element')).toBeInTheDocument();
    act(() => screen.getByText('Go up').click());
    expect(useAppStore.getState().currentParentId).toBe('module:a.py');
  });

  it('explains when no renderer exists', () => {
    render(<Canvas rendererFactory={() => undefined} />);
    expect(screen.getByText('No renderer available for 2d')).toBeInTheDocument();
  });
});
