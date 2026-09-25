import { join } from 'node:path';
import { app, BrowserWindow, screen, session, shell } from 'electron';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
  "font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'";

export const MIN_SIZE = { width: 860, height: 560 };

// Start at 1400x900, but never larger than 90% of the screen (small laptops, high display scaling).
export function initialSize(workArea: { width: number; height: number }): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(MIN_SIZE.width, Math.min(1400, Math.round(workArea.width * 0.9))),
    height: Math.max(MIN_SIZE.height, Math.min(900, Math.round(workArea.height * 0.9))),
  };
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    ...initialSize(screen.getPrimaryDisplay().workAreaSize),
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    show: false,
    title: 'Project Visualizer',
    backgroundColor: '#0f1320',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) =>
      cb({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CSP] } }),
    );
  }

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && devUrl) void win.loadURL(devUrl);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
  return win;
}
