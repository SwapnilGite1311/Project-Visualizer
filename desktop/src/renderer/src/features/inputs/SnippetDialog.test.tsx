// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { openProjectFlow } from '../import/open-project';
import { SnippetDialog } from './SnippetDialog';
import { useInputsStore } from './inputs-store';

vi.mock('../import/open-project', () => ({ openProjectFlow: vi.fn(async () => true) }));

let fake: FakeBridge;
beforeEach(() => {
  vi.clearAllMocks();
  fake = installFakeBridge();
  useInputsStore.setState({ snippetOpen: false, notesOpen: false });
});

describe('SnippetDialog', () => {
  it('creates a snippet project and opens it', async () => {
    fake.invokeHandlers.set('pv:snippet.create', () => ({ root_path: 'C:/snippets/snippet-1' }));
    render(<SnippetDialog />);
    act(() => useInputsStore.getState().setSnippetOpen(true));
    expect(screen.getByText('Visualize')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'x = 1\n' } });
    fireEvent.click(screen.getByText('Visualize'));
    await waitFor(() => expect(openProjectFlow).toHaveBeenCalledWith('C:/snippets/snippet-1'));
    expect(fake.invokeCalls[0]).toEqual({ channel: 'pv:snippet.create', payload: { code: 'x = 1\n', file_name: 'snippet.py' } });
    expect(useInputsStore.getState().snippetOpen).toBe(false);
  });
});
