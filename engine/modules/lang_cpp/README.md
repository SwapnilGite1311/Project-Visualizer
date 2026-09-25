# lang_cpp — C and C++

Two adapters that share one implementation (`CFamilyAdapter`): `c` for `.c` files and `cpp` for `.cpp .cc .cxx .h .hpp .hh .hxx .ipp`. Grammars: `tree-sitter-c` and `tree-sitter-cpp` v0.23.4 (`engine/third_party/ts_c`, `ts_cpp`).

Detected: functions, classes and structs (with a body), methods written inside a class, `#include`, calls (`f()`, `obj.f()`, `ptr->f()`, `ns::f()`), base classes, and complexity (`if`, loops, `case`, `?:`, and `catch` in C++).

## Files

- Headers ending in `.h` are parsed as **C++** (C++ is a superset for what the map shows), so a C project's headers use the C++ grammar; `.c` files use the C grammar.
- A file is known by its path with the extension (`src/util.h`), because that is how `#include` names it.

## Includes

`#include "x.h"` is looked up in this order:

1. next to the including file (`src/shape.cpp` includes `"util.h"` → `src/util.h`; `"../inc/a.h"` works too);
2. any project file whose path ends with it (`"inc/a.h"` → `lib/inc/a.h`), like an `-I` include folder — the shortest match wins;
3. common standard headers (`<iostream>`, `<vector>`, `<stdio.h>`…) become external libraries (`iostream`, `stdio`);
4. anything else (other system or third-party headers not in the project) is left out.

An include makes the functions of the included file callable by name, so `twice(side)` in `shape.cpp` links to `twice` in `util.h`.

## Methods defined outside classes

`int Square::area() const { … }` is named `Square.area`. When the class `Square` is declared in the same file, it becomes a method of that class; when the class is in a header (the usual case), it stays a function named `Square.area` in the `.cpp` file. Calls inside it are recorded as coming from `Square.area`. Namespaces are dropped from the name (`ns::Store::save` → `Store.save`).

## Limits

- Declarations in headers are not linked to their definitions in other `.c`/`.cpp` files: a call to `add()` declared in `util.h` but defined in `util.c` links only when the definition is in an included file.
- Macros are not expanded, and code inside `#if`/`#ifdef` branches is read as written.
- Templates are read partially (a template function or class appears; calls through template parameters are not resolved).
- Transitive includes are not followed for calls: a file sees the functions of the files it includes directly.
- Overloads with the same name in one file are numbered (`f`, `f~2`).
