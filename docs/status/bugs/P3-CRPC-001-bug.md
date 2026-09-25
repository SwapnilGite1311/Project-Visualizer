# P3-CRPC-001 — bug in the plan

**Plan says:** `attrs` uses `additionalProperties: {"type":["string","number","boolean"]}`.

**Actual:** `contracts/tools/validate.mjs` runs Ajv in strict mode, which rejects union types other than `[T, "null"]` ("use allowUnionTypes to allow union type keyword"). The schema uses the equivalent `additionalProperties: {"anyOf":[{"type":"string"},{"type":"number"},{"type":"boolean"}]}`.
