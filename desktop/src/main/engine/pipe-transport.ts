import net from 'node:net';
import os from 'node:os';

// Where the desktop's engine listens: a named pipe on Windows, a Unix socket elsewhere (R9 "Local server mode").
export function pipePath(
  pid: number = process.pid,
  platform: NodeJS.Platform = process.platform,
  user: string = safeUser(),
  tmp: string = os.tmpdir(),
): string {
  const name = `pv-engine-${user.replace(/[^A-Za-z0-9_-]/g, '_') || 'user'}-${pid}`;
  if (platform === 'win32') return `\\\\.\\pipe\\${name}`;
  return `${tmp.replace(/\/+$/, '')}/${name}.sock`;
}

function safeUser(): string {
  try {
    return os.userInfo().username;
  } catch {
    return 'user';
  }
}

type Connect = (path: string) => net.Socket;

// Connects to the engine's pipe, retrying every 100 ms until it listens or the time is up.
export function connectPipe(path: string, timeoutMs = 5000, connect: Connect = (p) => net.connect(p)): Promise<net.Socket> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = connect(path);
      const onError = (err: Error) => {
        socket.destroy();
        if (Date.now() >= deadline) reject(new Error(`cannot connect to ${path}: ${err.message}`));
        else setTimeout(attempt, 100);
      };
      socket.once('error', onError);
      socket.once('connect', () => {
        socket.off('error', onError);
        resolve(socket);
      });
    };
    attempt();
  });
}
