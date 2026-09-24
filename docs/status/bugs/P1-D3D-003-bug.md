# P1-D3D-003 — bug in the plan

**Plan says:** "a normal import is fine because WebGL is only touched in `mount`".

**Actual:** `3d-force-graph` 1.80 reads `window` when the module is imported. Because `view/renderers.ts` discovers renderers with an eager `import.meta.glob`, a static import broke every test that loads the renderer list in the node environment (`view/renderers.test.ts`, `renderers/cy2d/index.test.ts`, `renderers/fg3d/index.test.ts`: `ReferenceError: window is not defined`).

**Fix:** `fg-renderer.ts` imports only the types statically and loads the library with `import('3d-force-graph')` inside `mount()`. `setGraph`/`updateStyles` calls made before the library has loaded are kept in `pending` and applied once it is ready. Side benefit: three.js is no longer in the startup bundle.
