import { spawn } from 'node:child_process';
import type { EngineTransport } from './engine-client';

export interface EngineProcessHandle {
  transport: EngineTransport;
  onExit(cb: (code: number | null) => void): void;
  kill(): void;
}

export type Spawner = (command: string, args: string[]) => EngineProcessHandle;

export const spawnEngine: Spawner = (command, args) => {
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let stderrRest = '';
  child.stderr.on('data', (chunk: Buffer) => {
    const lines = (stderrRest + chunk.toString('utf8')).split(/\r?\n/);
    stderrRest = lines.pop() ?? '';
    // Engine log bridge: the engine writes its logs to stderr.
    for (const line of lines) if (line) console.error('[pv-engine]', line);
  });
  return {
    transport: {
      write: (data) => {
        child.stdin.write(data);
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
