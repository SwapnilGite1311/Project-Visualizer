# ADR-0006: tree-sitter for parsing all languages

## Status

Accepted

## Date

2026-09-24

## Context

The product must support many languages with one approach.

## Decision

tree-sitter grammars + query files (`tags.scm` style captures) per language; language-specific resolvers only where needed; dynamic grammar plugins later.

## Consequences

- 100+ grammars available.
- Error-tolerant parsing.
- No type information: resolution is best-effort.

## Alternatives considered

- Language servers (LSP) — rejected as the base: slow and heavy; may be added later for precision.
- Writing our own parsers — rejected.
