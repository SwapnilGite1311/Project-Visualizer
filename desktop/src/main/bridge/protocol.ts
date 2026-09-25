// Messages between the desktop app and editor extensions (see README.md).
export type ClientMessage =
  | { type: 'hello'; token: string; client: string; version: string }
  | { type: 'reveal'; file_path: string; line: number }
  | { type: 'explain'; file_path: string; line: number };

export type ServerMessage =
  | { type: 'welcome'; app_version: string }
  | { type: 'error'; message: string }
  | { type: 'open'; file_path: string; line: number };

const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const lineNumber = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1;

export function parseClientMessage(raw: string): ClientMessage | null {
  let m: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    m = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  switch (m.type) {
    case 'hello':
      return text(m.token) && text(m.client) && text(m.version) ? { type: 'hello', token: m.token, client: m.client, version: m.version } : null;
    case 'reveal':
    case 'explain':
      return text(m.file_path) && lineNumber(m.line) ? { type: m.type, file_path: m.file_path, line: m.line } : null;
    default:
      return null;
  }
}
