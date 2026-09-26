import { type WebSocket, WebSocketServer } from 'ws';
import { parseClientMessage, type ServerMessage } from './protocol';

export const AUTH_TIMEOUT_MS = 5000;
const EXTRA_PORTS = 9; // 47101 busy → try up to 47110

interface Options {
  token: string;
  appVersion: string;
  onReveal(file: string, line: number): void;
  onExplain(file: string, line: number): void;
}

// A WebSocket server on 127.0.0.1 for editor extensions; a client must say hello with the token within 5 s.
export class BridgeServer {
  private server: WebSocketServer | null = null;
  private port: number | null = null;
  private readonly authenticated = new Set<WebSocket>();

  constructor(private readonly opts: Options) {}

  async start(preferredPort = 47101): Promise<number> {
    const last = preferredPort === 0 ? 0 : preferredPort + EXTRA_PORTS;
    for (let port = preferredPort; port <= last; port++) {
      try {
        this.server = await this.listen(port);
        const address = this.server.address();
        this.port = typeof address === 'object' && address ? address.port : port;
        this.server.on('connection', (socket) => this.accept(socket));
        return this.port;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EADDRINUSE' || port === last) throw e;
      }
    }
    throw new Error('no free port for the bridge');
  }

  broadcastOpen(file: string, line: number): number {
    for (const socket of this.authenticated) send(socket, { type: 'open', file_path: file, line });
    return this.authenticated.size;
  }

  status(): { running: boolean; port: number | null; clients: number } {
    return { running: this.server !== null, port: this.port, clients: this.authenticated.size };
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    for (const client of server.clients) client.terminate();
    this.authenticated.clear();
    this.server = null;
    this.port = null;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private listen(port: number): Promise<WebSocketServer> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ host: '127.0.0.1', port });
      wss.once('listening', () => {
        // Later server errors must not become uncaught main-process errors.
        wss.on('error', (e) => console.error('[bridge]', e.message));
        resolve(wss);
      });
      wss.once('error', (e) => {
        wss.close();
        reject(e);
      });
    });
  }

  private accept(socket: WebSocket): void {
    const timer = setTimeout(() => {
      if (!this.authenticated.has(socket)) socket.close(4001, 'authentication timeout');
    }, AUTH_TIMEOUT_MS);
    socket.on('error', () => socket.terminate()); // a broken client connection: drop it quietly
    socket.on('close', () => {
      clearTimeout(timer);
      this.authenticated.delete(socket);
    });
    socket.on('message', (data) => {
      const message = parseClientMessage(String(data));
      if (!this.authenticated.has(socket)) {
        if (message?.type === 'hello' && message.token === this.opts.token) {
          clearTimeout(timer);
          this.authenticated.add(socket);
          send(socket, { type: 'welcome', app_version: this.opts.appVersion });
        } else {
          socket.close(4003, 'not authenticated');
        }
        return;
      }
      if (message?.type === 'reveal') this.opts.onReveal(message.file_path, message.line);
      else if (message?.type === 'explain') this.opts.onExplain(message.file_path, message.line);
      else send(socket, { type: 'error', message: 'unsupported message' });
    });
  }
}

function send(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}
