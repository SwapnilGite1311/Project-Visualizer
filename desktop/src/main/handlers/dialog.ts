// Channel: pv:dialog.openFolder → the chosen folder path, or null when cancelled.
import { dialog } from 'electron';
import type { MainContext } from '../core/context';

export default function register(ctx: MainContext): void {
  ctx.handle('pv:dialog.openFolder', async () => {
    const win = ctx.getWindow();
    const options = { properties: ['openDirectory' as const] };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });
}
