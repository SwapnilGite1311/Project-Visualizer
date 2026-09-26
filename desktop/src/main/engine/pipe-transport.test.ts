import { EventEmitter } from 'node:events';
import type net from 'node:net';
import { describe, expect, it } from 'vitest';
import { connectPipe, pipePath } from './pipe-transport';

class FakeSocket extends EventEmitter {
  destroyed = false;
  destroy(): void {
    this.destroyed = true;
  }
}

describe('pipePath', () => {
  it('uses a named pipe on Windows and a socket file elsewhere', () => {
    expect(pipePath(42, 'win32', 'Swapnil gite', 'C:\\tmp')).toBe('\\\\.\\pipe\\pv-engine-Swapnil_gite-42');
    expect(pipePath(42, 'linux', 'ana', '/tmp/')).toBe('/tmp/pv-engine-ana-42.sock');
    expect(pipePath(7, 'darwin', '', '/var/folders/x')).toBe('/var/folders/x/pv-engine-user-7.sock');
  });
});

describe('connectPipe', () => {
  it('retries until the engine listens', async () => {
    let attempts = 0;
    const socket = await connectPipe('p', 2000, () => {
      const s = new FakeSocket();
      attempts++;
      setTimeout(() => (attempts < 3 ? s.emit('error', new Error('ENOENT')) : s.emit('connect')), 1);
      return s as unknown as net.Socket;
    });
    expect(attempts).toBe(3);
    expect(socket).toBeDefined();
  });

  it('gives up after the timeout', async () => {
    await expect(
      connectPipe('p', 150, () => {
        const s = new FakeSocket();
        setTimeout(() => s.emit('error', new Error('ENOENT')), 1);
        return s as unknown as net.Socket;
      }),
    ).rejects.toThrow(/cannot connect to p/);
  });
});
