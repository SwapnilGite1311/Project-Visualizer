# errmap module

Turns stack traces into places on the map, and keeps one list of errors per project — from runtime events and from traces the user pastes (`errors.map_stack`).

## Supported formats

`parse_any` tries the parsers in this order and uses the first that recognises the text.

**Python** — needs `Traceback (most recent call last):`; with chained exceptions the last traceback is used; the last frame is where the error was raised.

```text
Traceback (most recent call last):
  File "C:/code/app/main.py", line 9, in main
  File "C:/code/app/app/utils.py", line 9, in is_valid
ValueError: bad id
```

**JavaScript / Node.js** — the first line is `SomethingError: message`; `node:` internal frames are skipped; the first frame is the origin.

```text
TypeError: Cannot read properties of undefined (reading 'trim')
    at formatName (C:\app\src\utils\format.js:2:21)
    at main (C:\app\src\index.js:7:16)
```

**Java** — the first line is `pkg.SomeException: message` (an `Exception in thread "main"` prefix is fine); only frames before the first `Caused by:` are used; the first frame is the origin.

```text
Exception in thread "main" java.lang.IllegalStateException: boom
	at com.acme.util.Helper.greet(Helper.java:6)
	at com.acme.App.main(App.java:10)
```

**Go** — a `panic:` message and/or a `goroutine N [running]:` block; frames are a function line followed by an indented `file.go:line`; only the first goroutine is used.

```text
panic: runtime error: index out of range [3] with length 3

goroutine 1 [running]:
main.(*Store).Count(0xc000010000)
	/home/u/shop/internal/store/store.go:17 +0x1d
```

**C#** — the first line is `Namespace.SomeException: message`; only frames with ` in <file>:line <n>` are kept.

```text
System.InvalidOperationException: Sequence contains no elements
   at Shop.Services.OrderService.Latest() in C:\shop\Services\OrderService.cs:line 42
```

**Anything else** — every `path/file.ext:line` in the text becomes a frame (language `unknown`, type `Error`, message = the first line).

## Mapping rules

For each frame:

1. The path is made relative to the project (`locate::to_project_relative`); if that file is in the map, the frame's element is the innermost class, function or method at that line (or the module).
2. A bare file name (Java stacks give `Helper.java`) is matched against modules whose path ends with `/Helper.java`.
3. A dotted function (`com.acme.App.main`) is matched against a module whose qualified name is the function without its last part (`com.acme.App`).

Frames that match get `node_id` and `in_project: true`; library and system frames stay unmapped. `is_origin` marks the frame where the error was raised.

## Error list

- `errors.map_stack {project_id, text}` parses, maps and stores a pasted trace (`source: "pasted"`) and returns it with its frames.
- Runtime error events (status `error` or kind `error`) are added automatically (`source: "runtime"`): the same type, message and element only increase `count` and `last_seen_ms`. When the event carries `error.stack`, that stack is parsed and mapped for the frames; otherwise the event itself is the single frame.
- `errors.list {project_id}` returns the records, most recently seen first; `errors.clear {project_id, error_id?}` removes one record or all. Each project keeps at most 500 records (oldest dropped).
