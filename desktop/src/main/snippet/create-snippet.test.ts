import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSnippetProject, sanitizeFileName } from './create-snippet';

describe('snippets', () => {
  it('sanitizes file names', () => {
    expect(sanitizeFileName('my script')).toBe('myscript.py');
    expect(sanitizeFileName('../../evil.py')).toBe('....evil.py');
    expect(sanitizeFileName('')).toBe('snippet.py');
    expect(sanitizeFileName('!!!')).toBe('snippet.py');
    expect(sanitizeFileName('tool.py')).toBe('tool.py');
  });

  it('writes the snippet into its own folder', () => {
    const base = mkdtempSync(join(tmpdir(), 'pv-snip-'));
    const folder = createSnippetProject('def f():\n    return 1\n', 'demo.py', base, 42);
    expect(folder).toBe(join(base, 'snippet-42'));
    expect(readFileSync(join(folder, 'demo.py'), 'utf8')).toBe('def f():\n    return 1\n');
  });

  it('rejects huge snippets', () => {
    expect(() => createSnippetProject('x'.repeat(1_000_001), 'a.py', tmpdir())).toThrow('Snippet too large');
  });
});
