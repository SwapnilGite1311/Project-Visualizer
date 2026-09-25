import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface BridgeInfo {
  port: number;
  token: string;
}

// Reads ~/.project-visualizer/bridge.json, written by the desktop app while it runs.
export function readBridgeInfo(home = homedir(), readFile: (path: string, encoding: 'utf8') => string = readFileSync): BridgeInfo | null {
  try {
    const data: unknown = JSON.parse(readFile(join(home, '.project-visualizer', 'bridge.json'), 'utf8'));
    const { port, token } = (data ?? {}) as { port?: unknown; token?: unknown };
    if (typeof port !== 'number' || !Number.isInteger(port) || port <= 0 || typeof token !== 'string' || !token) return null;
    return { port, token };
  } catch {
    return null;
  }
}
