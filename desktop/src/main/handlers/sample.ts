// Channel: pv:sample.create → {root_path}: a fresh copy of the sample shop project under userData.
import { join } from 'node:path';
import { app } from 'electron';
import type { MainContext } from '../core/context';
import { writeSampleProject } from '../sample/sample-project';

export default function register(ctx: MainContext): void {
  ctx.handle('pv:sample.create', () => ({ root_path: writeSampleProject(join(app.getPath('userData'), 'sample-project')) }));
}
