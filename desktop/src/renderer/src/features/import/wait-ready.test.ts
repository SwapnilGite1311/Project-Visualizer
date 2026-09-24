// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectStatus } from '../../api/engine';
import { installFakeBridge, type FakeBridge } from '../../api/fake-bridge';
import type { ProjectStatus } from '../../api/types';
import { waitForReady } from './wait-ready';

vi.mock('../../api/engine', () => ({ projectStatus: vi.fn() }));
const status = (state: ProjectStatus['state'], error_message = ''): ProjectStatus => ({
  project_id: 'p1',
  root_path: 'C:/x',
  state,
  files_total: 8,
  files_done: 3,
  error_message,
});

let fake: FakeBridge;
beforeEach(() => {
  vi.useFakeTimers();
  fake = installFakeBridge();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('waitForReady', () => {
  it('reports progress and resolves when ready', async () => {
    const mocked = vi.mocked(projectStatus).mockResolvedValue(status('parsing'));
    const onProgress = vi.fn();
    const promise = waitForReady('p1', onProgress);
    await vi.advanceTimersByTimeAsync(0);
    fake.emitNotification('project.progress', { project_id: 'other', state: 'parsing', files_total: 1, files_done: 0 });
    fake.emitNotification('project.progress', { project_id: 'p1', state: 'parsing', files_total: 8, files_done: 3 });
    expect(onProgress).toHaveBeenCalledTimes(1);
    mocked.mockResolvedValue(status('ready'));
    fake.emitNotification('project.progress', { project_id: 'p1', state: 'ready', files_total: 8, files_done: 8 });
    await expect(promise).resolves.toMatchObject({ state: 'ready' });
  });

  it('rejects when loading fails', async () => {
    vi.mocked(projectStatus).mockResolvedValue(status('error', 'folder not found: C:/x'));
    const promise = waitForReady('p1', () => undefined);
    const assertion = expect(promise).rejects.toThrow('folder not found: C:/x');
    await vi.advanceTimersByTimeAsync(0);
    await assertion;
  });

  it('times out', async () => {
    vi.mocked(projectStatus).mockResolvedValue(status('parsing'));
    const promise = waitForReady('p1', () => undefined, 5000);
    const assertion = expect(promise).rejects.toThrow('Loading timed out');
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
  });
});
