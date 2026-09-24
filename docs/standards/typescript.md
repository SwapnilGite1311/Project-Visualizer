# TypeScript standard

## Compiler

- `strict: true`.
- No `any` — use `unknown` and narrow it.

## Naming

| Thing | Convention | Example |
|---|---|---|
| TypeScript types/components | PascalCase | `GraphNode`, `InspectorPanel` |
| TypeScript functions/variables | camelCase | `getLevelView` |
| TypeScript files | kebab-case `.ts`/`.tsx`; tests `<name>.test.ts(x)` next to the file | `level-view.ts` |
| Desktop IPC channels | `pv:<area>.<action>` camelCase action | `pv:ai.explainNode` |
| JSON fields | snake_case | `project_id`, `node_id` |

## Modules

- ES modules.
- Named exports, except the `register` default exports required by card R10.

## React

- Function components and hooks.
- One component per file.
- Props interfaces are named `<Component>Props`.

## Formatting

Prettier with the repository config; ESLint per package.

## Tests

Vitest; tests live next to the files they test.
