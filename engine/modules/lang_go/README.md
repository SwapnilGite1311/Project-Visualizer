# lang_go

Go (`.go`, tree-sitter-go v0.23.4) on top of `lang_generic`: functions, methods, structs and interfaces (both shown as classes), imports and calls.

## Packages

In Go a directory is a package, so every file's module name is its directory (`internal/store/store.go` → `internal/store`). Files in the project root belong to the root package and have no module name of their own.

Imports name packages, not files:

- A path whose first segment has no dot is the **standard library** (`fmt`, `net/http` → external `fmt`, `net`).
- Otherwise the longest project package that the import path ends with is used, so `github.com/acme/shop/internal/store` links to `package:internal/store` without reading `go.mod`.
- Anything else is an external module: `github.com/owner/repo` (also `gitlab.com`, `bitbucket.org`), otherwise the host (`golang.org`).
- An import's local name is its alias, or the last path segment (`store` for `…/internal/store`).

## Methods

Go declares methods outside their type: `func (s *Store) Count() int`. After extraction the adapter reads each method's receiver type (with or without `*`) and, when that type is declared in the same file, renames the method to `Store.Count`, makes `Store` its parent and moves the method's calls with it. Methods whose type is declared in another file of the package stay top-level functions.

## Limits

- Calls into another package (`store.New()`) point to the package import only; the called function inside the package is not resolved.
- Calls between files of the same package are not resolved (Go needs no import for them).
- Struct embedding and interface satisfaction are not shown as inheritance.
- Methods whose receiver type is declared in another file are not attached to that type.
