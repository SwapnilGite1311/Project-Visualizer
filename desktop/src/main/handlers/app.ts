// Channels: pv:app.info → {version, platform, engineStatus, enginePath}; pv:engine.restart → true.
import { app } from 'electron';
import type { MainContext } from '../core/context';

export default function register(ctx: MainContext): void {
  ctx.handle('pv:app.info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    engineStatus: ctx.engine.status,
    enginePath: ctx.engine.path,
  }));
  ctx.handle('pv:engine.restart', async () => {
    await ctx.engine.stop();
    await ctx.engine.start();
    return true;
  });
}
