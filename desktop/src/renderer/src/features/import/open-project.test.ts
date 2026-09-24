import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openProject } from '../../api/engine';
import { getSetting, openFolderDialog } from '../../api/main';
import { useToasts } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { useImportStore } from './import-store';
import { openFolderFlow, openProjectFlow } from './open-project';
import { addRecentProject } from './recent-projects';
import { waitForReady } from './wait-ready';

vi.mock('../../api/engine', () => ({ openProject: vi.fn() }));
vi.mock('../../api/main', () => ({ getSetting: vi.fn(), openFolderDialog: vi.fn() }));
vi.mock('./wait-ready', () => ({ waitForReady: vi.fn() }));
vi.mock('./recent-projects', () => ({ addRecentProject: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState(useAppStore.getInitialState());
  useToasts.setState({ items: [] });
  vi.mocked(getSetting).mockResolvedValue(['tests/**'] as never);
});

describe('openProjectFlow', () => {
  it('opens, waits and switches to the workspace', async () => {
    vi.mocked(openProject).mockResolvedValue('p1');
    vi.mocked(waitForReady).mockImplementation(async (_id, onProgress) => {
      onProgress({ project_id: 'p1', state: 'parsing', files_total: 8, files_done: 4 });
      return { project_id: 'p1', root_path: 'C:/x', state: 'ready', files_total: 8, files_done: 8, error_message: '' };
    });
    await expect(openProjectFlow('C:/x')).resolves.toBe(true);
    expect(openProject).toHaveBeenCalledWith('C:/x', ['tests/**']);
    expect(useAppStore.getState().screen).toBe('workspace');
    expect(useAppStore.getState().projectId).toBe('p1');
    expect(useAppStore.getState().projectState).toBe('ready');
    expect(useImportStore.getState().loading).toBe(false);
    expect(addRecentProject).toHaveBeenCalledWith('C:/x');
  });

  it('shows an error and returns false on failure', async () => {
    vi.mocked(openProject).mockRejectedValue(new Error('folder not found: C:/x'));
    await expect(openProjectFlow('C:/x')).resolves.toBe(false);
    expect(useToasts.getState().items[0]).toMatchObject({ kind: 'error', title: 'Could not open project' });
    expect(useImportStore.getState().error).toBe('folder not found: C:/x');
    expect(useAppStore.getState().projectState).toBe('error');
  });
});

describe('openFolderFlow', () => {
  it('does nothing when the dialog is cancelled', async () => {
    vi.mocked(openFolderDialog).mockResolvedValue(null);
    await expect(openFolderFlow()).resolves.toBe(false);
    expect(openProject).not.toHaveBeenCalled();
  });
});
