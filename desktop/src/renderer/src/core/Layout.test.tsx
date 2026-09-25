// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';
import { sizeVariables, usePanelSizes } from './panel-sizes';
import { createRegistry } from './registry';
import { useAppStore } from './store';

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
  usePanelSizes.setState({ sizes: { left: null, right: null, bottom: null } });
  const data = new Map<string, string>(); // Node's own localStorage stub does not work in tests
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  });
});

describe('Layout', () => {
  it('shows tabs for several panels and switches between them', () => {
    const r = createRegistry();
    r.addPanel({
      id: 'inspector',
      title: 'Inspector',
      area: 'right',
      order: 1,
      component: () => <div>inspector body</div>,
    });
    r.addPanel({
      id: 'insights',
      title: 'Insights',
      area: 'right',
      order: 2,
      component: () => <div>insights body</div>,
    });
    r.addStatusItem({ id: 'engine', order: 1, component: () => <span>engine ready</span> });
    const { container } = render(<Layout registry={r} />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByText('inspector body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Insights' }));
    expect(screen.getByText('insights body')).toBeInTheDocument();
    expect(screen.getByText('engine ready')).toBeInTheDocument();
    expect(container.querySelector('[data-area="bottom"]')).toBeNull();
  });

  it('renders the bottom area when it has panels', () => {
    const r = createRegistry();
    r.addPanel({
      id: 'impact',
      title: 'Impact',
      area: 'bottom',
      order: 1,
      component: () => <div>impact body</div>,
    });
    const { container } = render(<Layout registry={r} />);
    expect(container.querySelector('[data-area="bottom"]')).not.toBeNull();
    expect(screen.getByText('impact body')).toBeInTheDocument();
  });

  it('lets the user resize the side and bottom panels, and remembers it', () => {
    const r = createRegistry();
    for (const area of ['left', 'right', 'bottom'] as const) {
      r.addPanel({
        id: area,
        title: area,
        area,
        order: 1,
        component: () => <div>{area} body</div>,
      });
    }
    const { container } = render(<Layout registry={r} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--left-w')).toBe(''); // follows the window by default
    const left = screen.getByRole('separator', { name: 'Resize left panel' });
    fireEvent.keyDown(left, { key: 'ArrowRight' }); // jsdom has no layout: grows from 0 to the minimum
    expect(usePanelSizes.getState().sizes.left).toBe(160);
    fireEvent.keyDown(left, { key: 'ArrowRight' });
    expect(usePanelSizes.getState().sizes.left).toBe(176);
    expect(root.style.getPropertyValue('--left-w')).toBe('min(176px, 35vw)');
    fireEvent.keyDown(screen.getByRole('separator', { name: 'Resize bottom panel' }), {
      key: 'ArrowUp',
    });
    expect(usePanelSizes.getState().sizes.bottom).toBe(90);
    expect(JSON.parse(localStorage.getItem('pv.layout.panelSizes')!)).toEqual({
      left: 176,
      right: null,
      bottom: 90,
    });
    fireEvent.doubleClick(left);
    expect(usePanelSizes.getState().sizes.left).toBeNull();
    expect(root.style.getPropertyValue('--left-w')).toBe('');
    expect(screen.getByRole('separator', { name: 'Resize right panel' })).toBeInTheDocument();
  });

  it('caps dragged sizes to a share of the window', () => {
    expect(sizeVariables({ left: 300, right: 500, bottom: 400 })).toEqual({
      '--left-w': 'min(300px, 35vw)',
      '--right-w': 'min(500px, 40vw)',
      '--bottom-h': 'min(400px, 55vh)',
    });
    usePanelSizes.getState().setSize('right', 5000);
    expect(usePanelSizes.getState().sizes.right).toBe(800);
  });
});
