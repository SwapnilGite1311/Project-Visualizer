import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import { useGitStore } from './git-store';
import register from './register';

describe('git import feature', () => {
  it('adds a welcome action, a command and the dialog', () => {
    const r = createRegistry();
    register(r);
    expect(r.welcomeActions().map((a) => a.id)).toEqual(['git-import']);
    expect(r.commands().map((c) => c.id)).toEqual(['project.importGit']);
    expect(r.globals().map((g) => g.id)).toEqual(['git-import-dialog']);
    void r.welcomeActions()[0].run();
    expect(useGitStore.getState().open).toBe(true);
  });
});
