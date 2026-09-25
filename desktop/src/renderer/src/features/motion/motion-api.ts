import { invoke, rpc } from '../../api/bridge';

export interface Block {
  id: string;
  kind: string;
  line: number;
  end_line: number;
  depth: number;
  parent: string | null;
  text: string;
  calls: string[];
  writes: string[];
}

export interface BodyResult {
  node_id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  blocks: Block[];
}

export interface TraceSummary {
  trace_id: string;
  steps_total: number;
  truncated: boolean;
  exit_code: number | null;
  argv: string[];
  skipped_lines: number;
  functions: Array<{ node_id: string; calls: number }>;
  last_exception: { i: number; node_id: string; line: number; value: string } | null;
}

export interface Step {
  i: number;
  kind: 'call' | 'line' | 'return' | 'exception';
  node_id: string;
  file: string;
  line: number;
  depth: number;
  t_ns: number;
  locals: Record<string, string>;
  value: string;
}

export interface PythonInfo {
  command: string;
  args: string[];
  version: string;
  executable: string;
}

export interface RecordResult {
  trace_path: string;
  trace_exists: boolean;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
  cancelled: boolean;
}

export const motionBody = (pid: string, nodeId: string) => rpc<BodyResult>('motion.body', { project_id: pid, node_id: nodeId });
export const loadTrace = (pid: string, path: string) => rpc<TraceSummary>('motion.load_trace', { project_id: pid, path });
export const getSteps = (traceId: string, from: number, count: number) =>
  rpc<{ total: number; steps: Step[] }>('motion.steps', { trace_id: traceId, from, count });
export const unloadTrace = (traceId: string) => rpc<{ removed: boolean }>('motion.unload', { trace_id: traceId });

export const findPython = () => invoke<PythonInfo | null>('pv:motion.python');
export const recordRun = (root: string, command: string, maxEvents?: number) =>
  invoke<RecordResult>('pv:motion.record', maxEvents === undefined ? { root, command } : { root, command, maxEvents });
export const cancelRecording = () => invoke<boolean>('pv:motion.cancel');
export const pickTraceFile = () => invoke<string | null>('pv:motion.pickTrace');
