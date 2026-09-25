// Typed calls for errors (contracts/rpc/errors).
import { rpc } from '../../api/bridge';

export type ErrorLanguage = 'python' | 'javascript' | 'java' | 'go' | 'csharp' | 'unknown';

export interface Frame {
  file_path: string;
  line: number;
  function: string;
  node_id: string;
  in_project: boolean;
  is_origin: boolean;
}

export interface ErrorEntry {
  error_id: string;
  source: 'runtime' | 'pasted';
  language: ErrorLanguage;
  error_type: string;
  message: string;
  count: number;
  first_seen_ms: number;
  last_seen_ms: number;
  origin_node_id: string;
  frames: Frame[];
}

export interface MappedStack {
  error_id: string;
  language: ErrorLanguage;
  error_type: string;
  message: string;
  frames: Frame[];
}

export const mapStack = (pid: string, text: string) =>
  rpc<MappedStack>('errors.map_stack', { project_id: pid, text });

export async function listErrors(pid: string): Promise<ErrorEntry[]> {
  return (await rpc<{ errors: ErrorEntry[] }>('errors.list', { project_id: pid })).errors;
}

export const clearErrors = (pid: string, errorId?: string) =>
  rpc<{ ok: boolean }>('errors.clear', {
    project_id: pid,
    ...(errorId ? { error_id: errorId } : {}),
  });
