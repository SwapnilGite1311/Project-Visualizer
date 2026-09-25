// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InsideView2D } from './InsideView2D';
import { getUserBody } from './test-data';

describe('InsideView2D', () => {
  it('draws one group per statement and marks the running one', () => {
    const { container, rerender } = render(<InsideView2D body={getUserBody} activeBlockId="b1" />);
    const groups = container.querySelectorAll('[data-block-id]');
    expect(groups).toHaveLength(4);
    expect(container.querySelector('[aria-current="step"]')?.getAttribute('data-block-id')).toBe('b1');
    expect(screen.getByText('→ is_valid')).toBeInTheDocument();
    const before = screen.getByTestId('runner').style.transform;

    rerender(<InsideView2D body={getUserBody} activeBlockId="b3" returned="'alice'" />);
    expect(container.querySelector('[aria-current="step"]')?.getAttribute('data-block-id')).toBe('b3');
    expect(screen.getByTestId('runner').style.transform).not.toBe(before);
    expect(screen.getByText('→ normalize')).toBeInTheDocument();
    expect(screen.getByText("⟵ 'alice'")).toBeInTheDocument();
  });

  it('has no runner when no statement is running', () => {
    render(<InsideView2D body={getUserBody} activeBlockId={null} />);
    expect(screen.queryByTestId('runner')).toBeNull();
  });
});
