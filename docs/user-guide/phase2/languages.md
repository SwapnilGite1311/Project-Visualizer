# Languages

A project can mix languages; each file is read by the language that matches its extension.

| Language | Files | What is detected | Known limits |
| --- | --- | --- | --- |
| Python | `.py`, `.pyi`, `.ipynb` | Packages and modules, classes, functions and methods, imports (absolute and relative), calls, inheritance, entry points (`if __name__ == "__main__"`) | Calls on variables are matched by method name only; dynamic imports and `getattr` are not followed |
| JavaScript | `.js` `.jsx` `.mjs` `.cjs` | Functions, arrow functions assigned to names, classes and methods, ES imports (default, named, namespace), CommonJS `require`, calls, `extends` | Dynamic `import()`, re-exports (`export … from`) and aliases other than `@/` and `~/` are not followed |
| TypeScript | `.ts` `.mts` `.cts` `.tsx` | Everything JavaScript has, plus interfaces, abstract classes, `implements` | tsconfig `paths` (other than `@/`, `~/`), `baseUrl` and package `exports` maps are not read |
| Java | `.java` | Classes, interfaces, enums, records, methods and constructors, imports (single, static and wildcard), calls, `new`, `extends` and `implements`; source roots such as `src/main/java` | Same-package classes used without an import are not linked; overloads get `~2`, `~3`; lambdas and anonymous classes are not separate elements |
| Go | `.go` | Packages (directories), functions, methods attached to their receiver type, structs and interfaces, imports, calls | Calls into other packages stop at the package; calls between files of one package and struct embedding are not shown |
