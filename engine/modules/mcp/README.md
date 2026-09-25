# mcp — the map for AI coding agents

`pv-engine mcp <project-root>` runs a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio, so coding agents (Claude Code, Cursor, and any MCP client) can ask Project Visualizer about the structure of a project **before** they edit it: what a function does, who calls it, what depends on it and how risky a change is.

The command loads the project the same way the desktop app does (it may take a few seconds on large repositories), then answers requests until the client closes the connection. Messages are JSON-RPC 2.0, one per line; progress and errors go to stderr, never to stdout. Protocol versions `2024-11-05`, `2025-03-26` and `2025-06-18` are supported.

## What agents get

| Tool | Arguments | Answer |
|---|---|---|
| `pv_overview` | — | A short digest: size, languages, entry points, what each package contains, external libraries. |
| `pv_search` | `query`, `kinds?` (package, module, class, function, method), `limit?` (1–50) | Matching elements with their node ids. |
| `pv_node` | `node_id`, or `name` (best match) | The element's source (up to 6000 characters), parent, children, callers and callees. |
| `pv_dependencies` | `node_id`, `direction?` (`in`, `out`, `both`), `depth?` (1–3) | What it uses and what uses it, step by step. |
| `pv_impact` | `node_id`, `change_kind?` | Everything that depends on it (up to 5 steps) and a risk level with its reasons. |
| `pv_path` | `from_id`, `to_id` | The shortest chain of imports, calls or inheritance between two elements. |

Wrong arguments or unknown elements come back as a tool error (`isError: true`) with a readable message, so the agent can correct itself.

## Claude Code

```bash
claude mcp add project-visualizer -- "<path-to>/pv-engine" mcp "<project-root>"
```

Then ask, for example, "use project-visualizer to check what depends on `UserService` before renaming it".

## Cursor / other clients

Add to the client's MCP configuration (for Cursor: `.cursor/mcp.json` in the project, or the global settings):

```json
{
  "mcpServers": {
    "project-visualizer": {
      "command": "<path-to>/pv-engine",
      "args": ["mcp", "<project-root>"]
    }
  }
}
```

On Windows use the full path to `pv-engine.exe` and forward slashes or escaped backslashes in JSON. The Project Visualizer desktop app shows these snippets with the paths filled in (Settings → AI agents).

## Privacy

Everything runs on your computer: the server reads the project folder locally and answers only the client that started it, over stdio — there is no network port. What the agent then sends to its own AI model is up to the agent; the tools return names, relationships and the source of the elements it asks about.
