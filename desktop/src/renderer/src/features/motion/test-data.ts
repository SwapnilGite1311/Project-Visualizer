// Test helpers: motion steps and a small function body.
import type { BodyResult, Step } from './motion-api';

let counter = 0;
export function step(
  kind: Step['kind'],
  node: string,
  depth: number,
  line: number,
  locals: Record<string, string> = {},
  value = '',
): Step {
  return { i: counter++, kind, node_id: node, file: 'a.py', line, depth, t_ns: 0, locals, value };
}

// Numbers the steps 0..n-1 as the engine does.
export const numbered = (steps: Step[]): Step[] => steps.map((s, i) => ({ ...s, i }));

export const getUserBody: BodyResult = {
  node_id: 'method:app/services.py#UserService.get_user',
  file_path: 'app/services.py',
  start_line: 8,
  end_line: 12,
  blocks: [
    { id: 'b1', kind: 'if', line: 9, end_line: 10, depth: 0, parent: null, text: 'if not is_valid(user_id):', calls: ['is_valid'], writes: [] },
    { id: 'b2', kind: 'raise', line: 10, end_line: 10, depth: 1, parent: 'b1', text: 'raise ValueError("bad id")', calls: ['ValueError'], writes: [] },
    { id: 'b3', kind: 'statement', line: 11, end_line: 11, depth: 0, parent: null, text: 'user = User(user_id, normalize("alice"))', calls: ['User', 'normalize'], writes: ['user'] },
    { id: 'b4', kind: 'return', line: 12, end_line: 12, depth: 0, parent: null, text: 'return self.format_user(user)', calls: ['self.format_user'], writes: [] },
  ],
};
