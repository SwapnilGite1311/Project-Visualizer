// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import register from './register';

describe('settings feature', () => {
  it('registers sections, modal, toolbar button and command', () => {
    installFakeBridge();
    const r = createRegistry();
    register(r);
    expect(r.settingsSections().map((s) => s.id)).toEqual(['ai', 'general']);
    expect(r.globals().map((g) => g.id)).toEqual(['settings-modal']);
    expect(r.toolbarItems('right').map((t) => t.id)).toEqual(['settings-button']);
    expect(r.commands().map((c) => [c.id, c.shortcut])).toEqual([['settings.open', 'Ctrl+,']]);
  });
});
