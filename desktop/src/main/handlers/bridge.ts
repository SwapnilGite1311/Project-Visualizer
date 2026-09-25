// Starts the VS Code bridge with the app. Channels: pv:bridge.status → {running, port, clients};
// pv:bridge.openInIde {file_path, line} → {sent}. Events to the renderer: pv:bridge.reveal, pv:bridge.explain.
import { app } from 'electron';
import { generateToken, removeBridgeInfo, writeBridgeInfo } from '../bridge/bridge-info';
import { BridgeServer } from '../bridge/bridge-server';
import type { MainContext } from '../core/context';

export default function register(ctx: MainContext): void {
  let token = ctx.settings.get<string>('bridge.token', '');
  if (!token) {
    token = generateToken();
    ctx.settings.set('bridge.token', token);
  }
  const server = new BridgeServer({
    token,
    appVersion: app.getVersion(),
    onReveal: (file_path, line) => ctx.send('pv:bridge.reveal', { file_path, line }),
    onExplain: (file_path, line) => ctx.send('pv:bridge.explain', { file_path, line }),
  });

  server
    .start()
    .then((port) => {
      writeBridgeInfo({ port, token, pid: process.pid });
      ctx.log('info', `VS Code bridge listening on 127.0.0.1:${port}`);
    })
    .catch((e: unknown) => ctx.log('error', `VS Code bridge not started: ${e instanceof Error ? e.message : String(e)}`));

  app.on('before-quit', () => {
    removeBridgeInfo();
    void server.stop();
  });

  ctx.handle('pv:bridge.status', () => server.status());
  ctx.handle('pv:bridge.openInIde', (p) => {
    const { file_path, line } = (p ?? {}) as { file_path?: unknown; line?: unknown };
    if (typeof file_path !== 'string' || !file_path) throw new Error('file_path is required');
    const n = typeof line === 'number' && Number.isInteger(line) && line >= 1 ? line : 1;
    return { sent: server.broadcastOpen(file_path, n) > 0 };
  });
}
