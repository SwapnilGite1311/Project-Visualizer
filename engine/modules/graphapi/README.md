# graphapi module

Graph query methods for the desktop app. Every method needs `project_id` of a project in state `ready` (else error -32003). Unknown nodes give error -32002.

## graph.node

- **Params:** `{project_id, node_id}`
- **Result:** one Node.
- **Example:** `node_id = "class:app/models.py#User"` → `{"kind": "class", "qualified_name": "app.models.User", …}`.

## graph.children

- **Params:** `{project_id, node_id}`
- **Result:** `{nodes: Node[]}` in graph (insertion) order.
- **Example:** children of `package:app` in the fixture → 5 nodes (4 modules and `package:app/api`).

## graph.level_view

- **Params:** `{project_id, parent_id?}` (default `project:`)
- **Result:** `{parent: Node, nodes: Node[], edges: Edge[]}` with aggregated edges `agg|<kind>|<source>|<target>`.
- **Example:** the fixture root → 4 nodes and 4 edges such as `agg|calls|module:main.py|package:app` (weight 1).

## graph.edges

- **Params:** `{project_id, node_id, direction?: "in"|"out"|"both", kinds?: string[]}`
- **Result:** `{edges: Edge[]}` without duplicates, sorted by id.
- **Example:** `function:app/utils.py#is_valid` with `direction = "in"` → 3 edges; with `kinds = ["calls"]` → 2.

## graph.source

- **Params:** `{project_id, node_id}`
- **Result:** `{file_path, language, text, span}`; packages, externals and the project have no source (error -32005).
- **Example:** `function:app/utils.py#normalize` → `text = "def normalize(name):\n    return name.strip().lower()"`, `span.start_line = 4`.

## graph.ancestors

- **Params:** `{project_id, node_id}`
- **Result:** `{nodes: Node[]}` from the project root down to the node itself.
- **Example:** `method:app/models.py#User.display` → `project:`, `package:app`, `module:app/models.py`, `class:app/models.py#User`, the method.
