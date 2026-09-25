# More languages: C, C++, Rust and C#

Phase 3 adds four languages to the ones in the [Phase 2 languages page](../phase2/languages.md). As before, a project can mix languages, and each file is read by the language that matches its extension.

| Language | Files | What is detected | Known limits |
| --- | --- | --- | --- |
| C | `.c` | Functions, structs, `#include`, calls | Declarations in headers are not linked to definitions in other `.c` files; macros are not expanded |
| C++ | `.cpp` `.cc` `.cxx` `.h` `.hpp` `.hh` `.hxx` `.ipp` | Classes and structs, methods (also when written outside the class: `int Square::area()` appears as `Square.area`), functions, `#include`, calls, base classes | Includes of includes are not followed for calls; templates are read partially; `.h` files are read as C++ |
| Rust | `.rs` | Modules (`mod`, Cargo's `src/` layout), functions, structs and enums, traits, methods in `impl` blocks, `impl Trait for Type` (shown as inheritance), `use` imports, calls through a type path (`Store::new()`) | Macro bodies are not read; calls on values (`s.add()`) and `use` groups (`{A, B}`) are not followed; workspace crates appear as external |
| C# | `.cs` | Classes, interfaces, structs, records, enums, methods and constructors, `using` (namespaces matched to folders), base classes and interfaces | Calls into other files are not linked; partial classes appear once per file; properties and fields are not shown |

## How files find each other

- **C and C++**: `#include "util.h"` is found next to the including file first, then anywhere in the project where a path ends with it (like an include folder). Standard headers such as `<iostream>` or `<stdio.h>` appear as external libraries; other headers from outside the project are left out.
- **Rust**: files follow Cargo's layout — `src/main.rs` and `src/lib.rs` are the crate, `src/store.rs` is `crate::store`, `src/api/mod.rs` is `crate::api`. `use crate::store::Store` links to the `Store` struct; `use std::…` or `use serde::…` appear as external crates.
- **C#**: namespaces are matched to folders by their last parts: `using Acme.Util;` links to the folder `src/Util`. Namespaces with no matching folder (`System`, `Microsoft…`) appear as external libraries.

Runtime recording (live map, health) for these languages works through OpenTelemetry — see [Live runtime](live-runtime.md#any-language-with-opentelemetry). Stack traces from C# (and Go) can be pasted on the map as usual.
