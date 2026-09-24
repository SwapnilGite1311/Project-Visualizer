// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Layout } from './Layout';
import { createRegistry } from './registry';
import { useAppStore } from './store';

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState());
});

describe('Layout', () => {
  it('shows tabs for several panels and switches between them', () => {
    const r = createRegistry();
    r.addPanel({ id: 'inspector', title: 'Inspector', area: 'right', order: 1, component: () => <div>inspector body</div> });
    r.addPanel({ id: 'insights', title: 'Insights', area: 'right', order: 2, component: () => <div>insights body</div> });
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
    r.addPanel({ id: 'impact', title: 'Impact', area: 'bottom', order: 1, component: () => <div>impact body</div> });
    const { container } = render(<Layout registry={r} />);
    expect(container.querySelector('[data-area="bottom"]')).not.toBeNull();
    expect(screen.getByText('impact body')).toBeInTheDocument();
  });
});
