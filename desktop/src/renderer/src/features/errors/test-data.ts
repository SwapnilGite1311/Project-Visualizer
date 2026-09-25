// Test helper (not a feature file): mapped errors.
import type { ErrorEntry, Frame } from './errors-api';

export const frame = (node_id: string, extra: Partial<Frame> = {}): Frame => ({
  file_path: node_id ? node_id.slice(node_id.indexOf(':') + 1).split('#')[0] : 'lib/x.py',
  line: 3,
  function: node_id.split('#')[1] ?? 'f',
  node_id,
  in_project: node_id !== '',
  is_origin: false,
  ...extra,
});

export const PASTED_TEXT = `Traceback (most recent call last):
  File "app/api.py", line 9, in handle
  File "app/db.py", line 3, in load
KeyError: 'id'`;

export function entry(id: string, extra: Partial<ErrorEntry> = {}): ErrorEntry {
  return {
    error_id: id,
    source: 'runtime',
    language: 'python',
    error_type: 'KeyError',
    message: "'id'",
    count: 2,
    first_seen_ms: 1_000,
    last_seen_ms: 2_000,
    origin_node_id: 'function:app/db.py#load',
    frames: [
      frame('function:app/api.py#handle', { line: 9 }),
      frame(''),
      frame('function:app/db.py#load', { is_origin: true }),
    ],
    ...extra,
  };
}
