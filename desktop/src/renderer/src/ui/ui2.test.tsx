// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';
import { ProgressBar } from './ProgressBar';
import { Select } from './Select';
import { Spinner } from './Spinner';
import { TextInput } from './TextInput';

describe('UI kit part 2', () => {
  it('TextInput is labelled and reports changes', () => {
    const onChange = vi.fn();
    render(<TextInput label="API key" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'sk-1' } });
    expect(onChange).toHaveBeenCalledWith('sk-1');
  });

  it('Select reports changes', () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Provider"
        value="a"
        options={[
          { value: 'a', label: 'Anthropic' },
          { value: 'o', label: 'OpenAI' },
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'o' } });
    expect(onChange).toHaveBeenCalledWith('o');
  });

  it('Modal closes on Escape and on backdrop click', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Settings" onClose={onClose}>
        inside
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.mouseDown(screen.getByText('inside'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ProgressBar exposes aria values', () => {
    render(<ProgressBar value={3} max={8} label="Parsing" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '8');
  });

  it('Spinner, Badge and EmptyState render', () => {
    render(
      <div>
        <Spinner />
        <Badge tone="danger">high</Badge>
        <EmptyState title="Nothing here" detail="Open a project" />
      </div>,
    );
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('Open a project')).toBeInTheDocument();
  });
});
