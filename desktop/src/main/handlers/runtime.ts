// Starts the runtime hub (agents and OpenTelemetry send events to 127.0.0.1:47100) and forwards events to the engine.
// Channels: pv:runtime.setActiveProject {project_id, root}; pv:runtime.hubInfo; pv:runtime.regenerateToken.
import { randomBytes } from 'node:crypto';
import { app } from 'electron';
import type { MainContext } from '../core/context';
import { Forwarder } from '../runtime/forwarder';
import { HubServer } from '../runtime/hub-server';

const newToken = () => randomBytes(16).toString('hex');

export default function register(ctx: MainContext): void {
  let token = ctx.settings.get<string>('runtime.token', '');
  if (!token) {
    token = newToken();
    ctx.settings.set('runtime.token', token);
  }
  const forwarder = new Forwarder(ctx.engine);
  const server = new HubServer({
    token: () => token,
    onEvents: (source, events) => forwarder.push(source, events),
  });

  server
    .start()
    .then((port) => ctx.log('info', `runtime hub listening on 127.0.0.1:${port}`))
    .catch((e: unknown) =>
      ctx.log('error', `runtime hub not started: ${e instanceof Error ? e.message : String(e)}`),
    );

  app.on('before-quit', () => {
    forwarder.stop();
    void server.stop();
  });

  ctx.handle('pv:runtime.setActiveProject', (p) => {
    const { project_id, root } = (p ?? {}) as { project_id?: unknown; root?: unknown };
    forwarder.setActiveProject(
      typeof project_id === 'string' && project_id ? project_id : null,
      typeof root === 'string' && root ? root : null,
    );
    return { ok: true };
  });
  ctx.handle('pv:runtime.hubInfo', () => {
    const { running, port } = server.status();
    return {
      url: port ? `http://127.0.0.1:${port}` : '',
      token,
      running,
      port,
      ...server.stats(),
      ...forwarder.stats(),
    };
  });
  ctx.handle('pv:runtime.regenerateToken', () => {
    token = newToken();
    ctx.settings.set('runtime.token', token);
    return { token };
  });
}
