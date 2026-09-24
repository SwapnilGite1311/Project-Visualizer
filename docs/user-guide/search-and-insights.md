# Search and insights

Both live in the left panel; switch between them with the tabs at its top.

## Search

Press `Ctrl+F` (or click the **Search** tab) and type part of a name.

- Results show the name, its kind and its file. Exact names come first, then names that start with what you typed, then names that contain it.
- Name suggestions appear under the box; click one to search for it.
- Click **package**, **module**, **class**, **function** or **method** to only show those kinds (click again to remove the filter).
- Use `↑` / `↓` and `Enter`, or click a result: the map moves to the right level and selects the element.

## Hotspots

**Insights → Hotspots** lists the functions, methods and modules most likely to cause trouble. Each gets a score from 0 to 100 that combines:

- complexity (30%): how many branches and loops it has;
- callers (25%): how many places use it;
- dependencies (25%): how many things it uses;
- size (20%): lines of code.

Tags such as **High complexity**, **Many callers**, **Many dependencies** or **Large** say which of these put it in the top quarter of the project. Click a row to see it on the map, or **What breaks?** to see what depends on it.

## Entry points

**Insights → Entry points** shows where the program starts running: files with an `if __name__ == "__main__":` block, files with a usual start-up name (`main.py`, `app.py`, `manage.py`, `wsgi.py`, `asgi.py`, `run.py`, `cli.py`, `__main__.py`) and top-level functions named `main`. The reasons are shown under each entry. Click one to jump to it.

## Boundaries and instability

**Insights → Boundaries** looks at each package as a unit:

- **Inside links**: connections between elements of the same package.
- **Outgoing**: connections from the package to elsewhere; **Incoming**: connections from elsewhere into it.
- **Instability** = outgoing ÷ (incoming + outgoing), shown as a bar from 0 to 1:
  - near **0**: other code depends on this package and it depends on little. It is a foundation; change it carefully.
  - near **1**: it depends on others and nobody depends on it. It is a leaf (for example an API layer) and is usually safe to change.

The **Summary** cards at the top count files, lines of code, classes, functions and methods, external libraries and files with syntax errors (click that card to list them).
