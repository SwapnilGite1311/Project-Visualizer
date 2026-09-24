// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Panel } from './Panel';
import { Tabs } from './Tabs';

describe('UI kit part 1', () => {
  it('Button fires onClick unless disabled', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByText('Go'));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByText('Go'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('IconButton has an accessible label', () => {
    render(
      <IconButton label="Close" onClick={() => undefined}>
        x
      </IconButton>,
    );
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('Panel shows title and body', () => {
    render(<Panel title="Inspector">body text</Panel>);
    expect(screen.getByText('Inspector')).toBeInTheDocument();
    expect(screen.getByText('body text')).toBeInTheDocument();
  });

  it('Tabs marks the active tab and moves with arrow keys', () => {
    const onChange = vi.fn();
    render(
      <Tabs
        tabs={[
          { id: 'a', title: 'A' },
          { id: 'b', title: 'B' },
        ]}
        active="a"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'false');
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
