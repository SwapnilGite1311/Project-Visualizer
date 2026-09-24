import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app, type BrowserWindow, ipcMain, safeStorage } from 'electron';
import { CHANNEL_ENGINE_STATUS, CHANNEL_NOTIFICATION } from '../shared/bridge';
import { createMainContext } from './core/context';
import { loadHandlers } from './core/handler-loader';
import { createLogger } from './core/logger';
import { SecretStore } from './core/secret-store';
import { SettingsStore } from './core/settings-store';
import { locateEngine } from './engine/engine-locator';
import { spawnEngine } from './engine/engine-process';
import { EngineService } from './engine/engine-service';
import { createMainWindow } from './window';

let win: BrowserWindow | null = null;
let engine: EngineService | null = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  void app.whenReady().then(() => {
    const userData = app.getPath('userData');
    const log = createLogger(join(userData, 'logs', 'main.log'));
    const settings = new SettingsStore(join(userData, 'settings.json'));
    const secrets = new SecretStore(join(userData, 'secrets.json'), {
      isAvailable: () => safeStorage.isEncryptionAvailable(),
      encrypt: (s) => safeStorage.encryptString(s),
      decrypt: (b) => safeStorage.decryptString(b),
    });

    const enginePath = locateEngine({
      env: process.env,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath,
      appPath: app.getAppPath(),
      platform: process.platform,
      exists: existsSync,
    });
    const service = new EngineService(enginePath ?? '', spawnEngine);
    engine = service;

    const ctx = createMainContext({ ipc: ipcMain, engine: service, settings, secrets, log, getWindow: () => win });
    loadHandlers(ctx);
    service.onNotification((method, params) => ctx.send(CHANNEL_NOTIFICATION, { method, params }));
    service.onStatus((status) => ctx.send(CHANNEL_ENGINE_STATUS, { status }));

    win = createMainWindow();

    if (enginePath) {
      service.start().catch((e) => log('error', 'engine start failed', String(e)));
    } else {
      log('error', 'pv-engine not found; build the engine first');
    }

    app.on('activate', () => {
      if (!win || win.isDestroyed()) win = createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('before-quit', () => {
    void engine?.stop();
  });
}
