# grounding — facts packages for the AI

Everything an AI model is allowed to know about the project is built here, deterministically, from the graph (the R11 grounding rule). The AI never reads the project directly: it gets one of these packages, must cite elements as `[[node:<id>]]`, and every citation is checked afterwards with `grounding.check_citations`.

## Packs

| Method | Params | Result |
|---|---|---|
| `grounding.digest` | `{project_id, max_chars?}` (default 6000, 500–60000) | `{text}` — the project digest |
| `grounding.for_error` | `{project_id, error_id}` | the error pack (below); unknown error → `NodeNotFound` "error not found" |
| `grounding.for_question` | `{project_id, question, max_chars?}` (question ≤ 2000 chars; default 24000, 2000–60000) | the question pack (below) |
| `grounding.check_citations` | `{project_id, node_ids}` | `{valid, invalid}` — which ids exist |

**Digest** — a compact overview, one fact per line, cut at whole lines:

```text
Project shop: 8 files, 412 lines, languages python
Entry points: function:main.py#main
top level (2 modules): main, helper
package app (4 modules): UserService, User, is_valid, normalize, ...   (largest packages first, at most 15 names each)
External libraries: requests, sys
```

**Error pack** (`kind: "error"`) — the error record (type, message, all frames), the **origin** element's context pack (its code up to 8000 characters, parent, children, callers, callees), up to **5 project frames** each with the code 10 lines before and after the line, the **runtime health** of the origin and frame elements (when a program is connected), `related_node_ids` (every element in the pack, sorted) and `approx_tokens`.

**Question pack** (`kind: "question"`) — the question, its search **terms**, the **digest** (at most 4000 characters), and the best **matches**: every term is searched in element names, scores are added up per element, and the top 8 elements come with a context pack (code up to 3000 characters each), until `max_chars` would be exceeded. Retrieval is plain name search, so it works offline and without embeddings; semantic search (Phase 4 AI service) can add matches later.

Terms: words of 3 letters or more, lower-case, minus common question words (`the and for with how what where does this that from into are was when which who why can use used`), plus the parts of `snake_case` and `camelCase` words (`getUserName` → `getusername`, `get`… `user`, `name`), at most 12.

## Size limits

| Piece | Limit |
|---|---|
| Digest | `max_chars` (whole lines) |
| Origin code (error pack) | 8000 characters |
| Frames (error pack) | 5, each 21 lines |
| Matches (question pack) | 8, each with code up to 3000 characters; all within `max_chars` |

`approx_tokens` is the package size divided by 4, a quick estimate of what it costs to send.

## Privacy

Only what is in a package leaves the engine, and only when the user asks the AI something: the digest (names only), and the code of the origin element, the lines around the error's frames, and the matched elements. Files that are not part of an answer are never included. The desktop app shows which elements were sent with each answer.
