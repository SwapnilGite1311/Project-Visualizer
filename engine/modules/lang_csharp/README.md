# lang_csharp — C#

`CSharpAdapter` (id `csharp`, files `.cs`), grammar `tree-sitter-c-sharp` v0.23.1 (`engine/third_party/ts_csharp`).

Detected: classes, interfaces, structs, records and enums (all shown as classes), methods and constructors, `using` directives, calls (`Run()`, `helper.Greet()`, `new Helper()`), base classes and implemented interfaces (as inheritance), and complexity (`if`, `for`, `foreach`, `while`, `do`, `catch`, `?:`, `switch` sections). Both block namespaces (`namespace A { … }`) and file-scoped ones (`namespace A;`) work.

## Namespaces and folders

C# code refers to other code by namespace, not by file. Project Visualizer assumes the usual layout where namespaces follow folders, so every `.cs` file is known by its folder (`src/Util/Helper.cs` → `src/Util`), and `using Acme.Util;` links to the folder whose path ends with the most namespace parts:

| `using` | Folders in the project | Linked to |
|---|---|---|
| `Acme.Util` | `src/App`, `src/Util` | `src/Util` (1 part matches) |
| `Acme.App.Models` | `src/App`, `src/App/Models` | `src/App/Models` (2 parts) |
| `System.Collections.Generic` | — | external `System` |

When several folders match equally well, the shortest path wins (so `src/Util` beats `tests/Util`). A namespace with no matching folder becomes an external library named by its first part (`System`, `Microsoft`, `Newtonsoft`…).

## Limits

- Calls into other files are not resolved: `helper.Greet()` needs the type of `helper`, and namespaces do not say which file defines a class, so only calls within a file (and within a class) are linked.
- Partial classes appear once per file (a `partial class Order` split over two files shows two `Order` classes).
- LINQ lambdas and local functions are not separate elements; their calls count for the enclosing method.
- `using X = A.B;` aliases and `global using` are read as plain `using` directives; `using static` imports the class's namespace.
- Properties, fields and events are not shown (only types and methods).
