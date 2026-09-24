import type { CommandDef } from './registry';

export interface ParsedShortcut { ctrl: boolean; shift: boolean; alt: boolean; key: string }
export interface KeyLike { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; key: string }

export function parseShortcut(text: string): ParsedShortcut {
  const parsed: ParsedShortcut = { ctrl: false, shift: false, alt: false, key: '' };
  for (const part of text.split('+').map((p) => p.trim())) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'cmd' || lower === 'meta') parsed.ctrl = true;
    else if (lower === 'shift') parsed.shift = true;
    else if (lower === 'alt') parsed.alt = true;
    else parsed.key = lower;
  }
  return parsed;
}

export function matches(shortcut: string, e: KeyLike): boolean {
  const s = parseShortcut(shortcut);
  return (
    s.ctrl === (e.ctrlKey || e.metaKey) && s.shift === e.shiftKey && s.alt === e.altKey && s.key === e.key.toLowerCase()
  );
}

function isTextTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export function installShortcuts(getCommands: () => CommandDef[]): () => void {
  const listener = (e: KeyboardEvent) => {
    for (const command of getCommands()) {
      if (!command.shortcut || !matches(command.shortcut, e)) continue;
      const parsed = parseShortcut(command.shortcut);
      if (isTextTarget(e.target) && !parsed.ctrl && parsed.key !== 'escape') return;
      e.preventDefault();
      void command.run();
      return;
    }
  };
  window.addEventListener('keydown', listener);
  return () => window.removeEventListener('keydown', listener);
}
