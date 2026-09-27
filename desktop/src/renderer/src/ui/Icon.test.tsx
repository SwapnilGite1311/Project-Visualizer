// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ICON_NAMES, Icon } from './Icon';

afterEach(cleanup);

describe('Icon', () => {
  it('renders every icon as an svg, hidden from screen readers unless titled', () => {
    for (const name of ICON_NAMES) {
      const { container } = render(<Icon name={name} />);
      const svg = container.querySelector('svg')!;
      expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      cleanup();
    }
    render(<Icon name="map" title="Map" />);
    expect(screen.getByRole('img', { name: 'Map' })).toBeTruthy();
  });

  it('falls back to the help icon for an unknown name', () => {
    const { container } = render(<Icon name="nope" />);
    expect(container.querySelectorAll('path').length).toBe(3);
  });
});
