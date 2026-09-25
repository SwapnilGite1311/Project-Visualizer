import type { Frame } from './frames';
import type { Block, BodyResult } from './motion-api';

export const BLOCK_COLORS: Record<string, string> = {
  if: '#f59e0b',
  elif: '#f59e0b',
  else: '#f59e0b',
  match: '#f59e0b',
  case: '#f59e0b',
  for: '#8b5cf6',
  while: '#8b5cf6',
  try: '#ef4444',
  except: '#ef4444',
  finally: '#ef4444',
  raise: '#dc2626',
  return: '#10b981',
  def: '#3b82f6',
  class: '#3b82f6',
  break: '#94a3b8',
  continue: '#94a3b8',
  pass: '#94a3b8',
  with: '#06b6d4',
  statement: '#64748b',
};

export const ROW = 52;
export const INDENT = 36;
export const WIDTH = 560;

export interface Platform {
  blockId: string;
  kind: string;
  text: string;
  line: number;
  endLine: number;
  depth: number;
  index: number;
  x: number;
  y: number;
  width: number;
  color: string;
}

export function layoutBlocks(blocks: Block[]): Platform[] {
  return blocks.map((b, index) => ({
    blockId: b.id,
    kind: b.kind,
    text: b.text,
    line: b.line,
    endLine: b.end_line,
    depth: b.depth,
    index,
    x: b.depth * INDENT,
    y: index * ROW,
    width: WIDTH - b.depth * INDENT,
    color: BLOCK_COLORS[b.kind] ?? BLOCK_COLORS.statement,
  }));
}

// The deepest block that contains the line (ties: the later one).
export function activeBlockId(blocks: Block[], line: number): string | null {
  let best: Block | null = null;
  for (const b of blocks) {
    if (line < b.line || line > b.end_line) continue;
    if (!best || b.depth >= best.depth) best = b;
  }
  return best?.id ?? null;
}

export interface Floor {
  nodeId: string;
  level: number;
  activeBlockId: string | null;
}

// One floor per stack frame that has a body; the outermost frame is level 0.
export function floorsFor(stack: Frame[], bodies: Map<string, BodyResult>): Floor[] {
  const floors: Floor[] = [];
  for (const frame of stack) {
    const body = bodies.get(frame.nodeId);
    if (!body) continue;
    floors.push({ nodeId: frame.nodeId, level: floors.length, activeBlockId: activeBlockId(body.blocks, frame.line) });
  }
  return floors;
}
