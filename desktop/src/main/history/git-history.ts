import type { Run } from './run';

export interface Commit {
  sha: string;
  author: string;
  date: string; // ISO 8601
  subject: string;
}

const SEP = '\u001f';

export async function isGitRepo(root: string, run: Run): Promise<boolean> {
  const r = await run('git', ['-C', root, 'rev-parse', '--is-inside-work-tree']);
  return r.code === 0 && r.stdout.trim() === 'true';
}

// Newest first.
export async function listCommits(root: string, limit: number, run: Run): Promise<Commit[]> {
  const n = Math.min(500, Math.max(1, Math.floor(limit) || 1));
  const r = await run('git', ['-C', root, 'log', '-n', String(n), '--pretty=format:%H%x1f%an%x1f%aI%x1f%s']);
  if (r.code !== 0) throw new Error('git log failed: ' + r.stderr.slice(-300));
  return r.stdout
    .split(/\r?\n/)
    .filter((line) => line.includes(SEP))
    .map((line) => {
      const [sha, author, date, ...rest] = line.split(SEP);
      return { sha, author, date, subject: rest.join(SEP) };
    });
}
