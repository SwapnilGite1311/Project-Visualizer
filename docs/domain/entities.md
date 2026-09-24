# Domain entities

## Engine

- **Project** — one opened codebase: root path, state, graph.
- **Node** — one element of the graph (see card R7).
- **Edge** — a directed relation between two nodes: imports, calls, inherits, references.
- **Span** — source location: 1-based lines, 0-based columns.
- **Metrics** — loc, complexity, fan_in, fan_out of a node.
- **Health** — unknown, ok, warning, stalled or error.
- **LevelView** — the children of one node plus aggregated edges between them.
- **ImpactResult** — nodes affected by a change, with distances and a risk level.
- **ContextPack** — facts about a node given to the LLM.
- **RuntimeEvent** — one execution event from an agent (card R12).
- **Trace** — the events sharing one trace id, ordered as a call tree.
- **HealthInfo** — the health of a node with the reason and the time it changed.
- **Sandbox** — a copy-on-write graph for what-if changes.
- **Snapshot diff** — nodes and edges added, removed and changed between two graphs.

## Desktop

- **Settings** — user preferences stored as JSON.
- **Secret** — an encrypted value (API key, token) stored with safeStorage.
- **RecentProject** — a project the user opened before (path and time).
- **Overlay** — node and edge styles published by a feature with a priority.
- **ViewGraph** — the render-agnostic nodes and edges that a renderer draws.

## Server

- **User** — a person with an account.
- **Organization** — a team that owns cloud projects.
- **OrgMember** — a user's membership and role in an organization.
- **CloudProject** — a shared project inside an organization.
- **Snapshot** — a stored graph export of a cloud project.
- **RuntimeSource** — a remote application that sends runtime events with a token.
- **AiRequest** — one AI call made through the AI gateway (for quotas and cost).
- **Subscription** — an organization's paid plan (Stripe).
- **Entitlement** — a feature or limit allowed by a plan.
- **AuditLog** — a record of who did what and when in an organization.
- **SsoConnection** — an organization's identity provider settings.
