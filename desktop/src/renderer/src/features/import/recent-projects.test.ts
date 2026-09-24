import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSetting, setSetting } from '../../api/main';
import { addRecentProject, getRecentProjects, removeRecentProject } from './recent-projects';

vi.mock('../../api/main', () => ({ getSetting: vi.fn(), setSetting: vi.fn() }));
let stored: string[] = [];

beforeEach(() => {
  stored = [];
  vi.mocked(getSetting).mockImplementation(async () => stored as never);
  vi.mocked(setSetting).mockImplementation(async (_k, v) => {
    stored = v as string[];
    return true;
  });
});

describe('recent projects', () => {
  it('puts the newest first without duplicates', async () => {
    await addRecentProject('C:/a');
    await addRecentProject('C:/b');
    await addRecentProject('C:/a');
    await expect(getRecentProjects()).resolves.toEqual(['C:/a', 'C:/b']);
  });

  it('keeps at most 10 entries and removes on request', async () => {
    for (let i = 0; i < 12; i++) await addRecentProject(`C:/p${i}`);
    expect(stored).toHaveLength(10);
    expect(stored[0]).toBe('C:/p11');
    await removeRecentProject('C:/p11');
    expect(stored[0]).toBe('C:/p10');
  });
});
