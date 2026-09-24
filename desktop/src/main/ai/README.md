# AI (direct mode)

## Flow

1. The engine builds a context pack for the node (`context.for_node`): the node, its own source, and the names and ids of its neighbours.
2. The main process fills the `explain_node` template from `contracts/prompts/v1/` with the pack, the node's kind, name and file, and the project notes.
3. The configured provider (Anthropic or any OpenAI-compatible endpoint) answers in Markdown.
4. Every `[[node:<id>]]` citation is checked against the ids in the pack; invalid citations are removed, valid ones are returned as `cited_nodes` so the UI can make them clickable.

From Phase 4, a backend in `src/main/ai-backends/<id>/index.ts` can take over when the setting `ai.mode` equals its id (for example the cloud mode); otherwise direct mode is used.

## Settings keys

- `ai.provider` — `anthropic` (default) or `openai`.
- `ai.model.<id>` — model name (Anthropic default `claude-haiku-4-5-20251001`; OpenAI-compatible has no default).
- `ai.baseUrl.<id>` — API base URL (for Ollama use `http://localhost:11434/v1`).
- Secret `ai.apiKey.<id>` — the API key, encrypted with the operating system's secure storage.
- `project.notes.<root path>` — free-text notes about a project that are added to every prompt.

## Adding a provider

Create `src/main/ai-providers/<id>/index.ts` exporting `provider: AiProviderFactory` (id, label, whether it needs a key, defaults, and `create(config, fetchImpl)` returning an object with `complete(request)`). It is discovered automatically and appears in Settings.

## Privacy

- Only the context pack is sent: the selected node's source plus the names of related nodes — never the whole repository or other files' code.
- API keys stay in the main process; there is no channel that returns them to the renderer.
