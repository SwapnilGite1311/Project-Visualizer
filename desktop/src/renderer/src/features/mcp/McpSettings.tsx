import { useEffect, useState } from 'react';
import { appInfo } from '../../api/main';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';

const TOOLS: Array<[string, string]> = [
  ['pv_overview', 'a short overview of the project'],
  ['pv_search', 'find classes, functions and files by name'],
  ['pv_node', 'read one element: its code, callers and callees'],
  ['pv_dependencies', 'what an element uses and what uses it'],
  ['pv_impact', 'everything that depends on an element, with a risk level'],
  ['pv_path', 'how one element reaches another'],
];

const forward = (path: string) => path.replace(/\\/g, '/');

export function claudeCodeCommand(enginePath: string, root: string): string {
  return `claude mcp add project-visualizer -- "${forward(enginePath)}" mcp "${forward(root)}"`;
}

export function mcpJsonConfig(enginePath: string, root: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        'project-visualizer': { command: forward(enginePath), args: ['mcp', forward(root)] },
      },
    },
    null,
    2,
  );
}

async function copy(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    notify.success(`${what} copied`);
  } catch {
    notify.error('Could not copy', 'The clipboard is not available.');
  }
}

function Snippet({ title, text }: { title: string; text: string }) {
  return (
    <section style={{ display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 12 }}>{title}</strong>
        <Button size="sm" onClick={() => void copy(text, title)}>
          Copy
        </Button>
      </div>
      <pre
        aria-label={title}
        style={{
          margin: 0,
          padding: 6,
          background: 'var(--surface-2, rgba(127,127,127,0.1))',
          borderRadius: 4,
          fontSize: 12,
          overflowX: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {text}
      </pre>
    </section>
  );
}

export function McpSettings() {
  const root = useAppStore((s) => s.projectRoot);
  const [enginePath, setEnginePath] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    appInfo().then(
      (info) => alive && setEnginePath(info.enginePath),
      () => alive && setEnginePath(''),
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
      <p style={{ margin: 0 }}>
        Let AI coding agents such as Claude Code or Cursor look at this project's map before they
        change code: what a function does, who calls it, and what could break.
      </p>
      {!root ? (
        <div style={{ color: 'var(--text-muted)' }}>
          Open a project first: the commands include its folder.
        </div>
      ) : enginePath === null ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
      ) : !enginePath ? (
        <div style={{ color: 'var(--danger)' }}>
          The analysis engine was not found, so the commands cannot be shown.
        </div>
      ) : (
        <>
          <Snippet title="Claude Code" text={claudeCodeCommand(enginePath, root)} />
          <Snippet
            title="Cursor, Claude Desktop and other MCP clients"
            text={mcpJsonConfig(enginePath, root)}
          />
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            For Cursor, put the JSON in <code>.cursor/mcp.json</code> in the project (or the global
            MCP settings). Restart the agent afterwards.
          </div>
        </>
      )}
      <section>
        <strong style={{ fontSize: 12 }}>What the agent can ask</strong>
        <ul aria-label="Tools" style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12 }}>
          {TOOLS.map(([name, what]) => (
            <li key={name}>
              <code>{name}</code> — {what}
            </li>
          ))}
        </ul>
      </section>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Runs locally; nothing is uploaded.
      </div>
    </div>
  );
}
