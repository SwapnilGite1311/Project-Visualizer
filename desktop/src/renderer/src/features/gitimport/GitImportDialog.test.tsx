// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { openProjectFlow } from '../import/open-project';
import { GitImportDialog } from './GitImportDialog';
import { useGitStore } from './git-store';

vi.mock('../import/open-project', () => ({ openProjectFlow: vi.fn(async () => true) }));

let fake: FakeBridge;
beforeEach(() => {
  vi.clearAllMocks();
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:git.available', () => true);
  useGitStore.setState({ open: false, cloning: false, error: null });
});

describe('GitImportDialog', () => {
  it('clones then opens the project', async () => {
    fake.invokeHandlers.set('pv:git.clone', () => ({ root_path: 'C:/repos/flask' }));
    render(<GitImportDialog />);
    act(() => useGitStore.getState().setOpen(true));
    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: 'https://github.com/pallets/flask' } });
    fireEvent.click(screen.getByText('Clone and open'));
    await waitFor(() => expect(openProjectFlow).toHaveBeenCalledWith('C:/repos/flask'));
    expect(fake.invokeCalls.find((c) => c.channel === 'pv:git.clone')?.payload).toEqual({
      url: 'https://github.com/pallets/flask',
      branch: undefined,
    });
    expect(useGitStore.getState().open).toBe(false);
  });

  it('shows clone errors inside the dialog', async () => {
    fake.invokeHandlers.set('pv:git.clone', () => {
      throw new Error('git clone failed: repository not found');
    });
    render(<GitImportDialog />);
    act(() => useGitStore.getState().setOpen(true));
    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: 'https://github.com/x/y' } });
    fireEvent.click(screen.getByText('Clone and open'));
    expect(await screen.findByText('git clone failed: repository not found')).toBeInTheDocument();
    expect(openProjectFlow).not.toHaveBeenCalled();
  });

  it('warns when Git is missing', async () => {
    fake.invokeHandlers.set('pv:git.available', () => false);
    render(<GitImportDialog />);
    act(() => useGitStore.getState().setOpen(true));
    expect(await screen.findByText('Git is not installed. Install Git and restart the app.')).toBeInTheDocument();
  });
});
