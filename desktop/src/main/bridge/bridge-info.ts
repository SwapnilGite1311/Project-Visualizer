import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface BridgeInfo {
  port: number;
  token: string;
  pid: number;
}

// Where the VS Code extension looks for the running desktop app.
export const bridgeInfoPath = (home = homedir()) => join(home, '.project-visualizer', 'bridge.json');

export const generateToken = () => randomBytes(16).toString('hex');

export function writeBridgeInfo(info: BridgeInfo, home?: string): void {
  const path = bridgeInfoPath(home);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(info), 'utf8');
  if (process.platform !== 'win32') chmodSync(path, 0o600);
}

export function removeBridgeInfo(home?: string): void {
  rmSync(bridgeInfoPath(home), { force: true });
}
