# lang_python

## Extracted facts

For every `.py` / `.pyi` file the adapter produces a `FileExtraction` with:

- **Definitions** — classes, functions and methods (functions directly inside a class), with unique in-file qualnames (`User.display`, `helper~2`), spans, signatures and docstrings.
- **Imports** — `import a.b as c` and `from x import y as z` / `from x import *`, with line and enclosing scope.
- **Calls** — every call site with the called name, the object before the last `.` and the calling definition.
- **Inheritance** — base classes written as names or dotted names (keyword arguments like `metaclass=` are skipped).
- **Complexity** — 1 + decision points (`if`, `elif`, `for`, `while`, `except`, conditional expressions, boolean operators, comprehension clauses, `case`); nested definitions are counted separately.
- **Docstrings** — module, class and function docstrings (max 1000 characters).
- **Main guard** — `if __name__ == "__main__":` at module level marks an entry point.

## Module names

- `app/models.py` → `app.models`; `app/__init__.py` → `app`; `__init__.py` at the root has no name.
- `src/` and `lib/` layouts get two names, the short one first: `src/app/main.py` → `app.main`, `src.app.main`.
- Relative imports (`.models`, `..services`) are resolved from the importing file's package; going above the top-level package gives no result.

## Resolution

1. Relative module text is turned into an absolute module name first.
2. Plain imports: try the full dotted name, then drop the last segment until a project module matches.
3. From-imports: if `<module>.<name>` is a project module, link to it; else if the module is in the project, link to the symbol (or the module when the symbol is unknown).
4. Nothing found: relative imports and names whose first segment is a project top-level package stay unresolved; anything else is an external package (its top-level name).

## Known limits

- Dynamic imports (`importlib.import_module`, `__import__`) are not seen.
- `getattr` and other reflection is not followed.
- Calls on instance variables (for example `service.get_user()`) are not resolved to a class.
- Star-imports link the module but do not bind individual names.
