import { spawn } from 'node:child_process';

export type Run = (cmd: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>;

// Runs a program without a shell and collects its output.
export const run: Run = (cmd, args) =>
  new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    try {
      const child = spawn(cmd, args, { shell: false, windowsHide: true });
      child.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
      child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
      child.on('error', (e) => resolve({ code: -1, stdout, stderr: stderr + String(e) }));
      child.on('exit', (code) => resolve({ code: code ?? -1, stdout, stderr }));
    } catch (e) {
      resolve({ code: -1, stdout, stderr: String(e) });
    }
  });
