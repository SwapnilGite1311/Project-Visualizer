// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRegistry } from '../../core/registry';
import { useImportStore } from './import-store';
import { openFolderFlow, openProjectFlow } from './open-project';
import { getRecentProjects } from './recent-projects';
import { WelcomeScreen } from './WelcomeScreen';

vi.mock('./open-project', () => ({ openFolderFlow: vi.fn(async () => true), openProjectFlow: vi.fn(async () => true) }));
vi.mock('./recent-projects', () => ({ getRecentProjects: vi.fn(), removeRecentProject: vi.fn(async () => undefined) }));

beforeEach(() => {
  vi.clearAllMocks();
  useImportStore.setState({ loading: false, root: null, progress: null, error: null });
  vi.mocked(getRecentProjects).mockResolvedValue(['C:/code/demo', 'C:/code/shop']);
});

describe('WelcomeScreen', () => {
  it('lists recent projects and opens one', async () => {
    render(<WelcomeScreen registry={createRegistry()} />);
    expect(await screen.findByText('demo')).toBeInTheDocument();
    expect(screen.getByText('C:/code/shop')).toBeInTheDocument();
    fireEvent.click(screen.getByText('demo'));
    expect(openProjectFlow).toHaveBeenCalledWith('C:/code/demo');
  });

  it('opens the folder dialog', () => {
    render(<WelcomeScreen registry={createRegistry()} />);
    fireEvent.click(screen.getByText('Open folder…'));
    expect(openFolderFlow).toHaveBeenCalled();
  });

  it('shows welcome actions from the registry', () => {
    const r = createRegistry();
    const run = vi.fn();
    r.addWelcomeAction({ id: 'git', title: 'Import from Git', description: 'Clone a repository', order: 1, run });
    render(<WelcomeScreen registry={r} />);
    fireEvent.click(screen.getByText('Import from Git'));
    expect(run).toHaveBeenCalled();
    expect(screen.getByText('Clone a repository')).toBeInTheDocument();
  });
});
