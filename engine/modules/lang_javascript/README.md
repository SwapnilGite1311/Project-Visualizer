# lang_javascript

JavaScript, TypeScript and TSX, built on `lang_generic`: three adapters share one implementation (`JsFamilyAdapter`) and differ only in grammar and queries.

## Files

| Adapter | Extensions | Grammar |
| --- | --- | --- |
| `javascript` | `.js` `.jsx` `.mjs` `.cjs` | tree-sitter-javascript v0.23.1 |
| `typescript` | `.ts` `.mts` `.cts` | tree-sitter-typescript v0.23.2 (`typescript`) |
| `tsx` | `.tsx` | tree-sitter-typescript v0.23.2 (`tsx`) |

What becomes an element: function declarations, generator functions, `const f = () => …` and `const f = function …` (functions); classes, abstract classes and TypeScript interfaces (classes on the map); class methods and object-literal methods (methods when inside a class). A file's module name is its path without the extension; an `index.*` file also names its folder, so `import x from './utils'` finds `utils/index.js`.

## Imports

- **ES modules:** `import x from './a'` (default), `import * as api from './api'` (namespace), `import { a, b as c } from './m'` (named). A named import that matches a function or class in the target file links to that element; otherwise it links to the module.
- **CommonJS:** `const x = require('x')` and a bare `require('x')` statement.
- **Relative paths** (`./`, `../`) are resolved against the importing file; the extension may be written or left out.
- **Alias** `@/x` and `~/x`: tried as `src/x`, then `x` (the common Vite / Nuxt / create-app setup).
- **Packages:** anything else is an external package; `lodash/fp` → `lodash`, `@scope/pkg/sub` → `@scope/pkg`, `node:fs` stays as it is.

## Limits

- Dynamic `import()` and `require` with a computed argument are not followed.
- Re-exports (`export * from './x'`, `export { a } from './x'`) are not followed, so imports through a barrel file stop at the barrel module.
- tsconfig `paths` other than `@/` and `~/`, `baseUrl`, and package `exports` maps are not read.
- Calls on instances (`client.fetchUser()` where `client` is a variable) are matched by method name only, like Python.
- Class fields with arrow functions (`handle = () => {}`) are not listed as methods.
