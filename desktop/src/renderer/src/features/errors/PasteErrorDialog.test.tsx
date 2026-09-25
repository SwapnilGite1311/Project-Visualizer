// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useErrorsStore } from './errors-store';
import { PasteErrorDialog } from './PasteErrorDialog';
import { entry, frame, PASTED_TEXT } from './test-data';

const paste = vi.fn();
beforeEach(() => {
  paste.mockReset();
  useErrorsStore.setState({ paste });
});

async function submit(text: string) {
  const onClose = vi.fn();
  render(<PasteErrorDialog onClose={onClose} />);
  const find = screen.getByRole('button', { name: 'Find on map' }) as HTMLButtonElement;
  expect(find.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Stack trace'), { target: { value: text } });
  await act(async () => {
    fireEvent.click(find);
  });
  return onClose;
}

describe('PasteErrorDialog', () => {
  it('maps the pasted text and closes', async () => {
    paste.mockResolvedValue(entry('p1', { source: 'pasted' }));
    const onClose = await submit(PASTED_TEXT);
    expect(paste).toHaveBeenCalledWith(PASTED_TEXT);
    expect(onClose).toHaveBeenCalled();
  });

  it('says so when no line is in the project', async () => {
    paste.mockResolvedValue(entry('p2', { frames: [frame(''), frame('')] }));
    const onClose = await submit(
      'Traceback ...\n  File "/usr/lib/python3/x.py", line 1\nValueError: x',
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'None of these lines are in the open project.',
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows engine errors', async () => {
    paste.mockRejectedValue(new Error('engine not running'));
    await submit('x');
    expect(screen.getByRole('alert').textContent).toBe('engine not running');
  });
});
