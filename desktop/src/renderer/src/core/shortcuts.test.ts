// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { installShortcuts, matches, parseShortcut } from './shortcuts';

const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) => ({
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  key: k,
  ...mods,
});

describe('shortcuts', () => {
  it('parses shortcut text', () => {
    expect(parseShortcut('Ctrl+Shift+F')).toEqual({ ctrl: true, shift: true, alt: false, key: 'f' });
    expect(parseShortcut('Alt+ArrowLeft')).toEqual({ ctrl: false, shift: false, alt: true, key: 'arrowleft' });
    expect(parseShortcut('Escape')).toEqual({ ctrl: false, shift: false, alt: false, key: 'escape' });
    expect(parseShortcut('Cmd+K').ctrl).toBe(true);
  });

  it('matches key events', () => {
    expect(matches('Ctrl+K', key('k', { ctrlKey: true }))).toBe(true);
    expect(matches('Ctrl+K', key('K', { metaKey: true }))).toBe(true);
    expect(matches('Ctrl+K', key('k'))).toBe(false);
    expect(matches('Escape', key('Escape'))).toBe(true);
    expect(matches('Escape', key('Escape', { shiftKey: true }))).toBe(false);
  });

  it('runs the matching command on keydown', () => {
    const run = vi.fn();
    const uninstall = installShortcuts(() => [{ id: 'up', title: 'Up', shortcut: 'Alt+ArrowUp', run }]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }));
    expect(run).toHaveBeenCalledTimes(1);
    uninstall();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('ignores plain keys typed into inputs', () => {
    const run = vi.fn();
    const uninstall = installShortcuts(() => [{ id: 'f', title: 'F', shortcut: 'F', run }]);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    expect(run).not.toHaveBeenCalled();
    uninstall();
  });
});
