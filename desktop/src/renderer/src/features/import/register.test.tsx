import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry';
import register from './register';

describe('import feature', () => {
  it('registers the welcome screen, commands, status item and watcher', () => {
    const r = createRegistry();
    register(r);
    expect(r.screen('welcome')).toBeDefined();
    expect(r.commands().map((c) => c.id)).toEqual(['project.close', 'project.open']);
    expect(r.commands().find((c) => c.id === 'project.open')?.shortcut).toBe('Ctrl+O');
    expect(r.statusItems().map((s) => s.id)).toEqual(['engine-status']);
    expect(r.globals().map((g) => g.id)).toEqual(['engine-restart-watcher']);
  });
});
