import type { BrowserWindow } from 'electron';
import type { Envelope } from '../../shared/bridge';
import type { EngineService } from '../engine/engine-service';
import type { LogFn } from './logger';
import type { SecretStore } from './secret-store';
import type { SettingsStore } from './settings-store';

export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, payload: unknown) => unknown): void;
}

export interface MainContext {
  handle(channel: string, fn: (payload: unknown) => unknown | Promise<unknown>): void; // wraps ipcMain.handle
  send(channel: string, payload: unknown): void; // to the renderer window
  engine: EngineService;
  settings: SettingsStore;
  secrets: SecretStore;
  getWindow(): BrowserWindow | null;
  log: LogFn;
}

export function toEnvelope(
  fn: (payload: unknown) => unknown | Promise<unknown>,
): (payload: unknown) => Promise<Envelope<unknown>> {
  return async (payload) => {
    try {
      return { ok: true, value: await fn(payload) };
    } catch (e) {
      return {
        ok: false,
        error: {
          code: (e as { code?: string | number }).code ?? 'error',
          message: e instanceof Error ? e.message : String(e),
        },
      };
    }
  };
}

export function createMainContext(deps: {
  ipc: IpcMainLike;
  engine: EngineService;
  settings: SettingsStore;
  secrets: SecretStore;
  log: LogFn;
  getWindow: () => BrowserWindow | null;
}): MainContext {
  return {
    handle(channel, fn) {
      if (!channel.startsWith('pv:')) throw new Error('channel must start with pv:');
      const wrapped = toEnvelope(fn);
      deps.ipc.handle(channel, (_event, payload) => wrapped(payload));
    },
    send(channel, payload) {
      const win = deps.getWindow();
      if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
    },
    engine: deps.engine,
    settings: deps.settings,
    secrets: deps.secrets,
    getWindow: deps.getWindow,
    log: deps.log,
  };
}
