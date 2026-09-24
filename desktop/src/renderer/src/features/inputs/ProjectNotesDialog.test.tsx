// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { ProjectNotesDialog } from './ProjectNotesDialog';
import { useInputsStore } from './inputs-store';

let fake: FakeBridge;
beforeEach(() => {
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:settings.get', () => 'old notes');
  fake.invokeHandlers.set('pv:settings.set', () => true);
  useAppStore.setState({ projectRoot: 'C:/code/app' });
  useInputsStore.setState({ snippetOpen: false, notesOpen: false });
});

describe('ProjectNotesDialog', () => {
  it('loads and saves the notes for the current root', async () => {
    render(<ProjectNotesDialog />);
    act(() => useInputsStore.getState().setNotesOpen(true));
    await waitFor(() => expect(screen.getByLabelText('Notes')).toHaveValue('old notes'));
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Flask API' } });
    expect(screen.getByText('9 / 2000')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(useInputsStore.getState().notesOpen).toBe(false));
    expect(fake.invokeCalls.find((c) => c.channel === 'pv:settings.set')?.payload).toEqual({
      key: 'project.notes.C:/code/app',
      value: 'Flask API',
    });
  });

  it('caps the notes at 2000 characters', async () => {
    render(<ProjectNotesDialog />);
    act(() => useInputsStore.getState().setNotesOpen(true));
    await waitFor(() => expect(screen.getByLabelText('Notes')).toHaveValue('old notes'));
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'x'.repeat(2500) } });
    expect(screen.getByText('2000 / 2000')).toBeInTheDocument();
  });
});
