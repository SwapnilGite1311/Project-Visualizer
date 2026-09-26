import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// contracts/http/ml/dataset.schema.json $defs.row
export interface DatasetRow {
  node_id: string;
  kind: string;
  level: number;
  minute: number;
  loc: number;
  complexity: number;
  fan_in: number;
  fan_out: number;
  calls: number;
  errors: number;
  p95_ms: number;
  stalls: number;
}

interface Engine {
  request<T = unknown>(method: string, params?: unknown): Promise<T>;
}

const TEXT_COLUMNS = new Set(['node_id', 'kind']);

// Splits one CSV line (the engine quotes fields that contain commas or quotes).
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export function parseDataset(csv: string): DatasetRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string | number> = {};
    header.forEach((name, i) => {
      row[name] = TEXT_COLUMNS.has(name) ? (cells[i] ?? '') : Number(cells[i] ?? 0) || 0;
    });
    return row as unknown as DatasetRow;
  });
}

// The metrics history of a project as ML rows (via the engine's metrics.export into a temporary file).
export async function exportRows(engine: Engine, projectId: string, fromMs?: number): Promise<DatasetRow[]> {
  const dir = mkdtempSync(join(tmpdir(), 'pv-dataset-'));
  const outPath = join(dir, 'dataset.csv');
  try {
    await engine.request('metrics.export', { project_id: projectId, out_path: outPath, ...(fromMs !== undefined ? { from_ms: fromMs } : {}) });
    return parseDataset(readFileSync(outPath, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
