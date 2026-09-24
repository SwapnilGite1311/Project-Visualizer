// Channel: pv:snippet.create {code, file_name?} → {root_path}.
import { join } from 'node:path';
import { app } from 'electron';
import type { MainContext } from '../core/context';
import { createSnippetProject } from '../snippet/create-snippet';

export default function register(ctx: MainContext): void {
  ctx.handle('pv:snippet.create', (p) => {
    const { code, file_name } = (p ?? {}) as { code?: unknown; file_name?: unknown };
    if (typeof code !== 'string' || code.trim() === '') throw new Error('code is required');
    const name = typeof file_name === 'string' ? file_name : 'snippet.py';
    return { root_path: createSnippetProject(code, name, join(app.getPath('userData'), 'snippets')) };
  });
}
