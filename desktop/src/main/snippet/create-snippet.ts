import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_CHARS = 1_000_000;

export function sanitizeFileName(name: string): string {
  let clean = name.replace(/[^A-Za-z0-9_.-]/g, '');
  if (!clean) return 'snippet.py';
  if (!clean.endsWith('.py')) clean += '.py';
  return clean;
}

export function createSnippetProject(code: string, fileName: string, baseDir: string, now = Date.now()): string {
  if (code.length > MAX_CHARS) throw new Error('Snippet too large');
  const folder = join(baseDir, `snippet-${now}`);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, sanitizeFileName(fileName)), code, 'utf8');
  return folder;
}
