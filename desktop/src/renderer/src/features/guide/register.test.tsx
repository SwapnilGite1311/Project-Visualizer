// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import register from './register';
import { useHelpStore } from './tour-store';

describe('guide feature', () => {
  it('registers the help button, dialogs, F1, topic commands and the sample project', () => {
    const r = createRegistry();
    register(r);
    expect(r.toolbarItems('right').map((t) => t.id)).toEqual(['help-button']);
    expect(r.globals().map((g) => g.id).sort()).toEqual(['first-run-tour', 'help-dialog', 'tour']);
    const help = r.commands().find((c) => c.id === 'help.open');
    expect(help?.shortcut).toBe('F1');
    expect(r.commands().some((c) => c.id === 'help.watch')).toBe(true);
    expect(r.commands().some((c) => c.id === 'help.change')).toBe(true);
    void r.commands().find((c) => c.id === 'help.watch')!.run();
    expect(useHelpStore.getState()).toMatchObject({ open: true, topic: 'watch' });
    expect(r.welcomeActions()).toEqual([expect.objectContaining({ id: 'sample-project', title: 'Try a sample project', order: 5 })]);
  });
});
