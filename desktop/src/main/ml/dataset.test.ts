import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exportRows, parseDataset, splitCsvLine } from './dataset';

const CSV =
  'node_id,kind,level,minute,loc,complexity,fan_in,fan_out,calls,errors,p95_ms,stalls\n' +
  'function:app/a.py#f,function,4,29000000,12,3,1,2,40,1,12.5,0\n' +
  '"function:app/b,c.py#g",function,4,29000001,5,1,0,0,2,0,3,1\n';

describe('ML dataset', () => {
  it('parses the engine CSV with numbers and quoted ids', () => {
    const rows = parseDataset(CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      node_id: 'function:app/a.py#f',
      kind: 'function',
      level: 4,
      minute: 29000000,
      loc: 12,
      complexity: 3,
      fan_in: 1,
      fan_out: 2,
      calls: 40,
      errors: 1,
      p95_ms: 12.5,
      stalls: 0,
    });
    expect(rows[1].node_id).toBe('function:app/b,c.py#g');
    expect(splitCsvLine('"a""b",c')).toEqual(['a"b', 'c']);
  });

  it('exports through the engine and removes the temporary file', async () => {
    let written = '';
    const engine = {
      request: async <T,>(method: string, params?: unknown): Promise<T> => {
        expect(method).toBe('metrics.export');
        written = (params as { out_path: string }).out_path;
        writeFileSync(written, CSV);
        return { rows: 2 } as T;
      },
    };
    const rows = await exportRows(engine, 'p1', 123);
    expect(rows).toHaveLength(2);
    const { existsSync } = await import('node:fs');
    expect(existsSync(written)).toBe(false);
  });
});
