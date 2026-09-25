export interface PythonInfo {
  command: string;
  args: string[];
  version: string;
  executable: string;
}

export type RunFn = (cmd: string, args: string[]) => Promise<{ code: number; stdout: string }>;

const PROBE = 'import sys;print("%d.%d.%d" % tuple(sys.version_info[:3]));print(sys.executable)';

export function pythonCandidates(platform: NodeJS.Platform, override?: string): Array<{ command: string; args: string[] }> {
  const list = platform === 'win32'
    ? [
        { command: 'py', args: ['-3'] },
        { command: 'python', args: [] },
        { command: 'python3', args: [] },
      ]
    : [
        { command: 'python3', args: [] },
        { command: 'python', args: [] },
      ];
  return override ? [{ command: override, args: [] }, ...list] : list;
}

function supported(version: string): boolean {
  const [major, minor] = version.split('.').map(Number);
  return major === 3 && minor >= 9;
}

// The first Python 3.9+ that answers the probe; the Windows Store "python" stub fails it.
export async function findPython(run: RunFn, platform: NodeJS.Platform, override?: string): Promise<PythonInfo | null> {
  for (const candidate of pythonCandidates(platform, override)) {
    try {
      const { code, stdout } = await run(candidate.command, [...candidate.args, '-c', PROBE]);
      const [version = '', executable = ''] = stdout.trim().split(/\r?\n/);
      if (code === 0 && supported(version)) return { ...candidate, version, executable };
    } catch {
      // not installed: try the next one
    }
  }
  return null;
}
