# search module

## Scoring

Case-insensitive match of the typed text against each node (the project node is never returned):

| Rule | Score |
| --- | --- |
| name equals the text | 100 |
| name starts with the text | 80 |
| name contains the text | 60 |
| qualified name contains the text | 40 |
| the text's letters appear in order in the name (`usv` → `UserService`) | 20 |
| otherwise | no match |

## Ordering

Results with a score above 0 are sorted by score (highest first), then level (outer elements first), then name, then id, and cut to the limit.

## Methods

- `search.query {project_id, text, kinds?, limit?}` → `{results: [{node_id, name, kind, file_path, qualified_name, score}]}`; `limit` defaults to 50 (1–200); unknown kinds give error -32602.
- `search.suggest {project_id, prefix, limit?}` → `{suggestions: [name…]}`: unique names starting with the prefix, shortest first; `limit` defaults to 10 (1–50).
