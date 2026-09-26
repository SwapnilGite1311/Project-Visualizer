import { spawn } from 'node:child_process';
import type { Socket } from 'node:net';
import type { EngineTransport } from './engine-client';
import { connectPipe } from './pipe-transport';

export interface EngineProcessHandle {
  transport: EngineTransport;
  onExit(cb: (code: number | null) => void): void;
  kill(): void;
}

export type Spawner = (command: string, args: string[]) => EngineProcessHandle;
// Starts `pv-engine serve` and connects to it over the named pipe / Unix socket.
export type PipeSpawner = (command: string, pipe: string) => Promise<EngineProcessHandle>;

// Engine log bridge: the engine writes its logs to stderr. Every line also goes to `onLine`.
function bridgeLogs(stream: NodeJS.ReadableStream, onLine?: (line: string) => void): void {
  let rest = '';
  stream.on('data', (chunk: Buffer) => {
    const lines = (rest + chunk.toString('utf8')).split(/\r?\n/);
    rest = lines.pop() ?? '';
    for (const line of lines) {
      if (!line) continue;
      console.error('[pv-engine]', line);
      onLine?.(line);
    }
  });
}

export const spawnEngine: Spawner = (command, args) => {
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  bridgeLogs(child.stderr);
  // Writing to a crashed engine fails with EPIPE; without a listener that would be an uncaught main-process error.
  child.stdin.on('error', (err) => console.error('[pv-engine] stdin:', err.message));
  child.on('error', (err) => console.error('[pv-engine] process:', err.message));
  return {
    transport: {
      write: (data) => {
        if (child.stdin.writable) child.stdin.write(data);
      },
      onData: (cb) => {
        child.stdout.on('data', cb);
      },
    },
    onExit: (cb) => {
      child.on('exit', (code) => cb(code));
    },
    kill: () => {
      child.kill();
    },
  };
};

export const spawnEngineOverPipe: PipeSpawner = async (command, pipe) => {
  const child = spawn(command, ['serve', '--pipe', pipe, '--tcp', '7700', '--parent-pid', String(process.pid)], {
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
  });
  let unknownCommand = false;
  bridgeLogs(child.stderr, (line) => {
    if (line.includes('unknown command: serve')) unknownCommand = true;
  });
  const exitedEarly = new Promise<never>((_, reject) => {
    child.once('exit', (code) => reject(new Error(unknownCommand ? 'engine has no serve command' : `engine exited with code ${code}`)));
    child.once('error', (err) => reject(err));
  });
  let socket: Socket;
  try {
    socket = await Promise.race([connectPipe(pipe), exitedEarly]);
  } catch (err) {
    child.kill();
    throw err;
  }
  exitedEarly.catch(() => undefined); // later exits are reported through onExit
  // A socket without an 'error' listener throws in the main process (Electron's "A JavaScript error occurred" box)
  // when the engine goes away, e.g. while the app quits. The engine's exit is reported through onExit instead.
  socket.on('error', (err) => console.error('[pv-engine] pipe:', err.message));
  return {
    transport: {
      write: (data) => {
        if (!socket.destroyed && socket.writable) socket.write(data);
      },
      onData: (cb) => {
        socket.on('data', cb);
      },
    },
    onExit: (cb) => {
      child.on('exit', (code) => cb(code));
    },
    kill: () => {
      socket.destroy();
      child.kill();
    },
  };
};
